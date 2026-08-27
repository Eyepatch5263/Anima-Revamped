# Local asset manifest

The downloadable local bundle includes these four original Anima visual assets in its root `assets/` directory. They are served locally through the existing `/manus-storage/*` route when `ANIMA_LOCAL_ASSETS_DIR=./assets` is set.

| Filename | Used for |
|---|---|
| `anima-brand-mark_e15d6eac.png` | Favicon and Anima brand mark |
| `anima-midnight-hero_8078e0a3.jpg` | Homepage hero composition |
| `anima-paper-texture_044607fc.jpg` | Editorial paper texture |
| `anima-reading-room_790c079a.jpg` | Reading-room editorial panel |

The source responses for these four files are WebP-encoded, although their historic managed-storage filenames use `.png` or `.jpg` extensions. The local asset fallback serves them through the same project route, preserving browser compatibility with their existing references.

## Live data not bundled

Anime metadata and cover art are requested from AniList at runtime. MangaDex title metadata, cover URLs, chapter information, and reader page manifests are also live; chapter page bytes are proxied by the application and are not stored in this repository or the local asset bundle. The display fonts are requested from Google Fonts at runtime.
