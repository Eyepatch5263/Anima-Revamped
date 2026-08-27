/**
 * Midnight Editorial design reminder: asymmetric editorial spine, calm ink surfaces, and poster art as the hero.
 * Every component reinforces curated discovery over a generic streaming-catalogue experience.
 */
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bookmark,
  Check,
  CircleAlert,
  Clock3,
  Compass,
  LoaderCircle,
  Menu,
  Play,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { COLLECTIONS, type CollectionKey, type CollectionPreviewState, useHomepageCollections } from "@/hooks/useAnimeCollections";
import { type Anime, useTrendingAnime } from "@/hooks/useTrendingAnime";
import { useMangaFavorites } from "@/hooks/useMangaFavorites";
import { useMangaDexContinueReading } from "@/hooks/useMangaDexContinueReading";
import { useWatchlist } from "@/hooks/useWatchlist";
import { trpc } from "@/lib/trpc";

const HERO_ART = "/anima-midnight-hero_8078e0a3.jpg";
const PAPER_TEXTURE = "/anima-paper-texture_044607fc.jpg";
const BRAND_MARK = "/anima-brand-mark_e15d6eac.png";
const READING_ROOM = "/anima-reading-room_790c079a.jpg";
const ARCHIVE_BANNER = "/anima-archive-banner.png";

function titleOf(anime: Anime) {
  return anime.title.userPreferred || anime.title.english || anime.title.romaji || "Untitled story";
}

function compactNumber(value?: number | null) {
  if (!value) return "—";
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function storyNote(value?: string | null, length = 130) {
  if (!value) return "The signal is changing. Open the story to see where it leads.";
  const clean = value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return clean.length > length ? `${clean.slice(0, length).trimEnd()}…` : clean;
}

function formatLabel(value?: string | null) {
  return value ? value.replace(/_/g, " ") : "ANIME";
}

function activityLabel(timestamp: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 2) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  return `Updated ${Math.floor(hours / 24)}d ago`;
}

function completionLabel(timestamp: number) {
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
  if (days === 0) return "Finished today";
  if (days === 1) return "Finished yesterday";
  return `Finished ${days}d ago`;
}

function PosterCard({ anime, rank }: { anime: Anime; rank: number }) {
  const image = anime.coverImage?.extraLarge || anime.coverImage?.large;
  const genres = anime.genres?.filter(Boolean).slice(0, 2) || [];
  const isLead = rank === 1;

  return (
    <Link
      className={`poster-card ${isLead ? "poster-card--lead" : ""}`}
      href={`/anime/${anime.id}`}
      aria-label={`Open details for ${titleOf(anime)}`}
    >
      <div className="poster-card__number" aria-hidden="true">{String(rank).padStart(2, "0")}</div>
      <div className="poster-card__image-wrap">
        {image ? <img src={image} alt="" className="poster-card__image" loading="lazy" /> : <div className="poster-card__fallback" />}
        <div className="poster-card__wash" />
        <div className="poster-card__open"><ArrowUpRight size={17} strokeWidth={1.7} /></div>
        <div className="poster-card__score"><b>{anime.averageScore ?? "—"}</b><small>index</small></div>
      </div>
      <div className="poster-card__copy">
        <p className="poster-card__eyebrow">{formatLabel(anime.format)} · {anime.episodes ? `${anime.episodes} EPS` : "AIRING"}</p>
        <h3>{titleOf(anime)}</h3>
        {isLead && <p className="poster-card__note">{storyNote(anime.description)}</p>}
        <p className="poster-card__genres">{genres.length ? genres.join(" · ") : "Fresh signal"}</p>
      </div>
    </Link>
  );
}

function PosterSkeleton({ index }: { index: number }) {
  return (
    <div className="poster-card poster-card--skeleton" aria-hidden="true">
      <div className="poster-card__number">{String(index).padStart(2, "0")}</div>
      <div className="poster-card__image-wrap poster-card__image-wrap--skeleton" />
      <div className="poster-card__copy">
        <span className="skeleton-line skeleton-line--short" />
        <span className="skeleton-line" />
        <span className="skeleton-line skeleton-line--mid" />
      </div>
    </div>
  );
}

