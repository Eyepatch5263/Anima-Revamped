import type { Request, Response } from "express";

const API_BASE = "https://api.mangadex.org";
const MANGADEX_HEADERS = {
  Accept: "application/json",
  "User-Agent": "Anima Reader/1.0 (+https://animaredesig-bhmof9vw.manus.space)",
};
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_RATINGS = ["safe", "suggestive"] as const;

type JsonRecord = Record<string, unknown>;
type Relationship = { id?: string; type?: string; attributes?: JsonRecord };
type MangaResource = { id: string; type?: string; attributes?: JsonRecord; relationships?: Relationship[] };
type AtHomePayload = { baseUrl?: string; chapter?: { hash?: string; data?: string[]; dataSaver?: string[] } };

export type MangaDexSearchRecord = {
  id: string;
  title: string;
  altTitles: string[];
  coverUrl: string | null;
  description: string;
  status: string;
  year: number | null;
  tags: string[];
  contentRating: string;
};
export type MangaDexTitleRecord = MangaDexSearchRecord & { authors: string[]; artists: string[]; originalLanguage: string; demographic: string | null };
export type MangaDexChapterRecord = { id: string; chapter: string; volume: string | null; title: string | null; language: string; pages: number; publishedAt: string | null };
export type MangaDexManifest = { chapterId: string; pageCount: number; quality: "data" | "data-saver" };

type CachedManifest = { expiresAt: number; baseUrl: string; hash: string; data: string[]; dataSaver: string[] };
const manifestCache = new Map<string, CachedManifest>();

