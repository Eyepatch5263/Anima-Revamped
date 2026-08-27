/**
 * Midnight Editorial design reminder: collection data becomes a set of curated reading rails, never a generic API dump.
 * Home previews share one aliased AniList request to keep the four signals synchronized and rate-limit friendly.
 */
import { useCallback, useEffect, useState } from "react";
import type { Anime } from "./useTrendingAnime";

export type CollectionKey = "seasonal" | "upcoming" | "popular" | "top";
export type ArchiveSeason = "WINTER" | "SPRING" | "SUMMER" | "FALL";
export type ArchiveStatus = "RELEASING" | "FINISHED" | "NOT_YET_RELEASED";
export type ArchiveFormat = "TV" | "TV_SHORT" | "MOVIE" | "SPECIAL" | "OVA" | "ONA";
export type ArchiveFilters = { search?: string; genre?: string; year?: number; status?: ArchiveStatus; season?: ArchiveSeason; format?: ArchiveFormat };

type AniListPageInfo = { currentPage?: number; lastPage?: number; hasNextPage?: boolean };
type CollectionResponse = { data?: { Page?: { media?: Anime[]; pageInfo?: AniListPageInfo } }; errors?: Array<{ message?: string }> };
type HomeCollectionResponse = { data?: Partial<Record<CollectionKey, { media?: Anime[] }>>; errors?: Array<{ message?: string }> };

export type CollectionDefinition = { key: CollectionKey; eyebrow: string; title: string; description: string; railLabel: string };
export type CollectionPreviewState = { anime: Anime[]; isLoading: boolean; error: string | null; retry: () => void };

export const COLLECTIONS: Record<CollectionKey, CollectionDefinition> = {
  seasonal: { key: "seasonal", eyebrow: "The current season", title: "Popular this season.", description: "The titles carrying the present moment, sorted by the audience following them right now.", railLabel: "Seasonal signal" },
  upcoming: { key: "upcoming", eyebrow: "The next horizon", title: "Upcoming next season.", description: "The early signals gathering before the next season begins.", railLabel: "On the horizon" },
  popular: { key: "popular", eyebrow: "The long conversation", title: "All-time popular.", description: "The stories that have kept finding their audience long after the weekly conversation moved on.", railLabel: "Enduring signal" },
  top: { key: "top", eyebrow: "The enduring canon", title: "Top 100 anime.", description: "The highest-rated anime in the AniList index, ready to be explored at your own pace.", railLabel: "Top-rated archive" },
};

const ARCHIVE_FIELDS = `id title { userPreferred english romaji } coverImage { extraLarge large color } bannerImage averageScore popularity genres format episodes status season seasonYear description`;

const HOME_COLLECTION_QUERY = `
  query AnimaHomepageCollections($perPage: Int!, $currentSeason: MediaSeason!, $currentYear: Int!, $nextSeason: MediaSeason!, $nextYear: Int!) {
    seasonal: Page(page: 1, perPage: $perPage) { media(type: ANIME, isAdult: false, sort: POPULARITY_DESC, season: $currentSeason, seasonYear: $currentYear) { id title { userPreferred english romaji } coverImage { extraLarge large color } averageScore popularity genres format episodes status season seasonYear } }
    upcoming: Page(page: 1, perPage: $perPage) { media(type: ANIME, isAdult: false, sort: POPULARITY_DESC, season: $nextSeason, seasonYear: $nextYear, status: NOT_YET_RELEASED) { id title { userPreferred english romaji } coverImage { extraLarge large color } averageScore popularity genres format episodes status season seasonYear } }
    popular: Page(page: 1, perPage: $perPage) { media(type: ANIME, isAdult: false, sort: POPULARITY_DESC) { id title { userPreferred english romaji } coverImage { extraLarge large color } averageScore popularity genres format episodes status season seasonYear } }
    top: Page(page: 1, perPage: $perPage) { media(type: ANIME, isAdult: false, sort: SCORE_DESC) { id title { userPreferred english romaji } coverImage { extraLarge large color } averageScore popularity genres format episodes status season seasonYear } }
  }
`;

function seasonFor(month: number): ArchiveSeason { if (month <= 2) return "WINTER"; if (month <= 5) return "SPRING"; if (month <= 8) return "SUMMER"; return "FALL"; }
function nextSeason(now: Date) { const season = seasonFor(now.getUTCMonth()); const year = now.getUTCFullYear(); if (season === "WINTER") return { season: "SPRING" as const, year }; if (season === "SPRING") return { season: "SUMMER" as const, year }; if (season === "SUMMER") return { season: "FALL" as const, year }; return { season: "WINTER" as const, year: year + 1 }; }

