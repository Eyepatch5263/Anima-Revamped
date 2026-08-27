/** Midnight Editorial reminder: favorite Manga snapshots remain small, personal, and browser-local; live story files remain authoritative. */
import { useCallback, useEffect, useMemo, useState } from "react";

export type MangaFavorite = {
  id: number;
  title: string;
  coverImage: string | null;
  averageScore: number | null;
  format: string | null;
  chapters: number | null;
  volumes: number | null;
  genres: string[];
  savedAt: number;
};
export type NewMangaFavorite = Omit<MangaFavorite, "savedAt">;
const STORAGE_KEY = "anima-manga-favorites:v1";
const CHANGE_EVENT = "anima-manga-favorites-change";

function normalise(entry: Partial<MangaFavorite>): MangaFavorite | null {
  if (typeof entry.id !== "number" || typeof entry.title !== "string") return null;
  return { id: entry.id, title: entry.title, coverImage: typeof entry.coverImage === "string" ? entry.coverImage : null, averageScore: typeof entry.averageScore === "number" ? entry.averageScore : null, format: typeof entry.format === "string" ? entry.format : null, chapters: typeof entry.chapters === "number" && entry.chapters > 0 ? entry.chapters : null, volumes: typeof entry.volumes === "number" && entry.volumes > 0 ? entry.volumes : null, genres: Array.isArray(entry.genres) ? entry.genres.filter((genre): genre is string => typeof genre === "string") : [], savedAt: typeof entry.savedAt === "number" ? entry.savedAt : Date.now() };
}
function readFavorites(): MangaFavorite[] { if (typeof window === "undefined") return []; try { const raw = window.localStorage.getItem(STORAGE_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed.map(normalise).filter((entry): entry is MangaFavorite => Boolean(entry)) : []; } catch { return []; } }
function writeFavorites(items: MangaFavorite[]) { if (typeof window === "undefined") return; window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); window.dispatchEvent(new Event(CHANGE_EVENT)); }

export function useMangaFavorites() {
  const [items, setItems] = useState<MangaFavorite[]>(readFavorites);
  const sync = useCallback(() => setItems(readFavorites()), []);
  useEffect(() => { window.addEventListener("storage", sync); window.addEventListener(CHANGE_EVENT, sync); return () => { window.removeEventListener("storage", sync); window.removeEventListener(CHANGE_EVENT, sync); }; }, [sync]);
  const isSaved = useCallback((id: number) => items.some((item) => item.id === id), [items]);
  const add = useCallback((entry: NewMangaFavorite) => { const current = readFavorites(); if (current.some((item) => item.id === entry.id)) return false; writeFavorites([{ ...entry, savedAt: Date.now() }, ...current]); sync(); return true; }, [sync]);
  const remove = useCallback((id: number) => { writeFavorites(readFavorites().filter((item) => item.id !== id)); sync(); }, [sync]);
  const toggle = useCallback((entry: NewMangaFavorite) => { if (isSaved(entry.id)) { remove(entry.id); return false; } add(entry); return true; }, [add, isSaved, remove]);
  return useMemo(() => ({ items, count: items.length, isSaved, add, remove, toggle }), [add, isSaved, items, remove, toggle]);
}
