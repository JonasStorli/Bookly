import { useEffect, useState } from "react";
import { getFavorites } from "../api";
import BookCard from "../components/BookCard";
import { useProfile } from "../contexts/ProfileContext";
import { useSettings } from "../contexts/SettingsContext";
import type { BookDto } from "../types";

export default function FavoritesPage() {
  const { profile } = useProfile();
  const { showPublishYear } = useSettings();
  const [books, setBooks] = useState<BookDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getFavorites(profile.id)
      .then(setBooks)
      .finally(() => setLoading(false));
  }, [profile]);

  if (!profile)
    return (
      <div className="page">
        <h1>Favorites</h1>
        <p className="empty">Select a profile (👤) to see your favorites.</p>
      </div>
    );

  if (loading)
    return (
      <div className="page">
        <p>Loading…</p>
      </div>
    );

  return (
    <div className="page">
      <h1>Favorites</h1>
      {books.length === 0 ? (
        <p className="empty">
          No favorites yet. Search for a book and heart it!
        </p>
      ) : (
        <div className="book-grid">
          {books.map((b) => (
            <BookCard
              key={b.workId}
              workId={b.workId}
              title={b.title}
              authors={b.authors}
              coverId={b.coverId}
              firstPublishYear={b.firstPublishYear}
              userBook={b}
              showPublishYear={showPublishYear}
            />
          ))}
        </div>
      )}
    </div>
  );
}
