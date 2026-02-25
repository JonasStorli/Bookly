using BookRating.Api.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// SQLite
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlite("Data Source=bookrating.db"));

// HttpClient for Open Library
builder.Services.AddHttpClient("OL", client =>
{
    client.DefaultRequestHeaders.Add("User-Agent", "BookRatingApp/1.0");
    client.Timeout = TimeSpan.FromSeconds(15);
});

builder.Services.AddControllers();
builder.Services.AddMemoryCache();

// CORS for React dev server
builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(p =>
        p.WithOrigins("http://localhost:5173")
         .AllowAnyHeader()
         .AllowAnyMethod()));

var app = builder.Build();

// Auto-create DB on startup — fixes SQLite "table does not exist" error
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

app.UseCors();
app.MapControllers();
app.Run();
