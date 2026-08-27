# ANIMA — Narrative Anime & Manga Index

A refined, editorial-grade anime and manga discovery platform. Built with a "Midnight Editorial" aesthetic that treats poster artwork, live signals, and reading desks with print-like typography and layout precision.

---

## Features

- **Live Signal Index**: Real-time anime discovery powered by AniList API (Trending, Popular This Season, All-Time Popular, Top 100).
- **MangaDex Reading Room**: Integrated manga reader featuring multi-chapter search, image proxying, quality options (`data-saver` / `data`), and automatic reading progress tracking.
- **Personal Desk & Library**: Local shelf for tracking active anime watch status, recently completed titles, and current reading chapters.
- **Responsive "Midnight Editorial" UI**: Fluid CSS grid layouts with zero visual overlaps across desktop, tablet, and mobile viewports.

---

## 🛠 Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Framer Motion, Wouter, Lucide React
- **Backend & API**: Express, tRPC v11, Zod, TanStack React Query
- **Data Integrations**: AniList GraphQL API, MangaDex API
- **Tooling & Runtime**: Node.js, `tsx`, TypeScript

---

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
# or
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The application runs at [http://localhost:5173](http://localhost:5173) (Express backend with embedded Vite dev server and tRPC endpoint at `/api/trpc`).

---

## Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start full-stack dev server (Express + tRPC + Vite) |
| `npm run build` | Build production client bundle |
| `npm run start` | Run production node server |
| `npm run check` | Type-check TypeScript |
| `npm run test` | Run test suite with Vitest |
