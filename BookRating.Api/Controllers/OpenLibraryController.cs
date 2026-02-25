using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;

namespace BookRating.Api.Controllers;

[ApiController]
[Route("api/openlibrary")]
public class OpenLibraryController(IHttpClientFactory httpFactory, IMemoryCache cache) : ControllerBase
{
    private static readonly string[] SearchFields =
        ["key", "title", "author_name", "cover_i", "first_publish_year", "edition_count"];

    // GET /api/openlibrary/search?q=dune&page=1&limit=20&sort=new
    [HttpGet("search")]
    public async Task<IActionResult> Search(
        [FromQuery] string q,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? sort = null)
    {
        if (string.IsNullOrWhiteSpace(q))
            return BadRequest("q is required");

        var fields = string.Join(",", SearchFields);
        var offset = (page - 1) * limit;
        var url = $"https://openlibrary.org/search.json?q={Uri.EscapeDataString(q)}&fields={fields}&limit={limit}&offset={offset}";
        if (!string.IsNullOrWhiteSpace(sort))
            url += $"&sort={Uri.EscapeDataString(sort)}";

        var client = httpFactory.CreateClient("OL");
        var response = await client.GetAsync(url);
        if (!response.IsSuccessStatusCode)
            return StatusCode((int)response.StatusCode, "Open Library error");

        var json = await response.Content.ReadAsStringAsync();
        return Content(json, "application/json");
    }

    // Fields we keep from trending works — same set as search, keeps payload small
    private static readonly HashSet<string> TrendingKeepFields =
        new(["key", "title", "author_name", "cover_i", "first_publish_year"], StringComparer.Ordinal);

    private const string TrendingCacheKey = "trending_works";
    private const int    TrendingBatchSize = 250;   // fetched once, sliced per request
    private static readonly TimeSpan TrendingCacheTtl = TimeSpan.FromHours(6);

    // GET /api/openlibrary/trending?limit=20&page=1
    [HttpGet("trending")]
    public async Task<IActionResult> GetTrending([FromQuery] int limit = 20, [FromQuery] int page = 1)
    {
        // ── 1. Get (or warm) the full batch ───────────────────────────────────
        if (!cache.TryGetValue(TrendingCacheKey, out List<Dictionary<string, object?>>? batch) || batch is null)
        {
            var client = httpFactory.CreateClient("OL");
            var url = $"https://openlibrary.org/trending/daily.json?limit={TrendingBatchSize}&offset=0";
            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, "Open Library error");

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            // Project each work down to only the fields the frontend uses
            batch = [];
            if (root.TryGetProperty("works", out var works) && works.ValueKind == JsonValueKind.Array)
            {
                foreach (var work in works.EnumerateArray())
                {
                    var slim = new Dictionary<string, object?>();
                    foreach (var prop in work.EnumerateObject())
                    {
                        if (!TrendingKeepFields.Contains(prop.Name)) continue;
                        slim[prop.Name] = prop.Value.ValueKind switch
                        {
                            JsonValueKind.String  => (object?)prop.Value.GetString(),
                            JsonValueKind.Number  => prop.Value.TryGetInt32(out var i) ? i : prop.Value.GetDouble(),
                            JsonValueKind.Array   => prop.Value.EnumerateArray()
                                                         .Where(e => e.ValueKind == JsonValueKind.String)
                                                         .Select(e => e.GetString())
                                                         .ToArray(),
                            JsonValueKind.True    => true,
                            JsonValueKind.False   => false,
                            _                     => null
                        };
                    }
                    batch.Add(slim);
                }
            }

            cache.Set(TrendingCacheKey, batch, TrendingCacheTtl);
        }

        // ── 2. Slice the batch for the requested page ─────────────────────────
        var offset = (page - 1) * limit;
        var slice  = batch.Skip(offset).Take(limit).ToArray();

        var result = new { numFound = batch.Count, docs = slice };
        return new JsonResult(result);
    }

    // GET /api/openlibrary/works/OL45804W
    [HttpGet("works/{workId}")]
    public async Task<IActionResult> GetWork(string workId)
    {
        var client = httpFactory.CreateClient("OL");
        var url = $"https://openlibrary.org/works/{workId}.json";
        var response = await client.GetAsync(url);
        if (!response.IsSuccessStatusCode)
            return StatusCode((int)response.StatusCode, "Open Library error");

        var json = await response.Content.ReadAsStringAsync();
        return Content(json, "application/json");
    }
}
