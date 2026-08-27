/**
 * Midnight Editorial design reminder: manga data is presented as an active print archive, never a generic storefront.
 * The public AniList request mirrors the established anime collection pattern while retaining manga-specific metadata.
 */
export type MangaFormat = "MANGA" | "NOVEL" | "ONE_SHOT" | "LIGHT_NOVEL";
export type MangaStatus = "RELEASING" | "FINISHED" | "NOT_YET_RELEASED" | "CANCELLED" | "HIATUS";
export type MangaFilters = { search?: string; genre?: string; year?: number; status?: MangaStatus; format?: MangaFormat };
export type Manga = { id: number; title: { userPreferred?: string | null; english?: string | null; romaji?: string | null }; coverImage?: { extraLarge?: string | null; large?: string | null; color?: string | null } | null; averageScore?: number | null; popularity?: number | null; genres?: Array<string | null> | null; format?: string | null; status?: string | null; chapters?: number | null; volumes?: number | null; description?: string | null; startDate?: { year?: number | null } | null };

type MangaResponse = { data?: { Page?: { media?: Manga[]; pageInfo?: { currentPage?: number; lastPage?: number; hasNextPage?: boolean } } }; errors?: Array<{ message?: string }> };
const MANGA_FIELDS = `id title { userPreferred english romaji } coverImage { extraLarge large color } averageScore popularity genres format status chapters volumes description startDate { year }`;

function mangaArchiveRequest(page: number, perPage: number, filters: MangaFilters) {
  const variables: Record<string, unknown> = { page, perPage };
  const definitions = ["$page: Int!", "$perPage: Int!"];
  const args = ["type: MANGA", "isAdult: false", "sort: POPULARITY_DESC"];
  const add = (name: string, type: string, argument: string, value: unknown) => { if (value === undefined || value === "") return; definitions.push(`$${name}: ${type}`); args.push(`${argument}: $${name}`); variables[name] = value; };
  add("search", "String", "search", filters.search?.trim());
  add("genre", "String", "genre", filters.genre);
  add("status", "MediaStatus", "status", filters.status);
  add("format", "MediaFormat", "format", filters.format);
  if (filters.year) { add("startDateGreater", "FuzzyDateInt", "startDate_greater", filters.year * 10000); add("startDateLesser", "FuzzyDateInt", "startDate_lesser", (filters.year + 1) * 10000); }
  return { query: `query AnimaMangaArchive(${definitions.join(", ")}) { Page(page: $page, perPage: $perPage) { pageInfo { currentPage lastPage hasNextPage } media(${args.join(", ")}) { ${MANGA_FIELDS} } } }`, variables };
}

export async function fetchMangaArchive(page: number, perPage: number, filters: MangaFilters = {}, signal?: AbortSignal) {
  const archive = mangaArchiveRequest(page, perPage, filters);
  const response = await fetch("https://graphql.anilist.co", { method: "POST", signal, headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(archive) });
  if (!response.ok) throw new Error(`AniList responded with ${response.status}`);
  const payload = await response.json() as MangaResponse;
  if (payload.errors?.length) throw new Error(payload.errors[0]?.message || "AniList could not return this manga archive.");
  return { manga: payload.data?.Page?.media || [], pageInfo: payload.data?.Page?.pageInfo || {} };
}
