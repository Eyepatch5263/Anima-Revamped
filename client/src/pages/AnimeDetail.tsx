/**
 * Midnight Editorial design reminder: a detail page should feel like reading a feature, not opening a dashboard.
 * Build with oversized type, vertical cutlines, cinematic artwork, and compact factual annotations.
 */
import { ArrowLeft, ArrowUpRight, Bookmark, Check, CircleAlert, ExternalLink, Film, GitBranch, LoaderCircle, Sparkles, Users } from "lucide-react";
import { Link, useRoute } from "wouter";
import { type AnimeDetail, type RelatedAnime, useAnimeDetail } from "@/hooks/useAnimeDetail";
import { useWatchlist } from "@/hooks/useWatchlist";

const BRAND_MARK = "/anima-brand-mark_e15d6eac.png";

function titleOf(anime: AnimeDetail) {
  return anime.title.userPreferred || anime.title.english || anime.title.native || "Untitled story";
}

function relatedTitle(anime: RelatedAnime) {
  return anime.title.userPreferred || anime.title.english || anime.title.native || "Untitled story";
}

function detailText(value?: string | null) {
  return value ? value.replace(/_/g, " ") : "—";
}

function stripHtml(value?: string | null) {
  return (value || "No official synopsis is available for this story yet.").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function trailerUrl(anime: AnimeDetail) {
  if (!anime.trailer?.id || !anime.trailer.site) return null;
  if (anime.trailer.site.toLowerCase() === "youtube") return `https://www.youtube.com/embed/${anime.trailer.id}`;
  return null;
}

function RelationCard({ anime, relation, index }: { anime: RelatedAnime; relation: string; index: number }) {
  const image = anime.coverImage?.extraLarge || anime.coverImage?.large;
  return <Link href={`/anime/${anime.id}`} className="relation-card" aria-label={`Open ${relation.toLowerCase()} ${relatedTitle(anime)}`}><div className="relation-card__art">{image ? <img src={image} alt="" loading="lazy" /> : <div className="relation-card__fallback" />}<span>{String(index + 1).padStart(2, "0")}</span></div><div className="relation-card__copy"><p>{relation.replace(/_/g, " ")}</p><h3>{relatedTitle(anime)}</h3><span>{anime.format ? detailText(anime.format) : "Anime"}{anime.episodes ? ` · ${anime.episodes} EPS` : ""}</span></div></Link>;
}

function RecommendationCard({ anime, rating, index }: { anime: RelatedAnime; rating?: number | null; index: number }) {
  const image = anime.coverImage?.extraLarge || anime.coverImage?.large;
  return <Link href={`/anime/${anime.id}`} className="recommendation-card" aria-label={`Open recommended anime ${relatedTitle(anime)}`}><div className="recommendation-card__rank">{String(index + 1).padStart(2, "0")}</div><div className="recommendation-card__art">{image ? <img src={image} alt="" loading="lazy" /> : <div className="recommendation-card__fallback" />}<span><b>{anime.averageScore ?? "—"}</b><small>index</small></span></div><div className="recommendation-card__copy"><h3>{relatedTitle(anime)}</h3><p>{anime.genres?.filter(Boolean).slice(0, 2).join(" · ") || (rating ? `${rating} community signals` : "Suggested by AniList")}</p></div></Link>;
}

function LoadingDetail() {
  return (
    <main className="detail-loading" aria-live="polite">
      <Link href="/" className="detail-back"><ArrowLeft size={17} /> Back to the index</Link>
      <div className="detail-loading__spine"><span>00</span><p>STORY<br />FILE</p></div>
      <div className="detail-loading__artifact" aria-hidden="true"><div className="detail-loading__poster detail-loading__poster--rear" /><div className="detail-loading__poster detail-loading__poster--front"><img src={BRAND_MARK} alt="" /></div><i /></div>
      <div className="detail-loading__copy"><p className="section-heading__eyebrow">Archive signal</p><h1>Opening the<br /><em>story file.</em></h1><p>Collecting the people, places, and echoes around this title.</p><div className="detail-loading__status"><LoaderCircle className="detail-loading__spinner" /><span>AniList record in transit</span></div></div>
    </main>
  );
}

function ErrorDetail({ message, retry }: { message: string; retry: () => void }) {
  return (
    <main className="detail-loading detail-loading--error">
      <Link href="/" className="detail-back"><ArrowLeft size={17} /> Back to the index</Link>
      <div className="detail-loading__spine"><span>00</span><p>STORY<br />FILE</p></div>
      <div className="detail-loading__artifact detail-loading__artifact--closed" aria-hidden="true"><div className="detail-loading__poster detail-loading__poster--rear" /><div className="detail-loading__poster detail-loading__poster--front"><CircleAlert className="detail-loading__alert" /></div><i /></div>
      <div className="detail-loading__copy"><p className="section-heading__eyebrow">Archive interruption</p><h1>The file<br /><em>stayed closed.</em></h1><p>{message}</p><button type="button" className="button button--signal" onClick={retry}>Try the signal again <ArrowUpRight size={17} /></button></div>
    </main>
  );
}

export default function AnimeDetailPage() {
  const [, params] = useRoute("/anime/:id");
  const { anime, isLoading, error, retry } = useAnimeDetail(params?.id);
  const { isSaved, toggle } = useWatchlist();

  if (isLoading) return <LoadingDetail />;
  if (error || !anime) return <ErrorDetail message={error || "That anime record could not be found."} retry={retry} />;

  const cover = anime.coverImage?.extraLarge || anime.coverImage?.large;
  const trailer = trailerUrl(anime);
  const characters = anime.characters?.edges?.filter(Boolean) || [];
  const studios = anime.studios?.edges?.filter((edge) => edge?.node) || [];
  const relatedStories = (anime.relations?.edges || []).flatMap((edge) => edge?.node && edge.node.type === "ANIME" ? [{ anime: edge.node, relation: edge.relationType || "RELATED" }] : []).filter((entry, index, entries) => entries.findIndex((candidate) => candidate.anime.id === entry.anime.id) === index).slice(0, 6);
  const relatedIds = new Set(relatedStories.map((entry) => entry.anime.id));
  const recommendations = (anime.recommendations?.nodes || []).flatMap((entry) => entry?.mediaRecommendation && entry.mediaRecommendation.id !== anime.id && !relatedIds.has(entry.mediaRecommendation.id) ? [{ anime: entry.mediaRecommendation, rating: entry.rating }] : []).filter((entry, index, entries) => entries.findIndex((candidate) => candidate.anime.id === entry.anime.id) === index).slice(0, 6);
  const synopsis = stripHtml(anime.description).split(/\n\s*\n/);
  const saved = isSaved(anime.id);
  const watchlistEntry = {
    id: anime.id,
    title: titleOf(anime),
    coverImage: cover || null,
    averageScore: anime.averageScore || null,
    format: anime.format || null,
    episodes: anime.episodes || null,
    genres: (anime.genres?.filter(Boolean) || []) as string[],
  };

  return (
    <div className="anima-page detail-page">
      <header className="detail-header">
        <Link href="/" className="brand" aria-label="Return to Anima home"><img src={BRAND_MARK} alt="" className="brand__mark" /><span className="brand__name">ANIMA</span></Link>
        <Link href="/" className="detail-back"><ArrowLeft size={17} /> The live index</Link>
      </header>

      <main>
        <section className="detail-hero">
          <div className="detail-hero__backdrop" aria-hidden="true">
            {anime.bannerImage ? <img src={anime.bannerImage} alt="" /> : cover ? <img src={cover} alt="" /> : null}
            <div className="detail-hero__veil" />
          </div>
          <div className="detail-hero__meta-line"><span>01 / STORY FILE</span><span>{detailText(anime.season)} {anime.seasonYear || ""}</span></div>
          <div className="detail-hero__layout">
            <div className="detail-hero__poster">{cover ? <img src={cover} alt={`Cover art for ${titleOf(anime)}`} /> : <div className="detail-hero__poster-fallback" />}</div>
            <div className="detail-hero__copy">
              <p className="detail-hero__native">{anime.title.native}</p>
              <h1>{titleOf(anime)}</h1>
              <div className="detail-hero__facts">
                <span><b>{anime.averageScore ?? "—"}</b><small>index</small></span>
                <span>{detailText(anime.format)}</span>
                <span>{anime.episodes ? `${anime.episodes} episodes` : detailText(anime.status)}</span>
                {anime.duration && <span>{anime.duration} min</span>}
              </div>
              <div className="detail-hero__genres">{anime.genres?.filter(Boolean).map((genre) => <span key={genre}>{genre}</span>)}</div>
              <div className="detail-hero__actions"><button type="button" className={`button button--watchlist ${saved ? "button--watchlist-saved" : ""}`} onClick={() => toggle(watchlistEntry)}>{saved ? <><Check size={18} /> Saved to watchlist</> : <><Bookmark size={17} /> Add to watchlist</>}</button><a className="button button--signal" href={`https://anilist.co/anime/${anime.id}`} target="_blank" rel="noreferrer">Open on AniList <ArrowUpRight size={18} /></a></div>
            </div>
          </div>
        </section>

        <section className="detail-story" aria-labelledby="story-title">
          <aside className="detail-index"><span>02</span><p>THE<br />STORY</p></aside>
          <div className="detail-story__copy">
            <p className="section-heading__eyebrow">The premise</p>
            <h2 id="story-title">The whole<br /><em>signal.</em></h2>
            <div className="detail-story__prose">{synopsis.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
          </div>
          <div className="detail-story__notes">
            <dl><div><dt>Status</dt><dd>{detailText(anime.status)}</dd></div><div><dt>Popularity</dt><dd>{anime.popularity ? new Intl.NumberFormat("en", { notation: "compact" }).format(anime.popularity) : "—"}</dd></div><div><dt>Format</dt><dd>{detailText(anime.format)}</dd></div></dl>
          </div>
        </section>

        <section className="detail-trailer" aria-labelledby="trailer-title">
          <div className="detail-trailer__intro"><p className="section-heading__eyebrow">Moving image</p><h2 id="trailer-title">Watch the<br /><em>trailer.</em></h2><p>{trailer ? "A first look, directly from the official release channel." : "AniList has not attached an official trailer to this record."}</p></div>
          <div className="detail-trailer__frame">
            {trailer ? <iframe src={trailer} title={`${titleOf(anime)} trailer`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /> : <div className="detail-trailer__empty"><Film size={32} /><span>Trailer unavailable</span></div>}
          </div>
        </section>

        {relatedStories.length > 0 && <section className="detail-relations" aria-labelledby="relations-title"><aside className="detail-index"><span>03</span><p>THE<br />THREAD</p></aside><div className="detail-relations__body"><div className="detail-relations__heading"><div><p className="section-heading__eyebrow"><GitBranch size={14} /> In the same story</p><h2 id="relations-title">Follow the<br /><em>storyline.</em></h2></div><p>Prequels, sequels, and companion entries connected directly in the AniList record.</p></div><div className="relation-rail">{relatedStories.map((entry, index) => <RelationCard key={entry.anime.id} anime={entry.anime} relation={entry.relation} index={index} />)}</div></div></section>}

        <section className="detail-people" aria-labelledby="characters-title">
          <div className="detail-people__heading"><div><p className="section-heading__eyebrow">Faces and voices</p><h2 id="characters-title">Meet the<br /><em>characters.</em></h2></div><p>Selected cast information is supplied live by AniList.</p></div>
          <div className="character-rail">
            {characters.map((edge) => {
              const character = edge?.node;
              const actor = edge?.voiceActors?.[0];
              if (!character) return null;
              return <article key={character.id} className="character-card"><div className="character-card__image">{character.image?.large ? <img src={character.image.large} alt="" loading="lazy" /> : <Users size={28} />}</div><p className="character-card__role">{detailText(edge?.role)}</p><h3>{character.name?.full || character.name?.native || "Unknown character"}</h3><p className="character-card__actor">{actor?.name?.full ? `Voice: ${actor.name.full}` : "Voice casting not listed"}</p></article>;
            })}
          </div>
        </section>

        <section className="detail-studios" aria-labelledby="studios-title">
          <div><p className="section-heading__eyebrow">The makers</p><h2 id="studios-title">Studio<br /><em>credits.</em></h2></div>
          <div className="studio-list">{studios.length ? studios.map((edge, index) => <a key={edge?.node?.id || index} href={edge?.node?.siteUrl || `https://anilist.co/studio/${edge?.node?.id}`} target="_blank" rel="noreferrer"><span>{String(index + 1).padStart(2, "0")}</span><strong>{edge?.node?.name}</strong><ExternalLink size={17} /></a>) : <p>No studio credit is currently listed in AniList for this title.</p>}</div>
        </section>

        {recommendations.length > 0 && <section className="detail-recommendations" aria-labelledby="recommendations-title"><div className="detail-recommendations__intro"><p className="section-heading__eyebrow"><Sparkles size={14} /> Beyond this signal</p><h2 id="recommendations-title">You may also<br /><em>find these.</em></h2><p>Suggested from the community pathways around this title, supplied live by AniList.</p></div><div className="recommendation-grid">{recommendations.map((entry, index) => <RecommendationCard key={entry.anime.id} anime={entry.anime} rating={entry.rating} index={index} />)}</div></section>}
      </main>

      <footer className="site-footer"><div className="site-footer__brand"><img src={BRAND_MARK} alt="" /><span>ANIMA</span></div><p>Stories are better when you have time to meet the people behind them.</p><a href="https://anilist.co" target="_blank" rel="noreferrer">Data from AniList <ArrowUpRight size={15} /></a></footer>
    </div>
  );
}
