# Run Anima locally

This project is a **React 19 + Vite + Express + tRPC** application. It has been checked with Node.js 22 and pnpm 10. The reader’s public MangaDex features and browser-local shelves do not require a database or an OAuth account to browse locally.

## 1. Prerequisites

Install **Node.js 22 LTS** and **pnpm 10**. The committed lockfile is authoritative, so use pnpm rather than npm or yarn.

```bash
corepack enable
corepack prepare pnpm@10.4.1 --activate
```

If your Node installation does not ship Corepack, install the required package manager explicitly:

```bash
npm install --global pnpm@10.4.1
```

## 2. Restore the included visual assets

The accompanying `assets/` directory contains the four branded images that are normally served by the managed `/manus-storage/` route. Keep that directory inside the repository root after extraction:

```text
anima-redesign-local/
├── assets/
│   ├── anima-brand-mark_e15d6eac.png
│   ├── anima-midnight-hero_8078e0a3.jpg
│   ├── anima-paper-texture_044607fc.jpg
│   └── anima-reading-room_790c079a.jpg
├── client/
├── server/
└── package.json
```

Copy the included environment template before starting the application. The Express asset route uses the local copy first and falls back to managed storage only when its platform credentials are available.

```bash
cp local.env.template .env
```

## 3. Install and start development mode

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The server prefers `http://localhost:3000` and automatically selects a nearby free port if 3000 is busy. Open the URL printed by the server.

## 4. Quality checks and production mode

```bash
pnpm test
pnpm check
pnpm build
pnpm start
```

The build command creates `dist/`. Keep `ANIMA_LOCAL_ASSETS_DIR` set when using `pnpm start` so the branded images resolve in production mode outside the managed environment.

## Optional platform integrations

The public AniList discovery experience and MangaDex reader make live network requests. The MangaDex server adapter uses documented public endpoints and no API key. Login and database-backed account functionality are optional for local browsing; if you want to exercise them, configure the environment variables expected by `server/_core/env.ts` (`DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, and related OAuth settings). Do not copy platform-provided credentials from another environment into source control.

The HTML includes an optional analytics script using `VITE_ANALYTICS_ENDPOINT` and `VITE_ANALYTICS_WEBSITE_ID`. Leave those unset for local development if analytics is not required.