function record(value: unknown): JsonRecord { return typeof value === "object" && value !== null && !Array.isArray(value) ? value as JsonRecord : {}; }
function stringValue(value: unknown): string { return typeof value === "string" ? value : ""; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function objectStrings(value: unknown): string[] { return Object.values(record(value)).filter((item): item is string => typeof item === "string" && item.trim().length > 0); }
function displayStatus(value: unknown): string { const status = stringValue(value); return status ? status.replace(/_/g, " ") : "Unknown"; }

export function preferredTitle(value: unknown): string {
  const titles = record(value);
  return stringValue(titles.en) || stringValue(titles["ja-ro"]) || stringValue(titles.ko) || stringValue(titles.ja) || objectStrings(titles)[0] || "Untitled Manga";
}

function relation(resource: MangaResource, kind: string) { return (resource.relationships || []).filter((item) => item.type === kind); }
function coverFor(resource: MangaResource) {
  const filename = stringValue(relation(resource, "cover_art")[0]?.attributes?.fileName);
  return filename ? `https://uploads.mangadex.org/covers/${resource.id}/${encodeURIComponent(filename)}.256.jpg` : null;
}
function tagsFor(resource: MangaResource) { return (resource.attributes?.tags as unknown[] || []).map((tag) => preferredTitle(record(tag).attributes && record(record(tag).attributes).name)).filter(Boolean).slice(0, 5); }
function descriptionFor(resource: MangaResource) { return preferredTitle(resource.attributes?.description); }
function peopleFor(resource: MangaResource, kind: "author" | "artist") { return relation(resource, kind).map((item) => stringValue(item.attributes?.name) || preferredTitle(item.attributes?.name)).filter(Boolean); }

export function normalizeManga(resource: MangaResource): MangaDexSearchRecord {
  const attributes = resource.attributes || {};
  const altTitles = Array.isArray(attributes.altTitles) ? attributes.altTitles.flatMap(objectStrings).filter((item) => item !== preferredTitle(attributes.title)).slice(0, 4) : [];
  return { id: resource.id, title: preferredTitle(attributes.title), altTitles, coverUrl: coverFor(resource), description: descriptionFor(resource), status: displayStatus(attributes.status), year: typeof attributes.year === "number" ? attributes.year : null, tags: tagsFor(resource), contentRating: stringValue(attributes.contentRating) || "safe" };
}

export function normalizeMangaDetail(resource: MangaResource): MangaDexTitleRecord {
  const attributes = resource.attributes || {};
  return { ...normalizeManga(resource), authors: peopleFor(resource, "author"), artists: peopleFor(resource, "artist"), originalLanguage: stringValue(attributes.originalLanguage) || "unknown", demographic: stringValue(attributes.publicationDemographic) || null };
}

export function normalizeChapter(resource: MangaResource): MangaDexChapterRecord {
  const attributes = resource.attributes || {};
  return { id: resource.id, chapter: stringValue(attributes.chapter) || "—", volume: stringValue(attributes.volume) || null, title: stringValue(attributes.title) || null, language: stringValue(attributes.translatedLanguage) || "unknown", pages: typeof attributes.pages === "number" ? attributes.pages : 0, publishedAt: stringValue(attributes.publishAt) || null };
}

function chapterNumber(chapter: MangaDexChapterRecord) { const parsed = Number.parseFloat(chapter.chapter); return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER; }
export function sortChapters(chapters: MangaDexChapterRecord[]) { return [...chapters].sort((first, second) => chapterNumber(first) - chapterNumber(second) || first.chapter.localeCompare(second.chapter, undefined, { numeric: true })); }

async function apiJson(path: string, parameters?: URLSearchParams) {
  const url = new URL(path, API_BASE);
  parameters?.forEach((value, key) => url.searchParams.append(key, value));
  const response = await fetch(url, { headers: MANGADEX_HEADERS, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`MangaDex request failed (${response.status}).`);
  return response.json() as Promise<JsonRecord>;
}

function addRatings(parameters: URLSearchParams) { ALLOWED_RATINGS.forEach((rating) => parameters.append("contentRating[]", rating)); }

export async function searchMangaDex(query: string) {
  const parameters = new URLSearchParams({ title: query, limit: "20", "order[relevance]": "desc" });
  parameters.append("includes[]", "cover_art");
  addRatings(parameters);
  const payload = await apiJson("/manga", parameters);
  const data = Array.isArray(payload.data) ? payload.data as MangaResource[] : [];
  return data.map(normalizeManga);
}

export async function getMangaDexTitle(id: string) {
  const parameters = new URLSearchParams();
  ["cover_art", "author", "artist"].forEach((value) => parameters.append("includes[]", value));
  const payload = await apiJson(`/manga/${id}`, parameters);
  const resource = payload.data as MangaResource | undefined;
  if (!resource?.id) throw new Error("MangaDex did not return this title.");
  return normalizeMangaDetail(resource);
}

export async function getMangaDexChapters(mangaId: string) {
  const chapterResources: MangaResource[] = [];
  const pageSize = 100;
  const maximumChapters = 2_000;
  let offset = 0;
  let total = 0;
  do {
    const parameters = new URLSearchParams({ limit: String(pageSize), offset: String(offset), "order[volume]": "asc", "order[chapter]": "asc" });
    parameters.append("translatedLanguage[]", "en");
    addRatings(parameters);
    const payload = await apiJson(`/manga/${mangaId}/feed`, parameters);
    const data = Array.isArray(payload.data) ? payload.data as MangaResource[] : [];
    total = typeof payload.total === "number" ? payload.total : data.length;
    chapterResources.push(...data);
    offset += data.length;
    if (!data.length) break;
  } while (offset < total && offset < maximumChapters);
  return sortChapters(chapterResources.map(normalizeChapter).filter((chapter) => chapter.pages > 0));
}

function assertChapterId(chapterId: string) { if (!UUID_PATTERN.test(chapterId)) throw new Error("Invalid MangaDex chapter identifier."); }
async function loadManifest(chapterId: string): Promise<CachedManifest> {
  assertChapterId(chapterId);
  const cached = manifestCache.get(chapterId);
  if (cached && cached.expiresAt > Date.now()) return cached;
  const payload = await apiJson(`/at-home/server/${chapterId}`) as AtHomePayload;
  const baseUrl = stringValue(payload.baseUrl);
  const hash = stringValue(payload.chapter?.hash);
  const data = strings(payload.chapter?.data);
  const dataSaver = strings(payload.chapter?.dataSaver);
  const base = new URL(baseUrl);
  if (base.protocol !== "https:" || !hash || !data.length || !dataSaver.length) throw new Error("MangaDex returned an unusable image manifest.");
  const manifest = { expiresAt: Date.now() + 14 * 60 * 1000, baseUrl: base.toString().replace(/\/$/, ""), hash, data, dataSaver };
  manifestCache.set(chapterId, manifest);
  return manifest;
}

export async function getMangaDexManifest(chapterId: string, quality: "data" | "data-saver"): Promise<MangaDexManifest> {
  const manifest = await loadManifest(chapterId);
  return { chapterId, quality, pageCount: quality === "data" ? manifest.data.length : manifest.dataSaver.length };
}

export function readerImagePath(chapterId: string, pageIndex: number, quality: "data" | "data-saver") { return `/api/mangadex/page/${chapterId}/${pageIndex}?quality=${quality}`; }

export async function proxyMangaDexPage(request: Request, response: Response) {
  const chapterId = request.params.chapterId;
  const pageIndex = Number.parseInt(request.params.pageIndex, 10);
  const quality = request.query.quality === "data" ? "data" : "data-saver";
  if (!UUID_PATTERN.test(chapterId) || !Number.isInteger(pageIndex) || pageIndex < 0) { response.status(400).json({ error: "Invalid reader page request." }); return; }
  try {
    const manifest = await loadManifest(chapterId);
    const filename = (quality === "data" ? manifest.data : manifest.dataSaver)[pageIndex];
    if (!filename) { response.status(404).json({ error: "Reader page not found." }); return; }
    const imageUrl = new URL(`${quality}/${manifest.hash}/${encodeURIComponent(filename)}`, `${manifest.baseUrl}/`);
    const upstream = await fetch(imageUrl, { headers: MANGADEX_HEADERS, signal: AbortSignal.timeout(18_000) });
    if (!upstream.ok || !upstream.body) { response.status(upstream.status || 502).json({ error: "MangaDex image request failed." }); return; }
    response.setHeader("Content-Type", upstream.headers.get("content-type") || "image/jpeg");
    response.setHeader("Cache-Control", "private, max-age=600");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.status(200).send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    response.status(502).json({ error: error instanceof Error ? error.message : "MangaDex reader is unavailable." });
  }
}
