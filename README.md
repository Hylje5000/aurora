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

## Areas of Interest

Three operational areas are pre-defined in `src/lib/areas.ts` and visible on the map:

| Area    | Description |
|---------|-------------|
| **Lappi** | Northern Lapland — E8/E75 corridors, Saariselkä highlands, Inari lake system |
| **Karjala** | North Karelia — Finnish-Russian border zone, Joensuu hub, Niirala crossing |
| **Turku** | Archipelago Sea — maritime chokepoints, Turku port, Stockholm/Tallinn ferry links |

Use the buttons at the top of the map to animate to each area. The bounding boxes are in `[minLng, minLat, maxLng, maxLat]` EPSG:4326 format — directly usable in PostGIS `ST_MakeEnvelope` queries.

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
│   ├── MapWithNav.tsx      # State wrapper — owns selectedAreaId, composes AreaNav + MapView
│   ├── AreaNav.tsx         # Top-centered AOI navigation button strip
│   ├── MapView.tsx         # 'use client' Mapbox GL JS — map init, AOI layers, fitBounds
│   └── MapLoader.tsx       # next/dynamic ssr:false wrapper
└── lib/
    ├── areas.ts            # AOI definitions (bbox, color, description) — single source of truth
    └── db.ts               # pg Pool singleton + typed query helper
```

## API

### `GET /api/features?bbox=minLng,minLat,maxLng,maxLat`

Returns a GeoJSON `FeatureCollection` of POIs intersecting the given bounding box, queried from PostGIS.

- **400** — missing or malformed `bbox`
- **200** — `FeatureCollection` (empty if `DATABASE_URL` is not configured)

## Testing

The project uses [Vitest](https://vitest.dev/) with React Testing Library and jsdom.

```bash
npm test                  # run all tests once
npm run test:watch        # watch mode
npm run test:coverage     # run with v8 coverage report
```

Tests live under `src/test/` mirroring the `src/` structure:

```
src/test/
├── setup.ts                    # jest-dom matchers
├── api/features.test.ts        # parseBbox + GET handler
├── lib/
│   ├── db.test.ts              # pool singleton
│   └── areas.test.ts           # AOI bbox/center validation
└── components/
    ├── MapView.test.tsx        # mapbox-gl mock, layer setup, fitBounds
    ├── MapWithNav.test.tsx     # state wiring (stubbed children)
    ├── AreaNav.test.tsx        # button render + click callbacks
    └── MapLoader.test.tsx      # next/dynamic stub
```

## Scripts

| Command                 | Description                  |
| ----------------------- | ---------------------------- |
| `npm run dev`           | Start dev server (Turbopack) |
| `npm run build`         | Production build             |
| `npm run lint`          | Run ESLint                   |
| `npm test`              | Run test suite               |
| `npm run test:watch`    | Vitest watch mode            |
| `npm run test:coverage` | Tests with v8 coverage       |

## Tech Stack

- **Next.js 16** — App Router, TypeScript, Tailwind CSS v4, Turbopack
- **Mapbox GL JS** — vector tiles, clustering, custom overlays
- **PostgreSQL + PostGIS** — spatial data store for all custom overlay layers
- **pg** — Node.js PostgreSQL client
