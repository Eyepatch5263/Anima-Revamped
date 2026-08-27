export const MANGADEX_READING_PROGRESS_STORAGE_KEY = "anima:mangadex-reading-progress:v1";
export const MANGADEX_READING_PROGRESS_CHANGE_EVENT = "anima:mangadex-reading-progress-change";
const MANGADEX_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export type MangaDexReadingProgressDetails = {
  title?: string;
  chapterLabel?: string;
};

export type MangaDexReadingProgress = MangaDexReadingProgressDetails & {
  chapterId: string;
  savedAt: number;
};

export type MangaDexReadingProgressMap = Record<string, MangaDexReadingProgress>;

export type MangaDexContinueReadingItem = MangaDexReadingProgress & {
  mangaId: string;
  title: string;
  chapterLabel: string;
};

function resolveStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage !== undefined) return storage;
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function normaliseProgressEntry(value: unknown): MangaDexReadingProgress | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.chapterId !== "string" || !record.chapterId || typeof record.savedAt !== "number" || !Number.isFinite(record.savedAt)) return null;

  const title = typeof record.title === "string" && record.title.trim() ? record.title.trim() : undefined;
  const chapterLabel = typeof record.chapterLabel === "string" && record.chapterLabel.trim() ? record.chapterLabel.trim() : undefined;

  return {
    chapterId: record.chapterId,
    savedAt: record.savedAt,
    ...(title ? { title } : {}),
    ...(chapterLabel ? { chapterLabel } : {}),
  };
}

export function readMangaDexReadingProgress(storage?: StorageLike | null): MangaDexReadingProgressMap {
  const target = resolveStorage(storage);
  if (!target) return {};

  try {
    const raw = target.getItem(MANGADEX_READING_PROGRESS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).flatMap(([mangaId, progress]) => {
        const entry = mangaId ? normaliseProgressEntry(progress) : null;
        return entry ? [[mangaId, entry]] : [];
      }),
    );
  } catch {
    return {};
  }
}

export function getMangaDexContinueReading(storage?: StorageLike | null): MangaDexContinueReadingItem[] {
  return Object.entries(readMangaDexReadingProgress(storage))
    .flatMap(([mangaId, progress]) => {
      if (!progress.title || !progress.chapterLabel) return [];
      return [{
        mangaId,
        ...progress,
        title: progress.title,
        chapterLabel: progress.chapterLabel,
      }];
    })
    .sort((first, second) => second.savedAt - first.savedAt);
}

export function getMangaDexLastReadChapter(mangaId: string, storage?: StorageLike | null): string | null {
  if (!mangaId) return null;
  return readMangaDexReadingProgress(storage)[mangaId]?.chapterId || null;
}

export function resolveMangaDexLastReadChapter<T extends { id: string }>(chapters: T[], savedChapterId: string | null): string | null {
  if (!chapters.length) return null;
  return savedChapterId && chapters.some((chapter) => chapter.id === savedChapterId) ? savedChapterId : chapters[0].id;
}

export function getMangaDexTitleIdFromSearch(search: string): string | null {
  const titleId = new URLSearchParams(search).get("title");
  return titleId && MANGADEX_UUID_PATTERN.test(titleId) ? titleId : null;
}

export function saveMangaDexLastReadChapter(mangaId: string, chapterId: string, details: MangaDexReadingProgressDetails = {}, storage?: StorageLike | null): boolean {
  if (!mangaId || !chapterId) return false;
  const target = resolveStorage(storage);
  if (!target) return false;

  try {
    const progress = readMangaDexReadingProgress(target);
    const current = progress[mangaId];
    progress[mangaId] = {
      ...current,
      chapterId,
      savedAt: Date.now(),
      ...(details.title ? { title: details.title.trim() } : {}),
      ...(details.chapterLabel ? { chapterLabel: details.chapterLabel.trim() } : {}),
    };
    target.setItem(MANGADEX_READING_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    if (typeof window !== "undefined") window.dispatchEvent(new Event(MANGADEX_READING_PROGRESS_CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}
