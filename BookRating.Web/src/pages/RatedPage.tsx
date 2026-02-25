import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRated, coverUrl } from "../api";
import StarRating from "../components/StarRating";
import { useProfile } from "../contexts/ProfileContext";
import type { BookDto } from "../types";

export default function RatedPage() {
  const { profile } = useProfile();
  const [books, setBooks] = useState<BookDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getRated(profile.id)
      .then(setBooks)
      .finally(() => setLoading(false));
  }, [profile]);

  if (!profile)
    return (
      <div className="page">
        <h1>Rated Books</h1>
        <p className="empty">Select a profile (👤) to see your rated books.</p>
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
      <h1>Rated Books</h1>
      {books.length === 0 ? (
        <p className="empty">
          No rated books yet. Open a book and give it stars!
        </p>
      ) : (
        <div className="rated-list">
          {books.map((b) => (
            <Link
              to={`/books/${b.workId}`}
              key={b.workId}
              className="rated-row"
            >
              <div className="rated-cover">
                {b.coverId ? (
                  <img
                    src={coverUrl(b.coverId, "M")}
                    alt={b.title}
                    loading="lazy"
                  />
                ) : (
                  <div className="no-cover">No Cover</div>
                )}
              </div>
              <div className="rated-meta">
                <h3>{b.title}</h3>
                {b.authors && <p className="authors">{b.authors}</p>}
                {b.firstPublishYear && (
                  <p className="year">{b.firstPublishYear}</p>
                )}
                <StarRating value={b.rating ?? 0} readOnly />
                {b.isFavorite && <span className="fav-badge">♥ Favorite</span>}
              </div>
              {b.review ? (
                <blockquote className="rated-review">
                  &ldquo;{b.review}&rdquo;
                </blockquote>
              ) : (
                <p className="rated-review-empty">No review written yet.</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
