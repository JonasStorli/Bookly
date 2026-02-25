using BookRating.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BookRating.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Book> Books => Set<Book>();
    public DbSet<UserBook> UserBooks => Set<UserBook>();
    public DbSet<Profile> Profiles => Set<Profile>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Book>()
            .HasIndex(b => b.OpenLibraryWorkId)
            .IsUnique();

        // UserBook is unique per (Book, Profile) pair
        modelBuilder.Entity<UserBook>()
            .HasIndex(ub => new { ub.BookId, ub.ProfileId })
            .IsUnique();

        modelBuilder.Entity<UserBook>()
            .HasOne(ub => ub.Book)
            .WithMany(b => b.UserBooks)
            .HasForeignKey(ub => ub.BookId);

        modelBuilder.Entity<UserBook>()
            .HasOne(ub => ub.Profile)
            .WithMany(p => p.UserBooks)
            .HasForeignKey(ub => ub.ProfileId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