function ContinueWatchingCard({ item, index }: { item: ReturnType<typeof useWatchlist>["items"][number]; index: number }) {
  const progressPercent = item.episodes ? Math.min(100, (item.progress / item.episodes) * 100) : 0;

  return (
    <Link className="continue-card" href={`/anime/${item.id}`} aria-label={`Continue watching ${item.title}`}>
      <div className="continue-card__art">
        {item.coverImage ? <img src={item.coverImage} alt="" loading="lazy" /> : <div className="continue-card__fallback" />}
        <div className="continue-card__veil" />
        <span className="continue-card__rank">{String(index + 1).padStart(2, "0")}</span>
        <span className="continue-card__play"><Play size={17} fill="currentColor" /></span>
      </div>
      <div className="continue-card__copy">
        <p><Clock3 size={13} /> {activityLabel(item.lastActivityAt)}</p>
        <h3>{item.title}</h3>
        <div className="continue-card__progress"><span><b>{item.progress}</b>{item.episodes ? ` / ${item.episodes} episodes` : " episodes logged"}</span><i><em style={{ width: `${progressPercent}%` }} /></i></div>
      </div>
    </Link>
  );
}

function ContinueReadingCard({ item, index }: { item: ReturnType<typeof useMangaDexContinueReading>["items"][number]; index: number }) {
  const mangaTitleQuery = trpc.mangaDex.title.useQuery({ id: item.mangaId }, { enabled: !item.coverUrl, staleTime: 300_000, retry: false });
  const coverImage = item.coverUrl || mangaTitleQuery.data?.coverUrl;

  return (
    <Link className="continue-card continue-card--manga" href={`/reader?title=${encodeURIComponent(item.mangaId)}`} aria-label={`Continue reading ${item.title} at ${item.chapterLabel}`}>
      <div className="continue-card__art">
        {coverImage ? <img src={coverImage} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <div className="continue-card__fallback" />}
        <div className="continue-card__veil" />
        <span className="continue-card__rank">{String(index + 1).padStart(2, "0")}</span>
        <span className="continue-card__play"><Play size={17} fill="currentColor" /></span>
      </div>
      <div className="continue-card__copy">
        <p><Clock3 size={13} /> Read {activityLabel(item.savedAt).replace("Updated ", "")}</p>
        <h3>{item.title}</h3>
        <div className="continue-card__chapter"><span>Last chapter</span><b>{item.chapterLabel}</b></div>
      </div>
    </Link>
  );
}

function RecentlyCompletedCard({ item, index }: { item: ReturnType<typeof useWatchlist>["items"][number]; index: number }) {
  return (
    <Link className="completed-card" href={`/anime/${item.id}`} aria-label={`Revisit ${item.title}`}>
      <div className="completed-card__art">{item.coverImage ? <img src={item.coverImage} alt="" loading="lazy" /> : <div className="completed-card__fallback" />}<span>{String(index + 1).padStart(2, "0")}</span><i><Check size={16} /></i></div>
      <div className="completed-card__copy"><p>{item.completedAt ? completionLabel(item.completedAt) : "Recently finished"}</p><h3>{item.title}</h3><span>{item.episodes ? `${item.episodes} / ${item.episodes} episodes` : "Series complete"}</span></div>
    </Link>
  );
}

function CollectionPreviewCard({ anime, index }: { anime: Anime; index: number }) {
  const image = anime.coverImage?.extraLarge || anime.coverImage?.large;
  return <Link href={`/anime/${anime.id}`} className="discovery-card" aria-label={`Open details for ${titleOf(anime)}`}><div className="discovery-card__art">{image ? <img src={image} alt="" loading="lazy" /> : <div className="discovery-card__fallback" />}<span>{String(index + 1).padStart(2, "0")}</span><i><b>{anime.averageScore ?? "—"}</b><small>index</small></i></div><div className="discovery-card__copy"><p>{formatLabel(anime.format)} · {anime.episodes ? `${anime.episodes} EPS` : anime.status?.replace(/_/g, " ") || "AIRING"}</p><h3>{titleOf(anime)}</h3><span>{anime.genres?.filter(Boolean).slice(0, 2).join(" · ") || "Fresh signal"}</span></div></Link>;
}

