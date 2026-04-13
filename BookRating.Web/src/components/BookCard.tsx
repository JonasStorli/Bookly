import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { coverUrl, searchFallbackCover } from "../api";
import StarRating from "./StarRating";
import type { BookDto } from "../types";

interface Props {
  workId: string;
  title: string;
  authors: string;
  coverId?: number;
  firstPublishYear?: number;
  userBook?: BookDto | null;
  showPublishYear?: boolean;
}

export default function BookCard({
  workId,
  title,
  authors,
  coverId,
  firstPublishYear,
  userBook,
  showPublishYear = true,
}: Props) {
  const [coverError, setCoverError] = useState(false);
  const [fallbackCover, setFallbackCover] = useState<string | null>(null);
  const [isLoadingFallback, setIsLoadingFallback] = useState(false);

  // Search for fallback cover when no coverId is provided
  useEffect(() => {
    if (!coverId && !isLoadingFallback && !fallbackCover) {
      setIsLoadingFallback(true);
      searchFallbackCover(title, authors).then((cover) => {
        if (cover) {
          setFallbackCover(cover);
        }
        setIsLoadingFallback(false);
      });
    }
  }, [coverId, title, authors, isLoadingFallback, fallbackCover]);

  const handleCoverError = async () => {
    if (coverError || isLoadingFallback) return;
    setCoverError(true);

    // Try fallback search if we haven't already
    if (!fallbackCover) {
      setIsLoadingFallback(true);
      const cover = await searchFallbackCover(title, authors);
      if (cover) {
        setFallbackCover(cover);
      }
      setIsLoadingFallback(false);
    }
  };

  const renderCover = () => {
    if (coverId && !coverError) {
      return (
        <img
          src={coverUrl(coverId, "M")}
          alt={title}
          loading="lazy"
          onError={handleCoverError}
        />
      );
    }

    if (fallbackCover) {
      return (
        <img
          src={fallbackCover}
          alt={title}
          loading="lazy"
          onError={() => setFallbackCover(null)}
        />
      );
    }

    if (isLoadingFallback) {
      return <div className="no-cover loading">Loading...</div>;
    }

    return <div className="no-cover">No Cover</div>;
  };

  return (
    <Link to={`/books/${workId}`} className="book-card">
      <div className="book-cover">
        {renderCover()}
      </div>
      <div className="book-info">
        <h3>{title}</h3>
        {authors && <p className="authors">{authors}</p>}
        {showPublishYear && firstPublishYear && (
          <p className="year">{firstPublishYear}</p>
        )}
        {userBook?.rating && <StarRating value={userBook.rating} readOnly />}
        {userBook?.isFavorite && <span className="fav-badge">♥ Favorite</span>}
      </div>
    </Link>
  );
}
