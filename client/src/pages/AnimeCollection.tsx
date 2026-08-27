/**
 * Midnight Editorial design reminder: archive controls are a compact research desk, not generic dashboard chrome.
 * Filters should narrow a living film index while poster art, story annotations, and ranked pacing remain primary.
 */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, CircleAlert, LoaderCircle, Search, SlidersHorizontal, X } from "lucide-react";
import { Link, useRoute } from "wouter";
import { COLLECTIONS, type ArchiveFilters, type ArchiveFormat, type ArchiveSeason, type ArchiveStatus, type CollectionKey, fetchAnimeCollection } from "@/hooks/useAnimeCollections";
import type { Anime } from "@/hooks/useTrendingAnime";
import "./AnimeCollection.css";

const BRAND_MARK = "/anima-brand-mark_e15d6eac.png";
const VALID_COLLECTIONS = new Set<CollectionKey>(["seasonal", "upcoming", "popular", "top"]);
const GENRES = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mahou Shoujo", "Mecha", "Mystery", "Psychological", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller"];
const YEAR_OPTIONS = Array.from({ length: 27 }, (_, index) => new Date().getUTCFullYear() - index);

const SEASON_OPTIONS: Array<{ value: ArchiveSeason; label: string }> = [{ value: "WINTER", label: "Winter" }, { value: "SPRING", label: "Spring" }, { value: "SUMMER", label: "Summer" }, { value: "FALL", label: "Fall" }];
const STATUS_OPTIONS: Array<{ value: ArchiveStatus; label: string }> = [{ value: "RELEASING", label: "Airing" }, { value: "FINISHED", label: "Finished" }, { value: "NOT_YET_RELEASED", label: "Not yet released" }];
const FORMAT_OPTIONS: Array<{ value: ArchiveFormat; label: string }> = [{ value: "TV", label: "TV show" }, { value: "TV_SHORT", label: "TV short" }, { value: "MOVIE", label: "Movie" }, { value: "OVA", label: "OVA" }, { value: "ONA", label: "ONA" }, { value: "SPECIAL", label: "Special" }];

function titleOf(anime: Anime) { return anime.title.userPreferred || anime.title.english || anime.title.romaji || "Untitled story"; }
function formatLabel(value?: string | null) { return value ? value.replace(/_/g, " ") : "ANIME"; }
function storyNote(value?: string | null) { if (!value) return "A leading title in this living archive."; const cleaned = value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(); return cleaned.length > 158 ? `${cleaned.slice(0, 158).trimEnd()}…` : cleaned; }
function activeFilterCount(filters: ArchiveFilters) { return Object.values(filters).filter((value) => value !== undefined && value !== "").length; }

function CollectionCard({ anime, index, isLead }: { anime: Anime; index: number; isLead: boolean }) {
  const image = anime.coverImage?.extraLarge || anime.coverImage?.large;
  return <Link href={`/anime/${anime.id}`} className={`collection-card ${isLead ? "collection-card--lead" : ""}`} aria-label={`Open details for ${titleOf(anime)}`}><span className="collection-card__rank">{String(index).padStart(2, "0")}</span><div className="collection-card__art">{image ? <img src={image} alt="" loading="lazy" /> : <div className="collection-card__fallback" />}<span className="collection-card__score"><b>{anime.averageScore ?? "—"}</b><small>index</small></span></div><div className="collection-card__copy"><p>File {formatLabel(anime.format)} · {anime.episodes ? `${anime.episodes} episodes` : anime.status?.replace(/_/g, " ") || "airing"}</p><h2>{titleOf(anime)}</h2><span>{anime.genres?.filter(Boolean).slice(0, 2).join(" · ") || "Fresh signal"}</span>{isLead && <p className="collection-card__note">{storyNote(anime.description)}</p>}</div></Link>;
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) { return <label className="archive-filter-field"><span>{label}</span>{children}</label>; }
const INTERLUDES: Record<CollectionKey, { label: string; title: string; note: string }> = {
  seasonal: { label: "Live seasonal bulletin", title: "The conversation is still moving.", note: "New broadcasts, late arrivals, and weekly favorites continue below." },
  upcoming: { label: "Horizon note", title: "The next frame is not fixed yet.", note: "Announcements gather here before a first episode makes the record real." },
  popular: { label: "Archive annotation", title: "Some stories remain in circulation.", note: "These titles continue their long exchange with audiences around the world." },
  top: { label: "Canon marker", title: "A record kept by the score.", note: "The next sequence returns to the highest-rated works in the index." },
};
function ArchiveInterlude({ collection, nextRank }: { collection: CollectionKey; nextRank: number }) { const entry = INTERLUDES[collection]; return <aside className={`collection-interlude collection-interlude--${collection}`}><span>{entry.label}</span><b>{String(nextRank).padStart(2, "0")}</b><div><h3>{entry.title}</h3><p>{entry.note}</p></div></aside>; }