function DiscoveryRail({ collection, number, state }: { collection: CollectionKey; number: string; state: CollectionPreviewState }) {
  const { anime, isLoading, error, retry } = state;
  const definition = COLLECTIONS[collection];
  return (
    <section id={collection} className={`discovery-rail discovery-rail--${collection}`} aria-labelledby={`${collection}-title`}>
      <div className="discovery-rail__index">
        <span>{number}</span>
        <p>{definition.railLabel.split(" ").slice(0, 2).join("\n")}</p>
      </div>
      <div className="discovery-rail__body">
        <div className="discovery-rail__heading">
          <div>
            <p className="section-heading__eyebrow">{definition.eyebrow}</p>
            <h2 id={`${collection}-title`}>{definition.title}</h2>
          </div>
          <Link href={`/collection/${collection}`} className="text-button">View all <ArrowUpRight size={17} /></Link>
        </div>
        {error ? (
          <div className="collection-preview-error">
            <CircleAlert size={18} />
            <p>{error}</p>
            <button type="button" onClick={retry}>Retry</button>
          </div>
        ) : (
          <div className="discovery-rail__cards">
            {isLoading
              ? Array.from({ length: 6 }, (_, index) => <div key={index} className="discovery-card discovery-card--skeleton"><div /><i /><span /></div>)
              : anime.map((item, index) => <CollectionPreviewCard key={item.id} anime={item} index={index + 1} />)}
          </div>
        )}
      </div>
    </section>
  );
}

const PRESET_QUERIES = [
  { label: "Rainy Cyberpunk Mystery", keywords: ["Cyberpunk", "Psychological", "Action", "Sci-Fi"] },
  { label: "Cozy Kyoto Slice of Life", keywords: ["Slice of Life", "Comedy", "Romance"] },
  { label: "Psychological Mind Games", keywords: ["Psychological", "Thriller", "Mystery"] },
  { label: "Dark Fantasy & Revenge", keywords: ["Fantasy", "Action", "Drama"] },
  { label: "Melancholic Space Odyssey", keywords: ["Sci-Fi", "Drama", "Adventure"] },
];

