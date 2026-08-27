/** Midnight Editorial data reminder: request the people, publication facts, and connected media visible in the print story file. */
import { useCallback, useEffect, useState } from "react";

export type RelatedMangaMedia = {
  id: number;
  type?: string | null;
  title: { userPreferred?: string | null; english?: string | null; native?: string | null };
  coverImage?: { extraLarge?: string | null; large?: string | null; color?: string | null } | null;
  averageScore?: number | null;
  format?: string | null;
  chapters?: number | null;
  volumes?: number | null;
  episodes?: number | null;
  status?: string | null;
  genres?: Array<string | null> | null;
};

export type MangaDetail = {
  id: number;
  title: { userPreferred?: string | null; english?: string | null; native?: string | null };
  description?: string | null;
  coverImage?: { extraLarge?: string | null; large?: string | null; color?: string | null } | null;
  bannerImage?: string | null;
  averageScore?: number | null;
  popularity?: number | null;
  favourites?: number | null;
  format?: string | null;
  status?: string | null;
  chapters?: number | null;
  volumes?: number | null;
  countryOfOrigin?: string | null;
  source?: string | null;
  startDate?: { year?: number | null; month?: number | null; day?: number | null } | null;
  endDate?: { year?: number | null; month?: number | null; day?: number | null } | null;
  genres?: Array<string | null> | null;
  characters?: { edges?: Array<{ role?: string | null; node?: { id: number; name?: { full?: string | null; native?: string | null } | null; image?: { large?: string | null } | null; description?: string | null } | null }> | null } | null;
  staff?: { edges?: Array<{ role?: string | null; node?: { id: number; name?: { full?: string | null; native?: string | null } | null; image?: { large?: string | null } | null; siteUrl?: string | null } | null }> | null } | null;
  relations?: { edges?: Array<{ relationType?: string | null; node?: RelatedMangaMedia | null }> | null } | null;
  recommendations?: { nodes?: Array<{ rating?: number | null; mediaRecommendation?: RelatedMangaMedia | null }> | null } | null;
};

type AniListResponse = { data?: { Media?: MangaDetail | null }; errors?: Array<{ message?: string }> };

const DETAIL_QUERY = `
  query AnimaMangaDetail($id: Int!) {
    Media(id: $id, type: MANGA) {
      id title { userPreferred english native } description(asHtml: true) coverImage { extraLarge large color } bannerImage
      averageScore popularity favourites format status(version: 2) chapters volumes countryOfOrigin source
      startDate { year month day } endDate { year month day } genres
      characters(perPage: 12, sort: [ROLE, RELEVANCE]) { edges { role node { id name { full native } image { large } description } } }
      staff(perPage: 12, sort: [RELEVANCE]) { edges { role node { id name { full native } image { large } siteUrl } } }
      relations { edges { relationType(version: 2) node { id type title { userPreferred english native } coverImage { extraLarge large color } averageScore format chapters volumes episodes status(version: 2) genres } } }
      recommendations(perPage: 12, sort: [RATING_DESC]) { nodes { rating mediaRecommendation { id type title { userPreferred english native } coverImage { extraLarge large color } averageScore format chapters volumes episodes status(version: 2) genres } } }
    }
  }
`;

export function useMangaDetail(id?: string) {
  const [manga, setManga] = useState<MangaDetail | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    const mediaId = Number(id);
    if (!Number.isInteger(mediaId) || mediaId <= 0) { setManga(null); setError("That manga record could not be found."); setIsLoading(false); return; }
    setIsLoading(true); setError(null);
    try {
      const response = await fetch("https://graphql.anilist.co", { method: "POST", signal, headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ query: DETAIL_QUERY, variables: { id: mediaId } }) });
      if (!response.ok) throw new Error(`AniList responded with ${response.status}`);
      const payload = await response.json() as AniListResponse;
      if (payload.errors?.length) throw new Error(payload.errors[0]?.message || "AniList could not return this manga.");
      if (!payload.data?.Media) throw new Error("That manga record could not be found.");
      setManga(payload.data.Media);
    } catch (caught) { if (caught instanceof DOMException && caught.name === "AbortError") return; setError(caught instanceof Error ? caught.message : "This print story is temporarily unavailable."); }
    finally { if (!signal?.aborted) setIsLoading(false); }
  }, [id]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  return { manga, isLoading, error, retry: () => void load() };
}
