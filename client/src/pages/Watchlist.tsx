/**
 * Midnight Editorial design reminder: saved anime should read as a personal annotated shelf, not a utility table.
 * Use wide negative space, compact metadata, and the same cutline language as the discovery index.
 */
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, Bookmark, ListFilter, Minus, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { type WatchStatus, useWatchlist } from "@/hooks/useWatchlist";

const BRAND_MARK = "/anima-brand-mark_e15d6eac.png";

type StatusFilter = "ALL" | WatchStatus;
type WatchlistSort = "RECENT" | "STATUS" | "PROGRESS" | "TITLE";

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All stories" },
  { value: "WATCHING", label: "Watching" },
  { value: "PLAN_TO_WATCH", label: "Plan to Watch" },
  { value: "COMPLETED", label: "Completed" },
];

const STATUS_ORDER: Record<WatchStatus, number> = { WATCHING: 0, PLAN_TO_WATCH: 1, COMPLETED: 2 };

function formatLabel(value?: string | null) {
  return value ? value.replace(/_/g, " ") : "ANIME";
}

export default function WatchlistPage() {
  const { items, remove, setProgress, setStatus } = useWatchlist();
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [sort, setSort] = useState<WatchlistSort>("RECENT");
  const filteredItems = useMemo(() => {
    const matches = filter === "ALL" ? items : items.filter((item) => item.status === filter);
    return [...matches].sort((first, second) => {
      if (sort === "TITLE") return first.title.localeCompare(second.title);
      if (sort === "STATUS") return STATUS_ORDER[first.status] - STATUS_ORDER[second.status] || first.title.localeCompare(second.title);
      if (sort === "PROGRESS") {
        const firstRatio = first.episodes ? first.progress / first.episodes : first.progress;
        const secondRatio = second.episodes ? second.progress / second.episodes : second.progress;
        return secondRatio - firstRatio || second.savedAt - first.savedAt;
      }
      return second.savedAt - first.savedAt;
    });
  }, [filter, items, sort]);
  const countFor = (value: StatusFilter) => value === "ALL" ? items.length : items.filter((item) => item.status === value).length;

  return (
    <div className="anima-page watchlist-page">
      <header className="detail-header">
        <Link href="/" className="brand" aria-label="Return to Anima home"><img src={BRAND_MARK} alt="" className="brand__mark" /><span className="brand__name">ANIMA</span></Link>
        <Link href="/library" className="detail-back"><ArrowLeft size={17} /> Full library</Link>
      </header>
      <main className="watchlist-main">
        <div className="watchlist-hero">
          <div className="watchlist-hero__index"><span>03</span><p>YOUR<br />SHELF</p></div>
          <div><p className="section-heading__eyebrow">Saved in this browser</p><h1>Your<br /><em>watchlist.</em></h1><p className="watchlist-hero__summary">A small shelf for the stories you want to meet on your own time. It stays on this device until you choose to remove it.</p></div>
          <div className="watchlist-hero__count"><Bookmark size={17} /><strong>{items.length}</strong><span>{items.length === 1 ? "story saved" : "stories saved"}</span></div>
        </div>

        {items.length ? (
          <>
            <section className="watchlist-controls" aria-label="Watchlist filters and sorting">
              <div className="watchlist-controls__summary"><p className="section-heading__eyebrow"><ListFilter size={14} /> Refine your shelf</p><span>Showing <strong>{filteredItems.length}</strong> of {items.length} saved</span></div>
              <div className="watchlist-controls__filters" role="group" aria-label="Filter saved anime by status">
                {FILTERS.map((option) => <button key={option.value} type="button" className={filter === option.value ? "is-active" : ""} onClick={() => setFilter(option.value)}>{option.label}<b>{countFor(option.value)}</b></button>)}
              </div>
              <label className="watchlist-controls__sort"><SlidersHorizontal size={15} /><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value as WatchlistSort)} aria-label="Sort saved anime"><option value="RECENT">Recently saved</option><option value="STATUS">Watch status</option><option value="PROGRESS">Episode progress</option><option value="TITLE">Title A–Z</option></select></label>
            </section>
            {filteredItems.length ? <section className="watchlist-shelf" aria-label="Filtered saved anime">
              {filteredItems.map((item, index) => {
              const complete = Boolean(item.episodes && item.progress >= item.episodes);
              const progressPercent = item.episodes ? Math.min(100, (item.progress / item.episodes) * 100) : 0;
              return (
                <article className="watchlist-card" key={item.id}>
                  <span className="watchlist-card__index">{String(index + 1).padStart(2, "0")}</span>
                  <Link href={`/anime/${item.id}`} className="watchlist-card__poster" aria-label={`Open details for ${item.title}`}>
                    {item.coverImage ? <img src={item.coverImage} alt="" loading="lazy" /> : <div className="watchlist-card__fallback" />}
                  </Link>
                  <div className="watchlist-card__copy"><p>{formatLabel(item.format)} · {item.episodes ? `${item.episodes} EPS` : "AIRING"}</p><Link href={`/anime/${item.id}`}><h2>{item.title}</h2></Link><span>{item.genres.slice(0, 3).join(" · ") || "Fresh signal"}</span></div>
                  <div className="watchlist-card__tracking">
                    <label><span>Watch status</span><select value={item.status} onChange={(event) => setStatus(item.id, event.target.value as WatchStatus)} aria-label={`Set watch status for ${item.title}`}><option value="PLAN_TO_WATCH">Plan to Watch</option><option value="WATCHING">Watching</option><option value="COMPLETED">Completed</option></select></label>
                    <div className="progress-control"><span>Episode progress</span><div><button type="button" onClick={() => setProgress(item.id, item.progress - 1)} disabled={item.progress <= 0} aria-label={`Decrease episode progress for ${item.title}`}><Minus size={13} /></button><strong>{item.progress}{item.episodes ? ` / ${item.episodes}` : " logged"}</strong><button type="button" onClick={() => setProgress(item.id, item.progress + 1)} disabled={complete} aria-label={`Increase episode progress for ${item.title}`}><Plus size={13} /></button></div><div className="progress-meter" aria-label={`${item.progress} of ${item.episodes || "unknown"} episodes watched`}><span style={{ width: `${progressPercent}%` }} /></div></div>
                  </div>
                  <div className="watchlist-card__actions"><span>{item.averageScore ? `${item.averageScore} / 100` : "Score pending"}</span><button type="button" onClick={() => remove(item.id)} aria-label={`Remove ${item.title} from your watchlist`}><Trash2 size={16} /> Remove</button><Link href={`/anime/${item.id}`} aria-label={`Open ${item.title}`}><ArrowUpRight size={18} /></Link></div>
                </article>
              );
              })}
            </section> : <section className="watchlist-filter-empty"><ListFilter size={28} /><p className="section-heading__eyebrow">No matching signals</p><h2>Nothing is<br /><em>{FILTERS.find((item) => item.value === filter)?.label.toLowerCase()}.</em></h2><p>Try another status to view a different part of your saved shelf.</p><button type="button" className="text-button" onClick={() => setFilter("ALL")}>Show all saved anime <ArrowUpRight size={17} /></button></section>}
          </>
        ) : (
          <section className="watchlist-empty">
            <div className="watchlist-empty__index"><span>04</span><p>THE<br />GAP</p></div>
            <div className="watchlist-empty__artifact" aria-hidden="true"><span className="watchlist-empty__artifact-label">Reserved story slot</span><div className="watchlist-empty__poster watchlist-empty__poster--rear" /><div className="watchlist-empty__poster watchlist-empty__poster--front"><Bookmark size={24} /></div><span className="watchlist-empty__artifact-rule" /></div>
            <div className="watchlist-empty__copy"><p className="section-heading__eyebrow">The shelf is clear</p><h2>Leave room for<br /><em>the next story.</em></h2><p>The archive is waiting. Follow a signal from the live index, then keep it here until the moment feels right.</p><Link href="/" className="button button--signal">Return to the live index <ArrowUpRight size={18} /></Link></div>
          </section>
        )}
      </main>
      <footer className="site-footer"><div className="site-footer__brand"><img src={BRAND_MARK} alt="" /><span>ANIMA</span></div><p>Your shelf, held privately in this browser.</p><Link href="/">Return to discovery <ArrowUpRight size={15} /></Link></footer>
    </div>
  );
}
