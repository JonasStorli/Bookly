namespace BookRating.Api.Models;

public class Profile
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string AvatarEmoji { get; set; } = "📖";
    public string AvatarColor { get; set; } = "#2563eb";
    public string? PinHash { get; set; }          // SHA-256 hex, null = no PIN
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<UserBook> UserBooks { get; set; } = [];
}
