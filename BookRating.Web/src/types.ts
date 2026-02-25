export interface SearchDoc {
  key: string; // "/works/OL45804W"
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  edition_count?: number;
}

export interface SearchResult {
  numFound: number;
  docs: SearchDoc[];
}

export interface BookDto {
  workId: string;
  title: string;
  authors: string;
  coverId?: number;
  firstPublishYear?: number;
  isFavorite: boolean;
  rating?: number;
  review?: string;
  updatedAt?: string;
}

export interface ProfileDto {
  id: number;
  name: string;
  avatarEmoji: string;
  avatarColor: string;
  hasPin: boolean;
  createdAt: string;
}

export interface UpsertRequest {
  title: string;
  authors?: string;
  coverId?: number;
  firstPublishYear?: number;
  isFavorite: boolean;
  rating?: number;
  review?: string;
}
