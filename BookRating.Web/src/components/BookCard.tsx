import { Link } from "react-router-dom";
import { coverUrl } from "../api";
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
  return (
    <Link to={`/books/${workId}`} className="book-card">
      <div className="book-cover">
        {coverId ? (
          <img src={coverUrl(coverId, "M")} alt={title} loading="lazy" />
        ) : (
          <div className="no-cover">No Cover</div>
        )}
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
