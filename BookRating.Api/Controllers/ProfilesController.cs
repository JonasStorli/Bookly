using BookRating.Api.Data;
using BookRating.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace BookRating.Api.Controllers;

[ApiController]
[Route("api/profiles")]
public class ProfilesController(AppDbContext db) : ControllerBase
{
    private static string HashPin(string pin) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(pin))).ToLower();

    private static ProfileDto ToDto(Profile p) =>
        new(p.Id, p.Name, p.AvatarEmoji, p.AvatarColor, p.PinHash is not null, p.CreatedAt);

    // GET /api/profiles
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var profiles = await db.Profiles.OrderBy(p => p.CreatedAt).ToListAsync();
        return Ok(profiles.Select(ToDto));
    }

    // GET /api/profiles/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetOne(int id)
    {
        var p = await db.Profiles.FindAsync(id);
        return p is null ? NotFound() : Ok(ToDto(p));
    }

    // POST /api/profiles  — body: { name, avatarEmoji, avatarColor, pin }
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ProfileRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest("Name is required");
        if (string.IsNullOrWhiteSpace(req.Pin) || req.Pin.Length < 4)
            return BadRequest("A 4-digit PIN is required");

        var profile = new Profile
        {
            Name = req.Name.Trim(),
            AvatarEmoji = req.AvatarEmoji ?? "📖",
            AvatarColor = req.AvatarColor ?? "#2563eb",
            PinHash = HashPin(req.Pin)
        };
        db.Profiles.Add(profile);
        await db.SaveChangesAsync();
        return Ok(ToDto(profile));
    }

    // PUT /api/profiles/{id}  — body: { name, avatarEmoji, avatarColor, pin? }
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] ProfileRequest req)
    {
        var profile = await db.Profiles.FindAsync(id);
        if (profile is null) return NotFound();

        if (!string.IsNullOrWhiteSpace(req.Name)) profile.Name = req.Name.Trim();
        if (req.AvatarEmoji is not null) profile.AvatarEmoji = req.AvatarEmoji;
        if (req.AvatarColor is not null) profile.AvatarColor = req.AvatarColor;
        if (!string.IsNullOrWhiteSpace(req.Pin))  profile.PinHash = HashPin(req.Pin);

        await db.SaveChangesAsync();
        return Ok(ToDto(profile));
    }

    // POST /api/profiles/{id}/verify-pin  — body: { pin }
    [HttpPost("{id}/verify-pin")]
    public async Task<IActionResult> VerifyPin(int id, [FromBody] PinVerifyRequest req)
    {
        var profile = await db.Profiles.FindAsync(id);
        if (profile is null) return NotFound();
        if (profile.PinHash is null) return Ok(new { ok = true });   // no PIN set

        var ok = profile.PinHash == HashPin(req.Pin ?? "");
        return ok ? Ok(new { ok = true }) : Unauthorized(new { ok = false });
    }

    // DELETE /api/profiles/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var profile = await db.Profiles.FindAsync(id);
        if (profile is null) return NotFound();
        db.Profiles.Remove(profile);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

public record ProfileRequest(string Name, string? AvatarEmoji, string? AvatarColor, string? Pin);
public record PinVerifyRequest(string? Pin);
public record ProfileDto(int Id, string Name, string AvatarEmoji, string AvatarColor, bool HasPin, DateTime CreatedAt);