export default function AnimeCollectionPage() {
  const [, params] = useRoute("/collection/:collection");
  const collection = params?.collection as CollectionKey;
  const isValid = VALID_COLLECTIONS.has(collection);
  const definition = isValid ? COLLECTIONS[collection] : null;
  const [anime, setAnime] = useState<Anime[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftFilters, setDraftFilters] = useState<ArchiveFilters>({});
  const [activeFilters, setActiveFilters] = useState<ArchiveFilters>({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const pendingPageRef = useRef<number | null>(null);
  const queryVersionRef = useRef(0);

  const load = useCallback(async (targetPage: number, append: boolean, signal?: AbortSignal, queryVersion = queryVersionRef.current) => {
    if (!isValid || (append && pendingPageRef.current === targetPage)) return;
    if (append) pendingPageRef.current = targetPage;
    if (append) setIsLoadingMore(true); else setIsLoading(true);
    setError(null);
    try {
      const result = await fetchAnimeCollection(collection, targetPage, 48, activeFilters, signal);
      if (queryVersion !== queryVersionRef.current) return;
      setAnime((current) => { if (!append) return result.anime; const knownIds = new Set(current.map((item) => item.id)); return [...current, ...result.anime.filter((item) => !knownIds.has(item.id))]; });
      setPage(targetPage);
      setHasNextPage(Boolean(result.pageInfo.hasNextPage));
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "This archive could not be opened right now.");
    } finally {
      if (append) pendingPageRef.current = null;
      if (!signal?.aborted) { setIsLoading(false); setIsLoadingMore(false); }
    }
  }, [activeFilters, collection, isValid]);

  useEffect(() => { const controller = new AbortController(); const queryVersion = ++queryVersionRef.current; void load(1, false, controller.signal, queryVersion); return () => controller.abort(); }, [load]);

  const loadNextPage = useCallback(() => { if (!hasNextPage || isLoading || isLoadingMore || error) return; void load(page + 1, true); }, [error, hasNextPage, isLoading, isLoadingMore, load, page]);
  useEffect(() => { const sentinel = sentinelRef.current; if (!sentinel || !hasNextPage || isLoading || error || typeof IntersectionObserver === "undefined") return; const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) loadNextPage(); }, { rootMargin: "520px 0px" }); observer.observe(sentinel); return () => observer.disconnect(); }, [error, hasNextPage, isLoading, loadNextPage]);

  const loadedLabel = useMemo(() => new Intl.NumberFormat("en").format(anime.length), [anime.length]);
  const filtersApplied = activeFilterCount(activeFilters);
  const scopeNote = collection === "seasonal" ? "This archive opens on the current season; season or year changes deliberately move the lens." : collection === "upcoming" ? "This archive opens on the next season; a status, season, or year change deliberately moves the lens." : "Every filter narrows this collection while its original popularity or score order remains intact.";
  const changeFilter = <K extends keyof ArchiveFilters>(key: K, value: ArchiveFilters[K] | "") => setDraftFilters((current) => ({ ...current, [key]: value === "" ? undefined : value }));
  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); setActiveFilters({ ...draftFilters, search: draftFilters.search?.trim() || undefined }); };
  const clearFilters = () => { setDraftFilters({}); setActiveFilters({}); };
  if (!definition) return <main className="collection-error"><Link href="/" className="detail-back"><ArrowLeft size={17} /> Return to the live index</Link><h1>This archive does not exist.</h1></main>;

  return <div className={`anima-page collection-page collection-page--${collection}`}><header className="detail-header"><Link href="/" className="brand" aria-label="Return to Anima home"><img src={BRAND_MARK} alt="" className="brand__mark" /><span className="brand__name">ANIMA</span></Link><Link href="/" className="detail-back"><ArrowLeft size={17} /> The live index</Link></header><main className="collection-main"><section className="collection-hero"><aside className="collection-hero__index"><span>ARC</span><b>{definition.key === "seasonal" ? "01" : definition.key === "upcoming" ? "02" : definition.key === "popular" ? "03" : "04"}</b></aside><div><p className="section-heading__eyebrow">{definition.eyebrow}</p><h1>{definition.title}</h1><p>{definition.description}</p></div><div className="collection-hero__count"><strong>{loadedLabel}</strong><span>titles opened</span></div></section><section className="archive-filter-desk" aria-labelledby="filter-title"><div className="archive-filter-desk__heading"><p className="section-heading__eyebrow"><SlidersHorizontal size={14} /> Research desk</p><h2 id="filter-title">Shape the<br /><em>archive.</em></h2><p>Search within this collection, then narrow the surrounding signal.</p></div><form className="archive-filter-form" onSubmit={applyFilters}><p className="archive-filter-form__scope" id="filter-scope">{scopeNote}</p><FilterField label="Search this archive"><span className="archive-search"><Search size={17} /><input value={draftFilters.search || ""} onChange={(event) => changeFilter("search", event.target.value)} placeholder="Title or keyword" aria-describedby="filter-scope" /></span></FilterField><div className="archive-filter-form__selects"><FilterField label="Genre"><select value={draftFilters.genre || ""} onChange={(event) => changeFilter("genre", event.target.value)}><option value="">Any genre</option>{GENRES.map((genre) => <option key={genre} value={genre}>{genre}</option>)}</select></FilterField><FilterField label="Year"><select value={draftFilters.year || ""} onChange={(event) => changeFilter("year", event.target.value ? Number(event.target.value) : "")}><option value="">Any year</option>{YEAR_OPTIONS.map((year) => <option key={year} value={year}>{year}</option>)}</select></FilterField><FilterField label="Status"><select value={draftFilters.status || ""} onChange={(event) => changeFilter("status", event.target.value as ArchiveStatus)}><option value="">Any status</option>{STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></FilterField><FilterField label="Season"><select value={draftFilters.season || ""} onChange={(event) => changeFilter("season", event.target.value as ArchiveSeason)}><option value="">Any season</option>{SEASON_OPTIONS.map((season) => <option key={season.value} value={season.value}>{season.label}</option>)}</select></FilterField><FilterField label="Format"><select value={draftFilters.format || ""} onChange={(event) => changeFilter("format", event.target.value as ArchiveFormat)}><option value="">Any format</option>{FORMAT_OPTIONS.map((format) => <option key={format.value} value={format.value}>{format.label}</option>)}</select></FilterField></div><div className="archive-filter-form__actions"><button type="submit" className="button button--signal"><Search size={16} /> Search archive</button>{filtersApplied > 0 && <button type="button" className="archive-filter-reset" onClick={clearFilters}><X size={15} /> Clear {filtersApplied} {filtersApplied === 1 ? "filter" : "filters"}</button>}</div></form></section>{error ? <div className="collection-message"><CircleAlert size={22} /><div><strong>The archive stayed closed.</strong><p>{error}</p></div><button type="button" className="button button--signal" onClick={() => void load(1, false)}>Try again</button></div> : <><div className="archive-results-caption" aria-live="polite"><span>{filtersApplied ? `${filtersApplied} active ${filtersApplied === 1 ? "filter" : "filters"}` : "Unfiltered collection"}</span><p>{isLoading ? "Re-indexing the archive…" : `${loadedLabel} titles match this reading.`}</p></div><section className="collection-grid" aria-live="polite" aria-busy={isLoading || isLoadingMore}>{isLoading ? Array.from({ length: 12 }, (_, index) => <div key={index} className={`collection-card collection-card--skeleton ${index === 0 ? "collection-card--skeleton-lead" : ""}`}><span>{String(index + 1).padStart(2, "0")}</span><div /><i /></div>) : anime.map((item, index) => <Fragment key={item.id}><CollectionCard anime={item} index={index + 1} isLead={index === 0} />{[7, 23, 39].includes(index) && index < anime.length - 1 && <ArchiveInterlude collection={collection} nextRank={index + 2} />}</Fragment>)}</section>{!isLoading && anime.length === 0 && <section className="archive-empty-results"><Search size={27} /><p className="section-heading__eyebrow">No signal found</p><h2>Nothing meets<br /><em>this brief.</em></h2><p>Broaden one of the filters or start over with the full archive.</p><button type="button" className="text-button" onClick={clearFilters}>Reset the archive <ArrowUpRight size={17} /></button></section>}{hasNextPage && !isLoading && anime.length > 0 && <div ref={sentinelRef} className="collection-load-more" role="status" aria-live="polite"><p>{isLoadingMore ? "Opening the next chapter…" : "More filtered titles appear as you reach the end of this chapter."}</p><button type="button" className="button button--signal" onClick={loadNextPage} disabled={isLoadingMore}>{isLoadingMore ? <><LoaderCircle className="spin-icon" size={17} /> Opening more</> : <>Open more now <ArrowUpRight size={17} /></>}</button></div>}{!hasNextPage && anime.length > 0 && !isLoading && <p className="collection-end-note">End of this living archive.</p>}</>}</main><footer className="site-footer"><div className="site-footer__brand"><img src={BRAND_MARK} alt="" /><span>ANIMA</span></div><p>A living archive, ordered through the story you want to find.</p><a href="https://anilist.co" target="_blank" rel="noreferrer">Data from AniList <ArrowUpRight size={15} /></a></footer></div>;
}