function SemanticRecommendationEngine({ allAnime }: { allAnime: Anime[] }) {
  const [, setLocation] = useLocation();
  const [promptText, setPromptText] = useState("Rainy Cyberpunk Mystery");
  const [activePreset, setActivePreset] = useState<string | null>("Rainy Cyberpunk Mystery");
  const [activeKeywords, setActiveKeywords] = useState<string[]>(["Cyberpunk", "Psychological", "Action"]);

  const handleApplyPreset = (preset: typeof PRESET_QUERIES[number]) => {
    setActivePreset(preset.label);
    setPromptText(preset.label);
    setActiveKeywords(preset.keywords);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocation("/recommendations");
  };

  const matchedAnime = useMemo(() => {
    if (!allAnime || !allAnime.length) return [];
    return allAnime.filter(item => {
      const text = `${item.title?.userPreferred || ""} ${item.title?.english || ""} ${item.genres?.join(" ") || ""} ${item.description || ""}`.toLowerCase();
      return activeKeywords.some(kw => text.includes(kw.toLowerCase()));
    }).slice(0, 3);
  }, [allAnime, activeKeywords]);

  return (
    <section id="semantic-engine" className="feature-section" aria-label="AI Semantic Recommendation Engine">
      <div className="feature-art">
        <img src={READING_ROOM} alt="Illustrated AI neural reading room" />
        <span className="feature-art__mark"><Sparkles size={32} /></span>
        <div className="feature-art__badge">
          <span>08</span>
          <b>AI VECTOR ENGINE</b>
        </div>
      </div>
      
      <div className="feature-copy feature-copy--semantic">
        <p className="section-heading__eyebrow">Vector Neural Engine</p>
        <h2>Describe a vibe.<br /><em>Let vector AI find it.</em></h2>
        <p>Type any mood, aesthetic, narrative theme, or atmospheric prompt. Our semantic vector engine parses your natural language query to surface matching stories.</p>
        
        <form onSubmit={handleSubmit} className="semantic-prompt-box">
          <div className="semantic-prompt-input-wrapper">
            <Sparkles size={16} className="semantic-prompt-icon" />
            <input
              type="text"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="e.g. Rainy cyberpunk mystery with philosophical themes..."
              className="semantic-prompt-input"
            />
            <button type="submit" className="button button--signal semantic-prompt-btn">
              Launch Feature <ArrowUpRight size={15} />
            </button>
          </div>
        </form>

        <div className="semantic-presets">
          <span>Try a vector query prompt:</span>
          <div className="semantic-presets__pills">
            {PRESET_QUERIES.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={`semantic-preset-pill ${activePreset === preset.label ? "is-active" : ""}`}
                onClick={() => handleApplyPreset(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {matchedAnime.length > 0 && (
          <div className="semantic-results">
            <div className="semantic-results__header">
              <Sparkles size={14} />
              <span>Vector Matches for <b>“{activePreset || promptText}”</b></span>
            </div>
            <div className="semantic-results__grid">
              {matchedAnime.map((item, idx) => (
                <Link key={item.id} href={`/anime/${item.id}`} className="semantic-result-card">
                  <div className="semantic-result-card__art">
                    {item.coverImage?.large ? <img src={item.coverImage.large} alt="" /> : <div className="semantic-result-card__fallback" />}
                    <span className="semantic-match-score">{99 - idx * 3}% match</span>
                  </div>
                  <div className="semantic-result-card__info">
                    <h4>{item.title?.userPreferred || item.title?.english || "Anime story"}</h4>
                    <p>{item.genres?.slice(0, 2).join(" · ") || "Vector match"}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <aside className="genre-index semantic-vibe-index" aria-label="Semantic Clusters">
        <p>Semantic Clusters</p>
        <div>
          {PRESET_QUERIES.map((preset, index) => (
            <button key={preset.label} type="button" onClick={() => handleApplyPreset(preset)}>
              <span>{String(index + 1).padStart(2, "0")}</span>{preset.label}
            </button>
          ))}
        </div>
      </aside>
    </section>
  );
}

export default function Home() {
  const { anime, isLoading, error, retry } = useTrendingAnime();
  const { count: watchlistCount, items: watchlistItems } = useWatchlist();
  const { count: mangaFavoritesCount } = useMangaFavorites();
  const { items: continueReadingItems } = useMangaDexContinueReading();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const filteredAnime = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return anime;
    return anime.filter((item) => {
      const haystack = [titleOf(item), ...(item.genres || [])].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [anime, search]);

  const featured = anime[0];
  const heroPosters = anime.slice(0, 3);
  const genres = Array.from(new Set(anime.flatMap((item) => item.genres || []).filter(Boolean))).slice(0, 8) as string[];
  const continuingAnime = useMemo(() => watchlistItems.filter((item) => item.status === "WATCHING").sort((first, second) => second.lastActivityAt - first.lastActivityAt), [watchlistItems]);
  const recentlyCompletedAnime = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return watchlistItems.filter((item) => item.status === "COMPLETED" && item.completedAt !== null && item.completedAt >= cutoff).sort((first, second) => (second.completedAt || 0) - (first.completedAt || 0));
  }, [watchlistItems]);
  const homepageCollections = useHomepageCollections(6);

  const scrollToTrending = () => document.getElementById("trending")?.scrollIntoView({ behavior: "smooth" });
  const comingSoon = (feature: string) => toast(`${feature} is next in the Anima index.`, { icon: <Sparkles size={16} /> });

  return (
    <div className="anima-page" style={{ "--paper-texture": `url(${PAPER_TEXTURE})` } as React.CSSProperties}>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Anima home">
          <img src={BRAND_MARK} alt="" className="brand__mark" />
          <span className="brand__name">ANIMA</span>
        </a>

        <nav className={`desktop-nav ${menuOpen ? "desktop-nav--open" : ""}`} aria-label="Primary navigation">
          <button type="button" onClick={scrollToTrending}>Discover</button>
          <button type="button" onClick={scrollToTrending}>Trending</button>
          <Link href="/manga" onClick={() => setMenuOpen(false)}>Manga</Link>
          <Link href="/reader" onClick={() => setMenuOpen(false)}>Reader</Link>
          <button type="button" onClick={() => comingSoon("Collections")}>Collections</button>
          <button type="button" onClick={() => comingSoon("The Journal")}>Journal</button>
        </nav>

        <div className="header-actions">
          <Link href="/library" className="header-list">
            <Bookmark size={16} /> <span>My library</span>{watchlistCount + mangaFavoritesCount > 0 && <b className="watchlist-count">{watchlistCount + mangaFavoritesCount}</b>}
          </Link>
          <button type="button" className="mobile-menu" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle navigation">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-section__art" aria-hidden="true">
            <img src={HERO_ART} alt="" />
            <div className="hero-section__veil" />
          </div>
          <div className="hero-section__content">
            <div className="hero-kicker"><span className="live-dot" /> Live cultural index <span>·</span> powered by AniList</div>
            <h1 id="hero-title">Follow the feeling.<br /><em>Find the story.</em></h1>
            <p className="hero-summary">A more considered way to discover anime: live signals, meaningful details, and artwork allowed to speak for itself.</p>
            <label className="search-field" htmlFor="anime-search">
              <Search size={18} aria-hidden="true" />
              <input
                id="anime-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search a story or mood"
                autoComplete="off"
              />
              {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search"><X size={15} /></button>}
            </label>
            <div className="hero-cta-row">
              <button type="button" className="button button--signal" onClick={scrollToTrending}>Read the signal <ArrowDownRight size={18} /></button>
              <button type="button" className="button button--quiet" onClick={() => comingSoon("Mood finder")}>Find by mood <Compass size={17} /></button>
            </div>
          </div>

          <div className="hero-section__gallery" aria-label="Current trending anime">
            <div className="hero-gallery__label"><span>Trending now</span><b>01—03</b></div>
            <div className="hero-gallery__posters">
              {isLoading ? [1, 2, 3].map((index) => <div key={index} className={`hero-poster hero-poster--${index} hero-poster--loading`} />) : heroPosters.map((item, index) => {
                const image = item.coverImage?.extraLarge || item.coverImage?.large;
                return (
                  <Link key={item.id} className={`hero-poster hero-poster--${index + 1}`} href={`/anime/${item.id}`}>
                    {image && <img src={image} alt={`Poster for ${titleOf(item)}`} />}
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  </Link>
                );
              })}
            </div>
            {featured && <p className="hero-gallery__caption">Leading today: <strong>{titleOf(featured)}</strong></p>}
          </div>
        </section>

        <section className="signal-strip" aria-label="Anima discovery promise">
          <span>Now indexing <b>{anime.length || "…"}</b> live signals</span>
          <span className="signal-strip__rule" />
          <span>Less noise. <i>More resonance.</i></span>
          <span className="signal-strip__rule" />
          <button type="button" onClick={() => comingSoon("Editorial picks")}>How Anima reads <ArrowUpRight size={15} /></button>
        </section>

        {continueReadingItems.length > 0 && <section className="continue-section continue-section--reading" aria-labelledby="continue-reading-title">
          <div className="section-index"><span>10</span><p>LIVE<br />PAGES</p></div>
          <div className="continue-section__body">
            <div className="section-heading continue-section__heading"><div><p className="section-heading__eyebrow">Your reading desk</p><h2 id="continue-reading-title">Return to<br /><em>the page.</em></h2></div><div className="section-heading__note"><span><Clock3 size={14} /> ordered by reading</span><p>Your most recent MangaDex chapters, kept locally on this device.</p></div></div>
            <img src={BRAND_MARK} alt="" className="continue-section__seal" aria-hidden="true" />
            <div className="continue-rail">{continueReadingItems.map((item, index) => <ContinueReadingCard key={item.mangaId} item={item} index={index} />)}</div>
            <Link href="/reader" className="text-button">Open the reading room <ArrowUpRight size={17} /></Link>
          </div>
        </section>}

        {continuingAnime.length > 0 && <section className="continue-section" aria-labelledby="continue-title">
          <div className="section-index"><span>01</span><p>KEEP<br />GOING</p></div>
          <div className="continue-section__body">
            <div className="section-heading continue-section__heading"><div><p className="section-heading__eyebrow">Your active shelf</p><h2 id="continue-title">Pick up where<br /><em>the story paused.</em></h2></div><div className="section-heading__note"><span><Clock3 size={14} /> ordered by activity</span><p>Each signal rises when you log another episode.</p></div></div>
            <img src={BRAND_MARK} alt="" className="continue-section__seal" aria-hidden="true" />
            <div className="continue-rail">{continuingAnime.map((item, index) => <ContinueWatchingCard key={item.id} item={item} index={index} />)}</div>
            <Link href="/watchlist" className="text-button">Open your whole shelf <ArrowUpRight size={17} /></Link>
          </div>
        </section>}

        {recentlyCompletedAnime.length > 0 && <section className="completed-section" aria-labelledby="completed-title">
          <div className="section-index"><span>02</span><p>THE<br />AFTERGLOW</p></div>
          <div className="completed-section__body"><div className="section-heading completed-section__heading"><div><p className="section-heading__eyebrow">The past seven days</p><h2 id="completed-title">Stories that<br /><em>stayed with you.</em></h2></div><div className="section-heading__note"><span><Check size={14} /> credits complete</span><p>A small record of the worlds you have just left behind.</p></div></div><div className="completed-rail">{recentlyCompletedAnime.map((item, index) => <RecentlyCompletedCard key={item.id} item={item} index={index} />)}</div><Link href="/watchlist" className="text-button">Revisit the completed shelf <ArrowUpRight size={17} /></Link></div>
        </section>}

        <section id="trending" className="trending-section" aria-labelledby="trending-title">
          <div className="section-index">
            <span>03</span>
            <p>THE<br />SIGNAL</p>
          </div>

          <div className="trending-section__body">
            <div className="section-heading">
              <div>
                <p className="section-heading__eyebrow">The live edit</p>
                <h2 id="trending-title">What everyone is<br /><em>moving toward.</em></h2>
              </div>
              <div className="section-heading__note">
                <span><Check size={14} /> refreshes from AniList</span>
                <p>Ranked by the current conversation, not a frozen archive.</p>
              </div>
            </div>

            {error ? (
              <div className="data-message data-message--error">
                <CircleAlert size={22} />
                <div><strong>The signal went quiet.</strong><p>{error}</p></div>
                <button type="button" className="button button--signal" onClick={retry}>Try again</button>
              </div>
            ) : (
              <>
                {search && <div className="search-result-line"><span>Showing {filteredAnime.length} matches for “{search}”</span><button type="button" onClick={() => setSearch("")}>Clear search</button></div>}
                <div className="trending-grid" aria-live="polite">
                  {isLoading
                    ? Array.from({ length: 8 }, (_, index) => <PosterSkeleton key={index} index={index + 1} />)
                    : filteredAnime.map((item, index) => <PosterCard key={item.id} anime={item} rank={index + 1} />)}
                </div>
                {!isLoading && filteredAnime.length === 0 && (
                  <div className="data-message data-message--empty"><Search size={21} /><div><strong>No exact signal found.</strong><p>Try an anime title, genre, or a little less of the phrase.</p></div></div>
                )}
              </>
            )}
          </div>
        </section>

        <section className="discovery-collections" aria-label="More ways to enter the Anima archive">
          <div className="discovery-collections__masthead">
            <div className="masthead-art">
              <img src={ARCHIVE_BANNER} alt="Floating manga pages and anime landscape under starry sky" />
              <div className="masthead-art__veil" />
              <div className="masthead-art__badge">
                <span>04—07</span>
                <b>FOUR ARCHIVES</b>
              </div>
            </div>
            <div className="masthead-copy">
              <p className="section-heading__eyebrow">Four more ways in</p>
              <h2>Follow a different<br /><em>kind of signal.</em></h2>
              <p>Four curated titles to begin with. Each archive opens into the complete living index when you are ready for deeper discovery.</p>
              <div className="masthead-quick-links">
                <a href="#seasonal"><span>04</span> Seasonal</a>
                <a href="#upcoming"><span>05</span> Upcoming</a>
                <a href="#popular"><span>06</span> Popular</a>
                <a href="#top"><span>07</span> Top rated</a>
              </div>
            </div>
          </div>
          <DiscoveryRail collection="seasonal" number="04" state={homepageCollections.seasonal} />
          <DiscoveryRail collection="upcoming" number="05" state={homepageCollections.upcoming} />
          <DiscoveryRail collection="popular" number="06" state={homepageCollections.popular} />
          <DiscoveryRail collection="top" number="07" state={homepageCollections.top} />
        </section>        <SemanticRecommendationEngine allAnime={anime} />
      </main>

      <footer className="site-footer">
        <div className="site-footer__brand"><img src={BRAND_MARK} alt="" /><span>ANIMA</span></div>
        <p>Anime discovery for viewers who want the story to find them.</p>
        <a href="https://anilist.co" target="_blank" rel="noreferrer">Data from AniList <ArrowUpRight size={15} /></a>
      </footer>
    </div>
  );
}
