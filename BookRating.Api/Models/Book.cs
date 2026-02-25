namespace BookRating.Api.Models;

public class Book
{
    public int Id { get; set; }
    public string OpenLibraryWorkId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Authors { get; set; } = string.Empty;
    public long? CoverId { get; set; }
    public int? FirstPublishYear { get; set; }

    public ICollection<UserBook> UserBooks { get; set; } = [];
}
