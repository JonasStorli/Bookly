import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchWork, getBook, upsertBook, coverUrl } from "../api";
import StarRating from "../components/StarRating";
import { useProfile } from "../contexts/ProfileContext";
import type { BookDto } from "../types";

export default function BookDetailPage() {
  const { workId } = useParams<{ workId: string }>();
  const { profile, setProfile: openProfile } = useProfile();
  const [work, setWork] = useState<Record<string, unknown> | null>(null);
  const [userBook, setUserBook] = useState<BookDto | null>(null);
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false);

  const title = (work?.title as string) ?? "";
  const authorsArr = (work?.authors as { author: { key: string } }[]) ?? [];
  const description =
    typeof work?.description === "string"
      ? work.description
      : ((work?.description as { value?: string })?.value ?? "");
  const covers = (work?.covers as number[]) ?? [];
  const coverId = covers[0];

  useEffect(() => {
    if (!workId) return;
    const fetchData = async () => {
      const wk = await fetchWork(workId);
      setWork(wk);
      if (profile) {
        const ub = await getBook(workId, profile.id);
        setUserBook(ub);
        setReview(ub?.review ?? "");
      }
      setLoading(false);
    };
    fetchData().catch(() => setLoading(false));
  }, [workId, profile]);

  const save = async (patch: Partial<BookDto>) => {
    if (!workId) return;
    if (!profile) {
      setNeedsProfile(true);
      return;
    }
    setSaving(true);
    try {
      const updated = await upsertBook(workId, profile.id, {
        title,
        authors: userBook?.authors ?? "",
        coverId: userBook?.coverId ?? coverId,
        firstPublishYear: userBook?.firstPublishYear,
        isFavorite: userBook?.isFavorite ?? false,
        rating: userBook?.rating,
        review: userBook?.review ?? "",
        ...patch,
      });
      setUserBook(updated);
      setReview(updated.review ?? "");
      setNeedsProfile(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleFavorite = () =>
    save({ isFavorite: !(userBook?.isFavorite ?? false) });
  const setRating = (r: number) =>
    save({ rating: r === userBook?.rating ? undefined : r });
  const submitReview = (e: React.FormEvent) => {
    e.preventDefault();
    save({ review });
  };

  if (loading)
    return (
      <div className="page">
        <p>Loading…</p>
      </div>
    );
  if (!work)
    return (
      <div className="page">
        <p>Book not found.</p>
      </div>
    );

  return (
    <div className="page detail-page">
      <div className="detail-cover">
        {coverId ? (
          <img src={coverUrl(coverId, "L")} alt={title} />
        ) : (
          <div className="no-cover large">No Cover</div>
        )}
      </div>

      <div className="detail-info">
        <h1>{title}</h1>

        {authorsArr.length > 0 && (
          <p className="authors">
            by{" "}
            {authorsArr
              .map((a) => a.author?.key?.replace("/authors/", ""))
              .join(", ")}
          </p>
        )}

        {description && <p className="description">{description}</p>}

        {needsProfile && (
          <div className="needs-profile-banner">
            <span>Select a profile to save favorites and ratings.</span>
            <button
              className="btn-primary"
              onClick={() => {
                setNeedsProfile(false);
                openProfile(null); /* triggers profile modal via header */
              }}
            >
              Choose Profile
            </button>
          </div>
        )}

        <div className="actions">
          <button
            className={`fav-btn ${userBook?.isFavorite ? "active" : ""}`}
            onClick={toggleFavorite}
            disabled={saving}
          >
            {userBook?.isFavorite ? "♥ Favorited" : "♡ Add to Favorites"}
          </button>
        </div>

        <div className="rating-section">
          <h3>Your Rating</h3>
          <StarRating value={userBook?.rating ?? 0} onChange={setRating} />
          {userBook?.rating && (
            <button
              className="clear-btn"
              onClick={() => save({ rating: undefined })}
            >
              Clear
            </button>
          )}
        </div>

        <form onSubmit={submitReview} className="review-form">
          <h3>Your Review</h3>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder={
              profile
                ? "Write your review…"
                : "Select a profile to write a review"
            }
            rows={4}
            disabled={!profile}
          />
          <button type="submit" disabled={saving || !profile}>
            {saving ? "Saving…" : "Save Review"}
          </button>
        </form>
      </div>
    </div>
  );
}
