using BookRating.Api.Data;
using BookRating.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookRating.Api.Controllers;

[ApiController]
[Route("api/library")]
public class LibraryController(AppDbContext db) : ControllerBase
{
    // PUT /api/library/books/{workId}?profileId=1
    [HttpPut("books/{workId}")]
    public async Task<IActionResult> Upsert(string workId, [FromQuery] int profileId, [FromBody] UpsertRequest req)
    {
        var profile = await db.Profiles.FindAsync(profileId);
        if (profile is null) return BadRequest("Profile not found");

        var book = await db.Books
            .FirstOrDefaultAsync(b => b.OpenLibraryWorkId == workId);

        if (book is null)
        {
            book = new Book
            {
                OpenLibraryWorkId = workId,
                Title = req.Title,
                Authors = req.Authors ?? string.Empty,
                CoverId = req.CoverId,
                FirstPublishYear = req.FirstPublishYear
            };
            db.Books.Add(book);
            await db.SaveChangesAsync();
        }
        else
        {
            book.Title = req.Title;
            book.Authors = req.Authors ?? string.Empty;
            book.CoverId = req.CoverId;
            book.FirstPublishYear = req.FirstPublishYear;
        }

        var userBook = await db.UserBooks
            .FirstOrDefaultAsync(ub => ub.BookId == book.Id && ub.ProfileId == profileId);

        if (userBook is null)
        {
            userBook = new UserBook { BookId = book.Id, ProfileId = profileId };
            db.UserBooks.Add(userBook);
        }

        userBook.IsFavorite = req.IsFavorite;
        userBook.Rating = req.Rating;
        userBook.Review = req.Review;
        userBook.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(ToDto(book, userBook));
    }

    // GET /api/library/books/{workId}?profileId=1
    [HttpGet("books/{workId}")]
    public async Task<IActionResult> GetBook(string workId, [FromQuery] int profileId)
    {
        var book = await db.Books
            .FirstOrDefaultAsync(b => b.OpenLibraryWorkId == workId);
        if (book is null) return NotFound();

        var userBook = await db.UserBooks
            .FirstOrDefaultAsync(ub => ub.BookId == book.Id && ub.ProfileId == profileId);

        return Ok(ToDto(book, userBook));
    }

    // GET /api/library/favorites?profileId=1
    [HttpGet("favorites")]
    public async Task<IActionResult> GetFavorites([FromQuery] int profileId)
    {
        var rows = await db.UserBooks
            .Include(ub => ub.Book)
            .Where(ub => ub.ProfileId == profileId && ub.IsFavorite)
            .OrderBy(ub => ub.Book.Title)
            .ToListAsync();

        return Ok(rows.Select(ub => ToDto(ub.Book, ub)));
    }

    // GET /api/library/rated?profileId=1
    [HttpGet("rated")]
    public async Task<IActionResult> GetRated([FromQuery] int profileId)
    {
        var rows = await db.UserBooks
            .Include(ub => ub.Book)
            .Where(ub => ub.ProfileId == profileId && ub.Rating != null)
            .OrderByDescending(ub => ub.Rating)
            .ThenBy(ub => ub.Book.Title)
            .ToListAsync();

        return Ok(rows.Select(ub => ToDto(ub.Book, ub)));
    }

    private static BookDto ToDto(Book b, UserBook? ub) => new(
        b.OpenLibraryWorkId,
        b.Title,
        b.Authors,
        b.CoverId,
        b.FirstPublishYear,
        ub?.IsFavorite ?? false,
        ub?.Rating,
        ub?.Review,
        ub?.UpdatedAt
    );
}

public record UpsertRequest(
    string Title,
    string? Authors,
    long? CoverId,
    int? FirstPublishYear,
    bool IsFavorite,
    int? Rating,
    string? Review
);

public record BookDto(
    string WorkId,
    string Title,
    string Authors,
    long? CoverId,
    int? FirstPublishYear,
    bool IsFavorite,
    int? Rating,
    string? Review,
    DateTime? UpdatedAt
);