async function request(query: string, variables: Record<string, unknown>, signal?: AbortSignal) {
  const response = await fetch("https://graphql.anilist.co", { method: "POST", signal, headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ query, variables }) });
  if (!response.ok) throw new Error(`AniList responded with ${response.status}`);
  return response.json();
}

function archiveRequest(key: CollectionKey, page: number, perPage: number, filters: ArchiveFilters) {
  const now = new Date();
  const next = nextSeason(now);
  const defaultSeason = key === "seasonal" ? seasonFor(now.getUTCMonth()) : key === "upcoming" ? next.season : undefined;
  const defaultYear = key === "seasonal" ? now.getUTCFullYear() : key === "upcoming" ? next.year : undefined;
  const defaultStatus: ArchiveStatus | undefined = key === "upcoming" ? "NOT_YET_RELEASED" : undefined;
  const variables: Record<string, unknown> = { page, perPage };
  const definitions = ["$page: Int!", "$perPage: Int!"];
  const args = ["type: ANIME", "isAdult: false", `sort: ${key === "top" ? "SCORE_DESC" : "POPULARITY_DESC"}`];
  const add = (name: string, type: string, argument: string, value: unknown) => { if (value === undefined || value === "") return; definitions.push(`$${name}: ${type}`); args.push(`${argument}: $${name}`); variables[name] = value; };
  add("search", "String", "search", filters.search?.trim());
  add("genre", "String", "genre", filters.genre);
  add("format", "MediaFormat", "format", filters.format);
  add("status", "MediaStatus", "status", filters.status || defaultStatus);
  add("season", "MediaSeason", "season", filters.season || defaultSeason);
  add("seasonYear", "Int", "seasonYear", filters.year || defaultYear);
  return { query: `query AnimaArchive(${definitions.join(", ")}) { Page(page: $page, perPage: $perPage) { pageInfo { currentPage lastPage hasNextPage } media(${args.join(", ")}) { ${ARCHIVE_FIELDS} } } }`, variables };
}

export async function fetchAnimeCollection(key: CollectionKey, page: number, perPage: number, filters: ArchiveFilters = {}, signal?: AbortSignal) {
  const archive = archiveRequest(key, page, perPage, filters);
  const payload = await request(archive.query, archive.variables, signal) as CollectionResponse;
  if (payload.errors?.length) throw new Error(payload.errors[0]?.message || "AniList could not return this collection.");
  return { anime: payload.data?.Page?.media || [], pageInfo: payload.data?.Page?.pageInfo || {} };
}

export function useAnimeCollection(key: CollectionKey, perPage = 6) {
  const [anime, setAnime] = useState<Anime[]>([]); const [isLoading, setIsLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => { setIsLoading(true); setError(null); try { setAnime((await fetchAnimeCollection(key, 1, perPage, {}, signal)).anime); } catch (caught) { if (caught instanceof DOMException && caught.name === "AbortError") return; setError(caught instanceof Error ? caught.message : "This collection is temporarily unavailable."); } finally { if (!signal?.aborted) setIsLoading(false); } }, [key, perPage]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  return { anime, isLoading, error, retry: () => void load() };
}

export function useHomepageCollections(perPage = 6) {
  const [anime, setAnime] = useState<Record<CollectionKey, Anime[]>>({ seasonal: [], upcoming: [], popular: [], top: [] });
  const [isLoading, setIsLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => { setIsLoading(true); setError(null); try { const now = new Date(); const upcoming = nextSeason(now); const payload = await request(HOME_COLLECTION_QUERY, { perPage, currentSeason: seasonFor(now.getUTCMonth()), currentYear: now.getUTCFullYear(), nextSeason: upcoming.season, nextYear: upcoming.year }, signal) as HomeCollectionResponse; if (payload.errors?.length) throw new Error(payload.errors[0]?.message || "AniList could not return these collections."); setAnime({ seasonal: payload.data?.seasonal?.media || [], upcoming: payload.data?.upcoming?.media || [], popular: payload.data?.popular?.media || [], top: payload.data?.top?.media || [] }); } catch (caught) { if (caught instanceof DOMException && caught.name === "AbortError") return; setError(caught instanceof Error ? caught.message : "These collection signals are temporarily unavailable."); } finally { if (!signal?.aborted) setIsLoading(false); } }, [perPage]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const state = (key: CollectionKey): CollectionPreviewState => ({ anime: anime[key], isLoading, error, retry: () => void load() });
  return { seasonal: state("seasonal"), upcoming: state("upcoming"), popular: state("popular"), top: state("top") };
}
