/** Midnight Editorial reader: a quiet, source-labelled reading room that treats each chapter as a live external record. */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookmarkCheck, BookOpenText, CircleAlert, Clapperboard, ListFilter, LoaderCircle, Search, Settings2 } from "lucide-react";
import { Link } from "wouter";
import { getMangaDexLastReadChapter, getMangaDexTitleIdFromSearch, resolveMangaDexLastReadChapter, saveMangaDexLastReadChapter } from "@/lib/mangaDexReadingProgress";
import { trpc } from "@/lib/trpc";
import "./MangaDexReader.css";

const BRAND_MARK = "/anima-brand-mark_e15d6eac.png";
type Quality = "data-saver" | "data";
type Chapter = { id: string; chapter: string; volume: string | null; title: string | null; language: string; pages: number; publishedAt: string | null };

function shortDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "Date unavailable";
}

function chapterLabel(chapter: Pick<Chapter, "chapter" | "volume" | "title">) {
  return `${chapter.volume ? `Vol. ${chapter.volume} · ` : ""}Ch. ${chapter.chapter}${chapter.title ? ` — ${chapter.title}` : ""}`;
}

function chapterSearchText(chapter: Chapter) {
  return `${chapter.chapter} ${chapter.volume || ""} ${chapter.title || ""} ${chapter.language}`.toLocaleLowerCase();
}

