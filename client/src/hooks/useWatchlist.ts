/**
 * Midnight Editorial design reminder: watchlist data stays compact and local, preserving the quiet, personal index.
 * Store only the snapshot needed to render a saved title; the detail page remains the source of live information.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

export type WatchStatus = "PLAN_TO_WATCH" | "WATCHING" | "COMPLETED";

export type WatchlistEntry = {
  id: number;
  title: string;
  coverImage: string | null;
  averageScore: number | null;
  format: string | null;
  episodes: number | null;
  genres: string[];
  status: WatchStatus;
  progress: number;
  savedAt: number;
  lastActivityAt: number;
  completedAt: number | null;
};

export type NewWatchlistEntry = Omit<WatchlistEntry, "savedAt" | "lastActivityAt" | "completedAt" | "status" | "progress">;

const STORAGE_KEY = "anima-watchlist:v1";
const CHANGE_EVENT = "anima-watchlist-change";

function normaliseEntry(entry: Partial<WatchlistEntry>): WatchlistEntry | null {
  if (typeof entry.id !== "number" || typeof entry.title !== "string") return null;
  const validStatus: WatchStatus[] = ["PLAN_TO_WATCH", "WATCHING", "COMPLETED"];
  const episodes = typeof entry.episodes === "number" && entry.episodes > 0 ? entry.episodes : null;
  const status = validStatus.includes(entry.status as WatchStatus) ? entry.status as WatchStatus : "PLAN_TO_WATCH";
  const rawProgress = typeof entry.progress === "number" && Number.isFinite(entry.progress) ? entry.progress : 0;
  const progress = Math.max(0, Math.min(Math.floor(rawProgress), episodes || Number.MAX_SAFE_INTEGER));
  const savedAt = typeof entry.savedAt === "number" ? entry.savedAt : Date.now();
  const lastActivityAt = typeof entry.lastActivityAt === "number" ? entry.lastActivityAt : savedAt;
  const completedAt = typeof entry.completedAt === "number" ? entry.completedAt : status === "COMPLETED" ? lastActivityAt : null;
  return {
    id: entry.id,
    title: entry.title,
    coverImage: typeof entry.coverImage === "string" ? entry.coverImage : null,
    averageScore: typeof entry.averageScore === "number" ? entry.averageScore : null,
    format: typeof entry.format === "string" ? entry.format : null,
    episodes,
    genres: Array.isArray(entry.genres) ? entry.genres.filter((genre): genre is string => typeof genre === "string") : [],
    status,
    progress: status === "COMPLETED" && episodes ? episodes : progress,
    savedAt,
    lastActivityAt,
    completedAt,
  };
}

function readWatchlist(): WatchlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.map(normaliseEntry).filter((entry): entry is WatchlistEntry => Boolean(entry)) : [];
  } catch {
    return [];
  }
}

function writeWatchlist(entries: WatchlistEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistEntry[]>(readWatchlist);
  const sync = useCallback(() => setItems(readWatchlist()), []);

  useEffect(() => {
    window.addEventListener("storage", sync);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, [sync]);

  const isSaved = useCallback((id: number) => items.some((item) => item.id === id), [items]);

  const add = useCallback((entry: NewWatchlistEntry) => {
    const current = readWatchlist();
    if (current.some((item) => item.id === entry.id)) return false;
    const now = Date.now();
    writeWatchlist([{ ...entry, status: "PLAN_TO_WATCH", progress: 0, savedAt: now, lastActivityAt: now, completedAt: null }, ...current]);
    sync();
    return true;
  }, [sync]);

  const remove = useCallback((id: number) => {
    writeWatchlist(readWatchlist().filter((item) => item.id !== id));
    sync();
  }, [sync]);

  const update = useCallback((id: number, changes: Partial<Pick<WatchlistEntry, "status" | "progress">>) => {
    const next = readWatchlist().map((item) => {
      if (item.id !== id) return item;
      const desiredStatus = changes.status || item.status;
      const maxProgress = item.episodes || Number.MAX_SAFE_INTEGER;
      const desiredProgress = typeof changes.progress === "number" ? changes.progress : item.progress;
      const progress = desiredStatus === "COMPLETED" && item.episodes ? item.episodes : Math.max(0, Math.min(Math.floor(desiredProgress), maxProgress));
      const now = Date.now();
      const completedAt = desiredStatus === "COMPLETED" ? item.status === "COMPLETED" && item.completedAt ? item.completedAt : now : null;
      return { ...item, status: desiredStatus, progress, lastActivityAt: now, completedAt };
    });
    writeWatchlist(next);
    sync();
  }, [sync]);

  const setStatus = useCallback((id: number, status: WatchStatus) => update(id, { status }), [update]);
  const setProgress = useCallback((id: number, progress: number) => update(id, { progress }), [update]);

  const toggle = useCallback((entry: NewWatchlistEntry) => {
    if (isSaved(entry.id)) {
      remove(entry.id);
      return false;
    }
    add(entry);
    return true;
  }, [add, isSaved, remove]);

  return useMemo(() => ({ items, count: items.length, isSaved, add, remove, setStatus, setProgress, toggle }), [add, isSaved, items, remove, setProgress, setStatus, toggle]);
}
