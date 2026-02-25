namespace BookRating.Api.Models;

public class UserBook
{
    public int Id { get; set; }

    public int BookId { get; set; }
    public Book Book { get; set; } = null!;

    public int ProfileId { get; set; }
    public Profile Profile { get; set; } = null!;

    public bool IsFavorite { get; set; }
    public int? Rating { get; set; }      // 1–5, null = not rated
    public string? Review { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
