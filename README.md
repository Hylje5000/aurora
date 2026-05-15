# Aurora IPB

Automated Intelligence Preparation of the Battlespace — open-source situational awareness for military operational planning. Built for the Junction Defence Hackathon (Challenge by 61N).

## Prerequisites

- Node.js ≥ 20.9
- A [Mapbox access token](https://account.mapbox.com/)
- PostgreSQL ≥ 14 with the PostGIS extension (for overlay data)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill in your values:

   ```bash
   cp .env.local.example .env.local   # or create .env.local manually
   ```

   ```env
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
   DATABASE_URL=postgresql://user:password@localhost:5432/aurora
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) — you should see a full-screen map centred on the Archipelago Sea, Finland.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout (metadata, fonts, dark theme)
│   ├── page.tsx            # Home page — full-screen map
│   ├── globals.css         # Tailwind + base styles
│   └── api/
│       └── features/
│           └── route.ts    # GET /api/features?bbox=... → GeoJSON FeatureCollection
├── components/
│   ├── MapView.tsx         # 'use client' Mapbox GL JS component
│   └── MapLoader.tsx       # next/dynamic ssr:false wrapper
└── lib/
    └── db.ts               # pg Pool singleton + typed query helper
```

## API

### `GET /api/features?bbox=minLng,minLat,maxLng,maxLat`

Returns a GeoJSON `FeatureCollection` of POIs intersecting the given bounding box, queried from PostGIS.

- **400** — missing or malformed `bbox`
- **200** — `FeatureCollection` (empty if `DATABASE_URL` is not configured)

## Scripts

| Command         | Description                  |
| --------------- | ---------------------------- |
| `npm run dev`   | Start dev server (Turbopack) |
| `npm run build` | Production build             |
| `npm run lint`  | Run ESLint                   |

## Tech Stack

- **Next.js 16** — App Router, TypeScript, Tailwind CSS v4, Turbopack
- **Mapbox GL JS** — vector tiles, clustering, custom overlays
- **PostgreSQL + PostGIS** — spatial data store for all custom overlay layers
- **pg** — Node.js PostgreSQL client
