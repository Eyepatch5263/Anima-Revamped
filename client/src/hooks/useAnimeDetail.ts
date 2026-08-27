/**
 * Midnight Editorial design reminder: detail data serves a slow, cinematic reading experience.
 * This hook requests only the story, people, studio, and trailer fields visible on the page.
 */
import { useCallback, useEffect, useState } from "react";

export type RelatedAnime = {
  id: number;
  type?: string | null;
  title: { userPreferred?: string | null; english?: string | null; native?: string | null };
  coverImage?: { extraLarge?: string | null; large?: string | null; color?: string | null } | null;
  averageScore?: number | null;
  format?: string | null;
  episodes?: number | null;
  status?: string | null;
  genres?: Array<string | null> | null;
};

export type AnimeDetail = {
  id: number;
  title: { userPreferred?: string | null; english?: string | null; native?: string | null };
  description?: string | null;
  coverImage?: { extraLarge?: string | null; large?: string | null; color?: string | null } | null;
  bannerImage?: string | null;
  averageScore?: number | null;
  popularity?: number | null;
  format?: string | null;
  status?: string | null;
  episodes?: number | null;
  duration?: number | null;
  season?: string | null;
  seasonYear?: number | null;
  genres?: Array<string | null> | null;
  trailer?: { id?: string | null; site?: string | null; thumbnail?: string | null } | null;
  characters?: {
    edges?: Array<{
      role?: string | null;
      node?: { id: number; name?: { full?: string | null; native?: string | null } | null; image?: { large?: string | null } | null } | null;
      voiceActors?: Array<{ id: number; name?: { full?: string | null } | null; image?: { large?: string | null } | null } | null> | null;
    } | null> | null;
  } | null;
  studios?: {
    edges?: Array<{ isMain?: boolean | null; node?: { id: number; name?: string | null; siteUrl?: string | null } | null } | null> | null;
  } | null;
  relations?: {
    edges?: Array<{ relationType?: string | null; node?: RelatedAnime | null } | null> | null;
  } | null;
  recommendations?: {
    nodes?: Array<{ rating?: number | null; mediaRecommendation?: RelatedAnime | null } | null> | null;
  } | null;
};

type AniListResponse = { data?: { Media?: AnimeDetail | null }; errors?: Array<{ message?: string }> };

const DETAIL_QUERY = `
  query AnimaDetail($id: Int!) {
    Media(id: $id, type: ANIME) {
      id
      title { userPreferred english native }
      description(asHtml: true)
      coverImage { extraLarge large color }
      bannerImage
      averageScore
      popularity
      format
      status(version: 2)
      episodes
      duration
      season
      seasonYear
      genres
      trailer { id site thumbnail }
      characters(perPage: 12, sort: [ROLE, RELEVANCE]) {
        edges {
          role
          node { id name { full native } image { large } }
          voiceActors(language: JAPANESE, sort: [RELEVANCE]) { id name { full } image { large } }
        }
      }
      studios(isMain: true) { edges { isMain node { id name siteUrl } } }
      relations {
        edges {
          relationType(version: 2)
          node {
            id
            type
            title { userPreferred english native }
            coverImage { extraLarge large color }
            averageScore
            format
            episodes
            status(version: 2)
            genres
          }
        }
      }
      recommendations(perPage: 12, sort: [RATING_DESC]) {
        nodes {
          rating
          mediaRecommendation {
            id
            type
            title { userPreferred english native }
            coverImage { extraLarge large color }
            averageScore
            format
            episodes
            status(version: 2)
            genres
          }
        }
      }
    }
  }
`;

export function useAnimeDetail(id?: string) {
  const [anime, setAnime] = useState<AnimeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    const mediaId = Number(id);
    if (!Number.isInteger(mediaId) || mediaId <= 0) {
      setAnime(null);
      setError("That anime record could not be found.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: DETAIL_QUERY, variables: { id: mediaId } }),
      });
      if (!response.ok) throw new Error(`AniList responded with ${response.status}`);
      const payload = (await response.json()) as AniListResponse;
      if (payload.errors?.length) throw new Error(payload.errors[0]?.message || "AniList could not return this anime.");
      if (!payload.data?.Media) throw new Error("That anime record could not be found.");
      setAnime(payload.data.Media);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "This story is temporarily unavailable.");
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { anime, isLoading, error, retry: () => void load() };
}
