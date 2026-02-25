import type { BookDto, ProfileDto, SearchResult, UpsertRequest } from "./types";

const BASE = "";

export function coverUrl(coverId: number, size: "S" | "M" | "L" = "M") {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

export function workId(key: string) {
  return key.replace("/works/", "");
}

// ── Open Library proxy ──────────────────────────────────────────────────────

export async function searchBooks(
  q: string,
  page = 1,
  limit = 20,
  sort?: string,
  languages: string[] = [],
): Promise<SearchResult> {
  // Append language filter: single → language:eng, multiple → (language:eng OR language:nor)
  let effectiveQ = q;
  if (languages.length === 1) {
    effectiveQ = `${q} language:${languages[0]}`;
  } else if (languages.length > 1) {
    const langClause = languages.map((l) => `language:${l}`).join(" OR ");
    effectiveQ = `${q} (${langClause})`;
  }

  let url = `${BASE}/api/openlibrary/search?q=${encodeURIComponent(effectiveQ)}&page=${page}&limit=${limit}`;
  if (sort && sort !== "relevance") {
    url += `&sort=${encodeURIComponent(sort)}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

export async function fetchTrending(
  limit = 20,
  page = 1,
): Promise<SearchResult> {
  const res = await fetch(
    `${BASE}/api/openlibrary/trending?limit=${limit}&page=${page}`,
  );
  if (!res.ok) throw new Error("Trending fetch failed");
  return res.json();
}

export async function fetchWork(wId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/api/openlibrary/works/${wId}`);
  if (!res.ok) throw new Error("Work fetch failed");
  return res.json();
}

// ── Profiles ────────────────────────────────────────────────────────────────

export async function getProfiles(): Promise<ProfileDto[]> {
  const res = await fetch(`${BASE}/api/profiles`);
  if (!res.ok) throw new Error("Profiles fetch failed");
  return res.json();
}

export async function createProfile(
  name: string,
  avatarEmoji: string,
  avatarColor: string,
  pin: string,
): Promise<ProfileDto> {
  const res = await fetch(`${BASE}/api/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, avatarEmoji, avatarColor, pin }),
  });
  if (!res.ok) throw new Error("Create profile failed");
  return res.json();
}

export async function updateProfile(
  id: number,
  name: string,
  avatarEmoji: string,
  avatarColor: string,
  pin?: string,
): Promise<ProfileDto> {
  const res = await fetch(`${BASE}/api/profiles/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      avatarEmoji,
      avatarColor,
      ...(pin ? { pin } : {}),
    }),
  });
  if (!res.ok) throw new Error("Update profile failed");
  return res.json();
}

export async function verifyPin(id: number, pin: string): Promise<boolean> {
  const res = await fetch(`${BASE}/api/profiles/${id}/verify-pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  return res.ok;
}

export async function deleteProfile(id: number): Promise<void> {
  await fetch(`${BASE}/api/profiles/${id}`, { method: "DELETE" });
}

// ── Library (SQLite, profile-scoped) ────────────────────────────────────────

export async function getBook(
  wId: string,
  profileId: number,
): Promise<BookDto | null> {
  const res = await fetch(
    `${BASE}/api/library/books/${wId}?profileId=${profileId}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Get book failed");
  return res.json();
}

export async function upsertBook(
  wId: string,
  profileId: number,
  req: UpsertRequest,
): Promise<BookDto> {
  const res = await fetch(
    `${BASE}/api/library/books/${wId}?profileId=${profileId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    },
  );
  if (!res.ok) throw new Error("Upsert failed");
  return res.json();
}

export async function getFavorites(profileId: number): Promise<BookDto[]> {
  const res = await fetch(
    `${BASE}/api/library/favorites?profileId=${profileId}`,
  );
  if (!res.ok) throw new Error("Favorites fetch failed");
  return res.json();
}

export async function getRated(profileId: number): Promise<BookDto[]> {
  const res = await fetch(`${BASE}/api/library/rated?profileId=${profileId}`);
  if (!res.ok) throw new Error("Rated fetch failed");
  return res.json();
}