function ChapterLedger({ chapters, selectedChapterId, filter, onFilterChange, onSelect }: { chapters: Chapter[]; selectedChapterId: string | null; filter: string; onFilterChange: (value: string) => void; onSelect: (chapterId: string) => void }) {
  const visibleChapters = useMemo(() => {
    const needle = filter.trim().toLocaleLowerCase();
    return needle ? chapters.filter((chapter) => chapterSearchText(chapter).includes(needle)) : chapters;
  }, [chapters, filter]);

  return (
    <section className="md-chapter-ledger" aria-labelledby="chapter-ledger-title">
      <header className="md-ledger-heading">
        <div>
          <p className="section-heading__eyebrow"><ListFilter size={14} /> Complete chapter ledger</p>
          <h3 id="chapter-ledger-title">Every available<br /><em>English chapter.</em></h3>
        </div>
        <p>{visibleChapters.length === chapters.length ? `${chapters.length} source chapters` : `${visibleChapters.length} of ${chapters.length} chapters`}</p>
      </header>
      <label className="md-ledger-filter" htmlFor="chapter-filter">
        <Search size={16} />
        <span className="sr-only">Filter available chapters</span>
        <input id="chapter-filter" value={filter} onChange={(event) => onFilterChange(event.target.value)} placeholder="Filter by chapter, volume, or title" />
      </label>
      {visibleChapters.length ? (
        <div className="md-chapter-list" role="list">
          {visibleChapters.map((chapter, index) => (
            <article className={`md-chapter-row ${chapter.id === selectedChapterId ? "is-active" : ""}`} key={chapter.id} role="listitem">
              <span className="md-chapter-row__index">{String(index + 1).padStart(2, "0")}</span>
              <div className="md-chapter-row__main">
                <p>{chapter.volume ? `Volume ${chapter.volume}` : "Standalone chapter"} · {chapter.language.toUpperCase()}</p>
                <h4>Chapter {chapter.chapter}</h4>
                {chapter.title && <span>{chapter.title}</span>}
              </div>
              <div className="md-chapter-row__facts"><span>{chapter.pages} pages</span><span>{shortDate(chapter.publishedAt)}</span></div>
              <button type="button" onClick={() => onSelect(chapter.id)} aria-label={`Open ${chapterLabel(chapter)} in the reader`}>
                {chapter.id === selectedChapterId ? "Reading" : "Read"} <ArrowRight size={15} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="md-ledger-empty"><Search size={21} /><p>No chapter matches this ledger note. Clear the filter to return to every available chapter.</p></div>
      )}
    </section>
  );
}

export default function MangaDexReaderPage() {
  const [query, setQuery] = useState("Solo Leveling");
  const [submittedQuery, setSubmittedQuery] = useState("Solo Leveling");
  const [selectedMangaId, setSelectedMangaId] = useState<string | null>(() => getMangaDexTitleIdFromSearch(window.location.search));
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [chapterFilter, setChapterFilter] = useState("");
  const [quality, setQuality] = useState<Quality>("data-saver");
  const [resumedChapterId, setResumedChapterId] = useState<string | null>(null);

  const searchInput = useMemo(() => ({ query: submittedQuery }), [submittedQuery]);
  const search = trpc.mangaDex.search.useQuery(searchInput, { enabled: submittedQuery.trim().length >= 2, staleTime: 45_000, retry: false });

  useEffect(() => {
    if (search.data?.length && !selectedMangaId) setSelectedMangaId(search.data[0].id);
  }, [search.data, selectedMangaId]);

  const titleInput = useMemo(() => ({ id: selectedMangaId || "00000000-0000-4000-8000-000000000000" }), [selectedMangaId]);
  const title = trpc.mangaDex.title.useQuery(titleInput, { enabled: Boolean(selectedMangaId), staleTime: 60_000, retry: false });
  const chapters = trpc.mangaDex.chapters.useQuery(titleInput, { enabled: Boolean(selectedMangaId), staleTime: 45_000, retry: false });

  useEffect(() => {
    if (!selectedMangaId || !chapters.data?.length || selectedChapterId) return;
    const savedChapterId = getMangaDexLastReadChapter(selectedMangaId);
    const chapterId = resolveMangaDexLastReadChapter(chapters.data, savedChapterId);
    const savedChapterIsAvailable = savedChapterId === chapterId;
    setResumedChapterId(savedChapterIsAvailable ? savedChapterId : null);
    setSelectedChapterId(chapterId);
  }, [chapters.data, selectedChapterId, selectedMangaId]);

  const selectedChapter = chapters.data?.find((chapter) => chapter.id === selectedChapterId) || null;

  useEffect(() => {
    if (!selectedMangaId || !selectedChapterId || !selectedChapter || !title.data) return;
    saveMangaDexLastReadChapter(selectedMangaId, selectedChapterId, {
      title: title.data.title,
      chapterLabel: chapterLabel(selectedChapter),
      coverUrl: title.data.coverUrl || undefined,
    });
  }, [selectedChapter, selectedChapterId, selectedMangaId, title.data]);

  const manifestInput = useMemo(() => ({ chapterId: selectedChapterId || "00000000-0000-4000-8000-000000000000", quality }), [quality, selectedChapterId]);
  const manifest = trpc.mangaDex.manifest.useQuery(manifestInput, { enabled: Boolean(selectedChapterId), staleTime: 12 * 60_000, refetchOnWindowFocus: false });
  const pageIndexes = useMemo(() => Array.from({ length: manifest.data?.pageCount || 0 }, (_, index) => index), [manifest.data?.pageCount]);

  const selectManga = (id: string) => {
    setSelectedMangaId(id);
    setSelectedChapterId(null);
    setResumedChapterId(null);
    setChapterFilter("");
  };

  const selectChapter = (id: string) => {
    setSelectedChapterId(id);
    setResumedChapterId(null);
    window.requestAnimationFrame(() => document.getElementById("md-active-pages")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = query.trim();
    if (!next) return;
    setSelectedMangaId(null);
    setSelectedChapterId(null);
    setResumedChapterId(null);
    setChapterFilter("");
    setSubmittedQuery(next);
  };

  const activeChapterIndex = chapters.data?.findIndex((chapter) => chapter.id === selectedChapterId) ?? -1;
  const stepChapter = (direction: -1 | 1) => {
    const next = chapters.data?.[activeChapterIndex + direction];
    if (next) selectChapter(next.id);
  };

  return (
    <div className="anima-page md-reader-page">
      <header className="detail-header">
        <Link href="/" className="brand" aria-label="Return to Anima home"><img src={BRAND_MARK} alt="" className="brand__mark" /><span className="brand__name">ANIMA</span></Link>
        <div className="md-reader-header-links"><Link href="/manga" className="detail-back"><BookOpenText size={17} /> Manga index</Link><Link href="/library" className="detail-back"><Clapperboard size={17} /> My library</Link></div>
      </header>
      <main className="md-reader-main">
        <section className="md-reader-masthead">
          <aside><span>10</span><p>THE<br />READER</p></aside>
          <div><p className="section-heading__eyebrow"> Source: MangaDex</p><h1>Open the<br /><em>next page.</em></h1><p>Search the MangaDex catalog, choose an available English chapter, and read it here in a source-labelled reading room.</p></div>
        </section>
        <section className="md-search-desk" aria-labelledby="md-search-title">
          <div><p className="section-heading__eyebrow"><Search size={14} /> The source desk</p><h2 id="md-search-title">Find a<br /><em>title.</em></h2></div>
          <form onSubmit={submitSearch}>
            <label htmlFor="mangadex-search">Search MangaDex</label>
            <div><Search size={18} /><input id="mangadex-search" value={query} onChange={(event) => setQuery(event.target.value)} minLength={2} maxLength={100} placeholder="Solo Leveling" /><button type="submit" className="button button--signal" disabled={search.isFetching}><Search size={16} /> {search.isFetching ? "Searching" : "Search"}</button></div>
            <p>Only available English chapters from safe and suggestive records are surfaced in this reader.</p>
          </form>
        </section>
        <section className="md-reader-workspace" aria-label="MangaDex reading workspace">
          <aside className="md-results-pane">
            <div className="md-pane-heading"><p>Search results</p><span>{search.data?.length || 0} records</span></div>
            {search.isLoading ? <div className="md-result-skeletons">{Array.from({ length: 5 }, (_, index) => <div key={index}><i /><span /><b /></div>)}</div> : search.error ? <div className="md-pane-error"><CircleAlert size={20} /><p>{search.error.message}</p></div> : search.data?.length ? <div className="md-result-list">{search.data.map((item, index) => <button type="button" key={item.id} className={selectedMangaId === item.id ? "is-active" : ""} onClick={() => selectManga(item.id)}><span>{String(index + 1).padStart(2, "0")}</span>{item.coverUrl ? <img src={item.coverUrl} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <i />}<div><strong>{item.title}</strong><p>{item.year || "—"} · {item.status}</p><small>{item.tags.slice(0, 2).join(" · ") || "MangaDex record"}</small></div></button>)}</div> : <div className="md-pane-empty"><Search size={22} /><p>No readable record was found. Try another title.</p></div>}
          </aside>
          <section className="md-reading-pane">
            {title.isLoading || chapters.isLoading ? <div className="md-reading-loading"><LoaderCircle className="spin-icon" size={30} /><p>Opening the complete chapter ledger…</p></div> : title.error || chapters.error ? <div className="md-reading-error"><CircleAlert size={30} /><h2>The source record stayed closed.</h2><p>{title.error?.message || chapters.error?.message}</p></div> : title.data ? <>
              <header className="md-title-file"><div>{title.data.coverUrl ? <img src={title.data.coverUrl} alt="" referrerPolicy="no-referrer" /> : <i />}</div><div><p className="section-heading__eyebrow">MangaDex file · {title.data.status}</p><h2>{title.data.title}</h2><p>{title.data.authors.length ? `By ${title.data.authors.join(", ")}` : "Creator credit unavailable"}</p><span>{title.data.tags.slice(0, 4).join(" · ")}</span></div><a href={`https://mangadex.org/title/${title.data.id}`} target="_blank" rel="noreferrer">Open source <ArrowUpRight size={15} /></a></header>
              {chapters.data?.length ? <>
                <div className="md-chapter-bar">
                  <div><label htmlFor="md-chapter-select">Current chapter</label><select id="md-chapter-select" value={selectedChapterId || ""} onChange={(event) => selectChapter(event.target.value)}>{chapters.data.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapterLabel(chapter)}</option>)}</select></div>
                  <div className="md-quality"><span><Settings2 size={14} /> Image quality</span><button type="button" className={quality === "data-saver" ? "is-active" : ""} onClick={() => setQuality("data-saver")}>Data saver</button><button type="button" className={quality === "data" ? "is-active" : ""} onClick={() => setQuality("data")}>Original</button></div>
                  <p className="md-chapter-summary"><span>{selectedChapter ? `${selectedChapter.pages} pages · ${shortDate(selectedChapter.publishedAt)}` : "Choose a chapter"}</span>{selectedChapter && <span className="md-chapter-summary__memory"><BookmarkCheck size={13} /> {resumedChapterId === selectedChapter.id ? "Resumed locally" : "Saved locally"}</span>}</p>
                </div>
                <ChapterLedger chapters={chapters.data} selectedChapterId={selectedChapterId} filter={chapterFilter} onFilterChange={setChapterFilter} onSelect={selectChapter} />
                <section id="md-active-pages" className="md-reader-pages-section" aria-labelledby="active-pages-title">
                  <div className="md-reader-pages-section__heading"><p className="section-heading__eyebrow">Open chapter</p><h3 id="active-pages-title">{selectedChapter ? chapterLabel(selectedChapter) : "Select a chapter"}</h3></div>
                  {manifest.isLoading ? <div className="md-page-loader"><LoaderCircle className="spin-icon" size={25} /><span>Receiving page manifest from MangaDex…</span></div> : manifest.error ? <div className="md-reader-error"><CircleAlert size={25} /><p>{manifest.error.message}</p></div> : <div className="md-pages" aria-live="polite">{pageIndexes.map((index) => <figure className="md-page" key={index}><span>PAGE {String(index + 1).padStart(2, "0")}</span><img src={`/api/mangadex/page/${selectedChapterId}/${index}?quality=${quality}`} alt={`Page ${index + 1} of ${title.data.title}, ${selectedChapter ? chapterLabel(selectedChapter) : "selected chapter"}`} loading={index < 2 ? "eager" : "lazy"} onError={(event) => event.currentTarget.closest("figure")?.classList.add("is-unavailable")} /><figcaption>Source page {index + 1} of {pageIndexes.length}</figcaption></figure>)}</div>}
                </section>
              </> : <div className="md-reader-error"><BookOpenText size={28} /><p>No readable English chapters are currently available for this title.</p></div>}
              <footer className="md-reader-controls"><button type="button" onClick={() => stepChapter(-1)} disabled={activeChapterIndex <= 0}><ArrowLeft size={17} /> Previous chapter</button><span>{selectedChapter ? chapterLabel(selectedChapter) : "Select a chapter"}</span><button type="button" onClick={() => stepChapter(1)} disabled={!chapters.data || activeChapterIndex === chapters.data.length - 1}>Next chapter <ArrowRight size={17} /></button></footer>
            </> : <div className="md-reader-idle"><div className="md-idle-folio" aria-hidden="true"><span>FILE 10</span><b>—</b><i /><i /><i /><em>ANIMA · SOURCE READING ROOM</em></div><div><p className="section-heading__eyebrow">Waiting folio</p><h2>A volume waits<br /><em>to be opened.</em></h2><p>Select a source record to bring its available chapter ledger into this reading room.</p></div></div>}
          </section>
        </section>
      </main>
      <footer className="site-footer"><div className="site-footer__brand"><img src={BRAND_MARK} alt="" /><span>ANIMA</span></div><p>MangaDex chapters are requested live through the Anima reader.</p><a href="https://api.mangadex.org/docs/" target="_blank" rel="noreferrer">MangaDex API notes <ArrowUpRight size={15} /></a></footer>
    </div>
  );
}
