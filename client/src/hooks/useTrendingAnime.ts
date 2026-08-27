/**
 * Midnight Editorial design reminder: live anime data should remain quiet, legible, and art-led.
 * The AniList response is intentionally reduced to the story notes the homepage needs.
 */
import { useCallback, useEffect, useState } from "react";

export type Anime = {
  id: number;
  title: {
    userPreferred?: string | null;
    english?: string | null;
    romaji?: string | null;
  };
  coverImage: {
    extraLarge?: string | null;
    large?: string | null;
    color?: string | null;
  } | null;
  bannerImage?: string | null;
  averageScore?: number | null;
  popularity?: number | null;
  genres?: Array<string | null> | null;
  format?: string | null;
  episodes?: number | null;
  status?: string | null;
  description?: string | null;
  season?: string | null;
  seasonYear?: number | null;
};

type AniListResponse = {
  data?: { Page?: { media?: Anime[] } };
  errors?: Array<{ message?: string }>;
};

const TRENDING_QUERY = `
  query AnimaTrending($perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      media(type: ANIME, isAdult: false, sort: TRENDING_DESC) {
        id
        title { userPreferred english }
        coverImage { extraLarge large color }
        averageScore
        genres
        format
        episodes
      }
    }
  }
`;

export function useTrendingAnime() {
  const [anime, setAnime] = useState<Anime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrending = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: TRENDING_QUERY, variables: { perPage: 8 } }),
      });

      if (!response.ok) {
        throw new Error(`AniList responded with ${response.status}`);
      }

      const payload = (await response.json()) as AniListResponse;
      if (payload.errors?.length) {
        throw new Error(payload.errors[0]?.message || "AniList could not return trending anime.");
      }

      setAnime(payload.data?.Page?.media || []);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "The trend signal is temporarily unavailable.");
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadTrending(controller.signal);
    return () => controller.abort();
  }, [loadTrending]);

  return { anime, isLoading, error, retry: () => void loadTrending() };
}
