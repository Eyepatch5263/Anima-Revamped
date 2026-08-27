import { describe, expect, it } from "vitest";
import {
  getMangaDexContinueReading,
  getMangaDexLastReadChapter,
  getMangaDexTitleIdFromSearch,
  MANGADEX_READING_PROGRESS_STORAGE_KEY,
  readMangaDexReadingProgress,
  resolveMangaDexLastReadChapter,
  saveMangaDexLastReadChapter,
  type StorageLike,
} from "./mangaDexReadingProgress";

function createStorage(initial: Record<string, string> = {}): StorageLike & { values: Map<string, string> } {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem(key) {
      return values.get(key) || null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

describe("MangaDex reading progress", () => {
  it("returns no Continue reading entries when this browser has no saved title metadata", () => {
    expect(getMangaDexContinueReading(createStorage())).toEqual([]);
  });

  it("saves separate last-read chapters for separate MangaDex title IDs", () => {
    const storage = createStorage();

    expect(saveMangaDexLastReadChapter("title-a", "chapter-1", {}, storage)).toBe(true);
    expect(saveMangaDexLastReadChapter("title-b", "chapter-9", {}, storage)).toBe(true);

    expect(getMangaDexLastReadChapter("title-a", storage)).toBe("chapter-1");
    expect(getMangaDexLastReadChapter("title-b", storage)).toBe("chapter-9");
    expect(readMangaDexReadingProgress(storage)).toMatchObject({
      "title-a": { chapterId: "chapter-1" },
      "title-b": { chapterId: "chapter-9" },
    });
  });

  it("safely ignores malformed saved data and accepts later valid progress", () => {
    const storage = createStorage({ [MANGADEX_READING_PROGRESS_STORAGE_KEY]: "not-json" });

    expect(readMangaDexReadingProgress(storage)).toEqual({});
    expect(getMangaDexLastReadChapter("title-a", storage)).toBeNull();
    expect(saveMangaDexLastReadChapter("title-a", "chapter-2", {}, storage)).toBe(true);
    expect(getMangaDexLastReadChapter("title-a", storage)).toBe("chapter-2");
  });

  it("falls back to the first live chapter when a saved chapter is no longer available", () => {
    const chapters = [{ id: "chapter-1" }, { id: "chapter-2" }];

    expect(resolveMangaDexLastReadChapter(chapters, "chapter-2")).toBe("chapter-2");
    expect(resolveMangaDexLastReadChapter(chapters, "removed-chapter")).toBe("chapter-1");
    expect(resolveMangaDexLastReadChapter([], "removed-chapter")).toBeNull();
  });

  it("accepts only a valid MangaDex title ID from a reader URL", () => {
    const titleId = "a17fc281-4488-43b2-98d4-c3a4a72b8439";

    expect(getMangaDexTitleIdFromSearch(`?title=${titleId}`)).toBe(titleId);
    expect(getMangaDexTitleIdFromSearch("?title=not-a-mangadex-id")).toBeNull();
    expect(getMangaDexTitleIdFromSearch("")).toBeNull();
  });

  it("returns shelf-ready records in recent reading order while keeping old chapter-only entries private", () => {
    const storage = createStorage();
    const originalNow = Date.now;
    Date.now = () => 100;
    saveMangaDexLastReadChapter("title-old", "chapter-old", {}, storage);
    saveMangaDexLastReadChapter("title-a", "chapter-1", { title: "First manga", chapterLabel: "Ch. 1 — Arrival" }, storage);
    Date.now = () => 200;
    saveMangaDexLastReadChapter("title-b", "chapter-4", { title: "Second manga", chapterLabel: "Ch. 4 — Return" }, storage);
    Date.now = originalNow;

    expect(getMangaDexContinueReading(storage)).toEqual([
      expect.objectContaining({ mangaId: "title-b", title: "Second manga", chapterId: "chapter-4", chapterLabel: "Ch. 4 — Return" }),
      expect.objectContaining({ mangaId: "title-a", title: "First manga", chapterId: "chapter-1", chapterLabel: "Ch. 1 — Arrival" }),
    ]);
  });
});
