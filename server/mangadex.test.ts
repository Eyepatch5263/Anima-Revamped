import { describe, expect, it } from "vitest";
import { getMangaDexChapters, normalizeChapter, normalizeManga, preferredTitle, sortChapters } from "./mangadex";

describe("MangaDex normalization", () => {
  it("selects a readable title and resolves an included cover record", () => {
    const manga = normalizeManga({ id: "manga-id", attributes: { title: { "ja-ro": "Ore dake Level Up na Ken", en: "Solo Leveling" }, description: { en: "A hunter levels up." }, status: "ongoing", year: 2018, tags: [{ attributes: { name: { en: "Action" } } }], contentRating: "safe" }, relationships: [{ type: "cover_art", attributes: { fileName: "cover.png" } }] });
    expect(manga.title).toBe("Solo Leveling");
    expect(manga.coverUrl).toBe("https://uploads.mangadex.org/covers/manga-id/cover.png.256.jpg");
    expect(manga.tags).toEqual(["Action"]);
  });

  it("orders chapter records numerically and treats localized values as fallbacks", () => {
    const first = normalizeChapter({ id: "two", attributes: { chapter: "2", pages: 10, translatedLanguage: "en" } });
    const second = normalizeChapter({ id: "one", attributes: { chapter: "1.5", pages: 10, translatedLanguage: "en" } });
    expect(sortChapters([first, second]).map((chapter) => chapter.chapter)).toEqual(["1.5", "2"]);
    expect(preferredTitle({ ko: "나 혼자만 레벨업" })).toBe("나 혼자만 레벨업");
  });

  it("aggregates every paginated source chapter before returning the ordered ledger", async () => {
    const originalFetch = globalThis.fetch;
    const calls: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = new URL(String(input));
      calls.push(url.toString());
      const offset = url.searchParams.get("offset");
      const data = offset === "0"
        ? [{ id: "second", attributes: { chapter: "2", pages: 20, translatedLanguage: "en" } }]
        : [{ id: "first", attributes: { chapter: "1", pages: 18, translatedLanguage: "en" } }];
      return new Response(JSON.stringify({ result: "ok", data, total: 2 }), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof globalThis.fetch;
    try {
      const chapters = await getMangaDexChapters("00000000-0000-4000-8000-000000000000");
      expect(chapters.map((chapter) => chapter.chapter)).toEqual(["1", "2"]);
      expect(calls).toHaveLength(2);
      expect(calls[0]).toContain("offset=0");
      expect(calls[1]).toContain("offset=1");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
