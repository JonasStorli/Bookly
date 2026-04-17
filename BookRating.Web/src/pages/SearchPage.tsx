import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { searchBooks, fetchTrending, workId } from "../api";
import type { SearchDoc } from "../types";
import BookCard from "../components/BookCard";
import { useSettings } from "../contexts/SettingsContext";

const GENRES = [
  { label: "Fiction", query: "subject:fiction" },
  { label: "Romance", query: "subject:romance" },
  { label: "Mystery", query: "subject:mystery" },
  { label: "Thriller", query: "subject:thriller" },
  { label: "Horror", query: "subject:horror" },
  { label: "Fantasy", query: "subject:fantasy" },
  { label: "Sci-Fi", query: "subject:science_fiction" },
  { label: "History", query: "subject:history" },
  { label: "Biography", query: "subject:biography" },
  { label: "Adventure", query: "subject:adventure" },
  { label: "Children's", query: "subject:juvenile_fiction" },
  { label: "Self-Help", query: "subject:self-help" },
];

export default function SearchPage() {
  const { booksPerLoad, sortOrder, languages, showPublishYear } = useSettings();

  const [query, setQuery] = useState("");
  const [activeGenres, setActiveGenres] = useState<string[]>([]);
  const [docs, setDocs] = useState<SearchDoc[]>([]);
  const [totalFound, setTotalFound] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [error, setError] = useState("");

  const isLoadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // ── Load-generation counter ────────────────────────────────────────────────
  // Incremented by every explicit user action (genre click, submit, clear,
  // settings change). Each load captures its generation; results are discarded
  // if the generation has moved on, so stale trending/search results can never
  // overwrite fresher data.
  const loadGenRef = useRef(0);

  // ── Refs mirroring state (for observer & async callbacks) ─────────────────
  const queryRef = useRef(query);
  const pageRef = useRef(page);
  const isSearchRef = useRef(isSearchMode);
  const hasMoreRef = useRef(hasMore);
  const limitRef = useRef(booksPerLoad);
  const sortRef = useRef(sortOrder);
  const languagesRef = useRef(languages);

  // Genre query stored here — never written into the visible input
  const activeGenreQueryRef = useRef("");

  useEffect(() => {
    queryRef.current = query;
  }, [query]);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  useEffect(() => {
    isSearchRef.current = isSearchMode;
  }, [isSearchMode]);
  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);
  useEffect(() => {
    limitRef.current = booksPerLoad;
  }, [booksPerLoad]);
  useEffect(() => {
    sortRef.current = sortOrder;
  }, [sortOrder]);
  useEffect(() => {
    languagesRef.current = languages;
  }, [languages]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const appendDocs = (prev: SearchDoc[], next: SearchDoc[]) => {
    const seen = new Set(prev.map((d) => d.key));
    return [...prev, ...next.filter((d) => !seen.has(d.key))];
  };

  // Force IntersectionObserver to re-evaluate after each load completes.
  // Without this, if the sentinel is already in view when the load finishes
  // (not enough books to push it off-screen), the observer never fires again.
  const recheckSentinel = () => {
    requestAnimationFrame(() => {
      if (sentinelRef.current && observerRef.current) {
        observerRef.current.unobserve(sentinelRef.current);
        observerRef.current.observe(sentinelRef.current);
      }
    });
  };

  // ── load trending ──────────────────────────────────────────────────────────
  const loadTrending = async (nextPage: number, append: boolean) => {
    const gen = loadGenRef.current;
    if (isLoadingRef.current && !append) return; // let explicit loads pre-empt
    if (append && isLoadingRef.current) return;
    isLoadingRef.current = true;
    if (nextPage === 1) setInitialLoading(true);
    else setLoadingMore(true);
    try {
      const data = await fetchTrending(limitRef.current, nextPage);
      if (loadGenRef.current !== gen) return; // stale — a newer load started
      setDocs((prev) => (append ? appendDocs(prev, data.docs) : data.docs));
      setTotalFound(data.numFound);
      const more = data.docs.length === limitRef.current;
      setHasMore(more);
      hasMoreRef.current = more;
      setPage(nextPage);
      pageRef.current = nextPage;
    } catch {
      if (loadGenRef.current === gen) setError("Could not load popular books.");
    } finally {
      if (loadGenRef.current === gen) {
        setInitialLoading(false);
        setLoadingMore(false);
        isLoadingRef.current = false;
        recheckSentinel();
      }
    }
  };

  // ── load search ────────────────────────────────────────────────────────────
  const loadSearch = async (
    q: string,
    nextPage: number,
    append: boolean,
    authorKey?: string,
  ) => {
    if (!q.trim() && !authorKey?.trim()) return;
    const gen = loadGenRef.current;
    if (isLoadingRef.current && !append) return;
    if (append && isLoadingRef.current) return;
    isLoadingRef.current = true;
    if (nextPage === 1) setInitialLoading(true);
    else setLoadingMore(true);
    setError("");
    try {
      const data = await searchBooks(
        q,
        nextPage,
        limitRef.current,
        sortRef.current,
        languagesRef.current,
        authorKey,
      );
      if (loadGenRef.current !== gen) return; // stale
      setDocs((prev) => (append ? appendDocs(prev, data.docs) : data.docs));
      setTotalFound(data.numFound);
      const more = nextPage * limitRef.current < data.numFound;
      setHasMore(more);
      hasMoreRef.current = more;
      setPage(nextPage);
      pageRef.current = nextPage;
    } catch {
      if (loadGenRef.current === gen)
        setError("Search failed. Is the API running?");
    } finally {
      if (loadGenRef.current === gen) {
        setInitialLoading(false);
        setLoadingMore(false);
        isLoadingRef.current = false;
        recheckSentinel();
      }
    }
  };

  // ── Explicit-load helpers — bump generation before starting ───────────────
  // Bumping loadGenRef causes any in-progress load to discard its results when
  // it eventually resolves, so the new load always wins.
  const startTrending = (nextPage: number, append: boolean) => {
    if (!append) {
      loadGenRef.current++;
      isLoadingRef.current = false; // allow the new load past the guard
    }
    loadTrending(nextPage, append);
  };

  const startSearch = (
    q: string,
    nextPage: number,
    append: boolean,
    authorKey?: string,
  ) => {
    if (!append) {
      loadGenRef.current++;
      isLoadingRef.current = false;
    }
    loadSearch(q, nextPage, append, authorKey);
  };

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    startTrending(1, false);
  }, []); // eslint-disable-line

  // ── Re-load when booksPerLoad changes ─────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParam = searchParams.get("q") ?? "";
  const authorParam = searchParams.get("author") ?? "";

  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const q = activeGenreQueryRef.current || queryRef.current;
    loadGenRef.current++;
    isLoadingRef.current = false;
    if (isSearchRef.current) loadSearch(q, 1, false, authorParam);
    else loadTrending(1, false);
  }, [booksPerLoad, authorParam]); // eslint-disable-line

  // ── Re-load when sort or language changes (always, in any mode) ────────────
  const mountedRef2 = useRef(false);
  useEffect(() => {
    if (!mountedRef2.current) {
      mountedRef2.current = true;
      return;
    }
    const q = activeGenreQueryRef.current || queryRef.current;
    loadGenRef.current++;
    isLoadingRef.current = false;
    if (isSearchRef.current) loadSearch(q, 1, false);
    else loadTrending(1, false); // trending ignores sort/lang, but resets view
  }, [sortOrder, languages]); // eslint-disable-line

  // ── IntersectionObserver — infinite scroll ─────────────────────────────────
  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreRef.current &&
          !isLoadingRef.current
        ) {
          const nextPage = pageRef.current + 1;
          const q = activeGenreQueryRef.current || queryRef.current;
          if (isSearchRef.current) loadSearch(q, nextPage, true);
          else loadTrending(nextPage, true);
        }
      },
      { rootMargin: "200px" },
    );
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, []); // eslint-disable-line — intentionally once, reads refs

  useEffect(() => {
    const q = searchParam.trim();
    activeGenreQueryRef.current = "";
    setActiveGenres([]);
    setQuery(q);

    if (authorParam.trim()) {
      setIsSearchMode(true);
      isSearchRef.current = true;
      startSearch(q, 1, false, authorParam.trim());
      return;
    }

    if (q) {
      setIsSearchMode(true);
      isSearchRef.current = true;
      startSearch(q, 1, false);
    } else {
      setIsSearchMode(false);
      isSearchRef.current = false;
      startTrending(1, false);
    }
  }, [searchParam, authorParam]);

  // ── Search submit ──────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearchParams({ q });
  };

  // ── Genre toggle — plain function, NOT a functional state-updater ──────────
  // Calling loadSearch/loadTrending inside setActiveGenres((prev) => …) was the
  // root bug: React runs state updaters twice in Strict Mode, so the load was
  // either doubled or (more commonly) blocked by isLoadingRef on the second run.
  const handleGenre = (genre: { label: string; query: string }) => {
    const next = activeGenres.includes(genre.label)
      ? activeGenres.filter((g) => g !== genre.label)
      : [...activeGenres, genre.label];

    setActiveGenres(next);

    if (next.length === 0) {
      activeGenreQueryRef.current = "";
      setIsSearchMode(false);
      isSearchRef.current = false;
      startTrending(1, false);
    } else {
      const combined = next
        .map((label) => GENRES.find((g) => g.label === label)!.query)
        .join(" OR ");
      activeGenreQueryRef.current = combined;
      setIsSearchMode(true);
      isSearchRef.current = true;
      startSearch(combined, 1, false);
    }
  };

  // ── Clear ──────────────────────────────────────────────────────────────────
  const handleClear = () => {
    setSearchParams({});
    setQuery("");
    setActiveGenres([]);
    activeGenreQueryRef.current = "";
    setIsSearchMode(false);
    isSearchRef.current = false;
    setError("");
  };

  // ── Heading ────────────────────────────────────────────────────────────────
  const heading = isSearchMode
    ? activeGenres.length > 0
      ? activeGenres.join(", ")
      : `Results for "${query}" — ${totalFound?.toLocaleString()} found`
    : initialLoading
      ? "Loading popular books…"
      : "Popular Right Now";

  return (
    <div className="page">
      <form onSubmit={handleSubmit} className="search-form">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Open Library…"
          autoFocus
        />
        <button type="submit" disabled={initialLoading}>
          {initialLoading && isSearchMode ? "Searching…" : "Search"}
        </button>
        {isSearchMode && (
          <button
            type="button"
            className="clear-search-btn"
            onClick={handleClear}
          >
            ✕ Clear
          </button>
        )}
      </form>

      <div className="genre-bar">
        {GENRES.map((g) => (
          <button
            key={g.label}
            type="button"
            className={`genre-pill ${activeGenres.includes(g.label) ? "active" : ""}`}
            onClick={() => handleGenre(g)}
          >
            {g.label}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="section-header">
        <h2>{heading}</h2>
      </div>

      {initialLoading ? (
        <div className="book-grid">
          {Array.from({ length: booksPerLoad }).map((_, i) => (
            <div key={i} className="book-card skeleton-card">
              <div className="skeleton skeleton-cover" />
              <div className="book-info">
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line short" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="book-grid">
          {docs.map((doc) => (
            <BookCard
              key={doc.key}
              workId={workId(doc.key)}
              title={doc.title}
              authors={doc.author_name?.join(", ") ?? ""}
              coverId={doc.cover_i}
              firstPublishYear={doc.first_publish_year}
              showPublishYear={showPublishYear}
            />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="scroll-sentinel" />
      {loadingMore && (
        <div className="load-more-spinner">
          <span className="spinner" /> Loading more…
        </div>
      )}
    </div>
  );
}
