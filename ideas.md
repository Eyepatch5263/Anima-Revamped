# Anima Homepage Redesign — Design Exploration

## Three directions considered

### 1. Midnight Editorial
**Very Brief Intro:** A cinematic, magazine-inspired portal that treats each anime as a cultural artifact. The interface uses dramatic crops, confident type, and a quiet hierarchy that lets the artwork lead.

**Probability:** 0.07

### 2. Celestial Archive
**Very Brief Intro:** An atmospheric collection interface inspired by observatories and memory indexes. Deep ink, warm paper notes, and constellation-like metadata make discovery feel personal and intentional.

**Probability:** 0.03

### 3. Electric Signal
**Very Brief Intro:** A sharply energetic discovery dashboard with kinetic panels, bright signal colors, and technical visual language. It presents anime trends as a real-time cultural broadcast.

**Probability:** 0.09

---

## Chosen Direction: Midnight Editorial

### Design Movement
**Contemporary editorial design with neo-noir cinema language.** The site will feel more like a discerning culture journal than a conventional streaming catalogue, using scale, restraint, and cinematic framing to make discovery feel deliberate.

### Core Principles
1. **Art first, interface second:** Poster imagery supplies the color, emotion, and visual rhythm; interface surfaces remain quiet and highly legible.
2. **Asymmetric pacing:** Content moves through an off-centre editorial column, staggered poster rails, and large compositional pauses instead of uniform centred blocks.
3. **Evidence of curation:** Rankings, genre fragments, score, year, and format appear as compact, considered annotations rather than dense metadata.
4. **Intentional contrast:** Near-black ink, luminous ivory, and a tightly controlled coral accent create hierarchy without relying on generic gradients.

### Color Philosophy
The visual system begins with **Ink Black** to make full-colour anime art feel more saturated and cinematic. A soft **Bone White** provides editorial clarity for text and cards, while **Vermilion Signal** is reserved for active states, key actions, and selected rankings—giving Anima one memorable, unmistakable pulse rather than a rainbow of competing accents.

### Layout Paradigm
The homepage uses an **editorial spine**: a slim navigation layer sits above an oversized split hero. The left side holds the proposition and browsing controls; the right side is an angled showcase of live AniList posters. Trending content then spills into a wide horizontal rail, with a narrow index column that anchors section labels and ranking language. This avoids a generic grid-first catalogue layout.

### Signature Elements
1. **The Cutline:** thin vermilion rules and index numbering that frame major sections like a printed feature.
2. **Poster Stacks:** overlapping vertical poster strips with soft shadows and oversized ranking numerals.
3. **Story Notes:** small, readable editorial chips for genre, score, format, and current status.

### Interaction Philosophy
Interactions should reveal taste, not spectacle. Hovering a card elevates the poster by a few pixels, brightens its metadata, and reveals the story note. Clicking a genre or exploration control is direct and purposeful. Any unbuilt navigation destination will acknowledge intent without pretending the feature exists.

### Animation
Use quick, controlled opacity and transform transitions only. Hero artwork enters in a restrained stagger from 18px below, cards use a 180ms custom ease-out lift on hover, and the active navigation rule glides within 180ms. Poster movement is disabled for reduced-motion preferences. No looping motion, parallax, or ornamental animation is used.

### Typography System
**DM Serif Display** is used for high-impact narrative headlines, italic pull moments, and prominent ranking figures. **Manrope** carries navigation, metadata, buttons, and body copy for precise readability. Headlines use tight tracking and strong contrast; supporting text stays calm and spacious. The design explicitly avoids a single all-purpose sans-serif treatment.

### Brand Essence
**Anima is the editorial anime discovery room for viewers who want a story to find them, not just a list to scroll.**

Personality: **discerning, cinematic, warm**.

### Brand Voice
Headlines speak with conviction and specificity; CTAs sound like invitations to explore rather than generic product commands. Microcopy is brief, literate, and useful.

Examples:

> “Your next obsession is already airing.”

> “Follow the signal, not the algorithm.”

### Wordmark & Logo
The mark is a **split-frame asterisk**: four blunt editorial rays forming a compact star within a broken circular frame. It suggests both a camera aperture and a small burst of discovery. The wordmark pairs a small all-caps “ANIMA” with a distinctive red geometric mark, never a default text-only treatment.

### Signature Brand Color
**Vermilion Signal — #F14337.**

## Style Decisions

- Vermilion Signal is a precise editorial pulse for primary actions, cutlines, selected rankings, and key numerals; it is not a broad decorative surface.
- The trending area must read as an editorial spine rather than a uniform catalogue grid, using staggered poster rhythm, oversized rankings, and compact story-note annotations.
- Poster artwork is the sole source of broad chroma. Interface surfaces stay ink, bone, and restrained Vermilion Signal so each live AniList image supplies the changing emotional temperature.

## Implementation Notes

- The homepage is designed around a direct public AniList GraphQL query for the live trending rail. Browser validation confirmed that the request resolves and renders ten live trending anime cards with cover art, scores, formats, and genres.

## Style Decisions

- Empty watchlist states retain the Midnight Editorial system through an asymmetric archive composition, a numbered cutline, and an ink-and-bone blank-poster artifact rather than a generic centered icon-and-message pattern.
- When live anime imagery is absent, reference poster framing and archival shelving in ink, bone, and Vermilion Signal; do not introduce decorative colors or generic illustration.
- Poster fallbacks use archival ink-and-bone blank artifacts with cutlines, never broad color gradients or decorative blocks; live cover art remains the only broad chroma source.
- The Anima mark recurs sparingly as an editorial seal in major personal-discovery moments, while the hero poster stack retains framed overlap and ranked-cutline authority.
- Collection archive pages pair their masthead with a ranked, poster-led lead story, short editorial annotation, and asymmetric cadence; they never resolve into a sparse utility index.
- Every repeated homepage rail requires a distinct editorial gesture, such as a lead rank, staggered poster rhythm, archival cutline, or narrative pause, so collection bands do not collapse into duplicate catalogue shelves.
- Vermilion Signal remains limited to cutlines, selected numerals, active actions, and editorial seals; live poster artwork remains the only broad source of color.
- Archive loading and low-content states retain a visibly dominant lead frame, ranked cutlines, and a compact annotation block so they still read as an editorial feature rather than a utility grid.
- Continuation controls use archive language—opening a next chapter and reaching the end of a living archive—while remaining accessible as explicit manual fallback actions.
- Detail-page loading and interruption states use the same story-file metaphor as the completed experience: an asymmetric archive spine, Anima seal, ink-and-bone poster artifact, Vermilion cutline, and a DM Serif display moment rather than a centered utility spinner.
- Collection archives interrupt dense poster runs with ranked story-file pauses and collection-specific annotations; no archive may become an uninterrupted product shelf.
- Collection routes share the Midnight Editorial system while expressing distinct moods: seasonal is live, upcoming is anticipatory, popular is archival, and top is canonical.
- Archive scores and metadata use only Ink, Bone White, and Vermilion Signal; yellow rating-star language is excluded from the interface.
- Archive search areas are editorial research desks: compact notes, cutlines, and labelled fragments replace dashboard-like form boxes.
- Each discovery route holds its own metaphor—manga is a print shelf, seasonal a live dispatch, upcoming a horizon board, popular a cultural ledger, and top a canonical dossier.
- Manga loading is treated as a live reading ledger: status copy, compact motion, and placeholder print artifacts retain the archive’s editorial authority while a query is in transit.
- Manga shelves interrupt repeated cards with print-artifact lead volumes and bone-paper annotations, so the long archive remains curated rather than a uniform catalogue.
