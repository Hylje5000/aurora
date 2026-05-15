# Project Context: Automated IPB (Intelligence Preparation of the Battlespace)

## Overview

We are building a web application for the Junction Defence Hackathon (Challenge by 61N). The tool automates the IPB process using open-source data to provide rapid, comprehensive environmental situational awareness for military operational planning. It visualizes geographic areas (e.g., Archipelago Sea, North Karelia, Lapland) and aggregates data dynamically based on the map viewport.

## Tech Stack

- **Frontend**: Next.js 16 (React), Tailwind CSS v4, Mapbox GL JS.
- **Router**: App Router (`src/app/`), TypeScript, Turbopack in dev.
- **Backend**: Next.js API Routes (`src/app/api/`) for GeoJSON overlay queries and dashboard aggregations.
- **Map Layer**: Mapbox standard vector tiles for terrain, roads, and basemap. Custom overlay layers rendered as GeoJSON via API routes.
- **Database**: PostgreSQL with the PostGIS extension. Accessed via a singleton `pg.Pool` in `src/lib/db.ts`.
- **Data Ingestion (Pre-computation)**: Python background scripts (GeoPandas, requests, etc.) to fetch, clean, and load open-source data into PostGIS before the demo.

## File Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout — dark theme, Geist font, Aurora IPB metadata
│   ├── page.tsx                # Home — full-screen MapLoader (h-screen)
│   ├── globals.css             # Tailwind v4 + html/body height:100%, dark background
│   └── api/
│       └── features/
│           └── route.ts        # GET /api/features?bbox=... → GeoJSON FeatureCollection
├── components/
│   ├── MapView.tsx             # 'use client' Mapbox GL JS — useRef/useEffect init, cleanup
│   └── MapLoader.tsx           # next/dynamic(MapView, {ssr:false}) — SSR guard
├── lib/
│   └── db.ts                   # pg.Pool singleton (global._pgPool dev-reload guard) + query<T>
└── test/
    ├── setup.ts                # @testing-library/jest-dom global matchers
    ├── api/
    │   └── features.test.ts    # parseBbox unit tests + GET handler (mocked DB)
    ├── lib/
    │   └── db.test.ts          # pool singleton guard + query passthrough
    └── components/
        ├── MapView.test.tsx    # mapbox-gl mock (vi.hoisted), mount/unmount assertions
        └── MapLoader.test.tsx  # next/dynamic stub
```

## Testing

- **Framework**: Vitest 3 + `@testing-library/react` + jsdom. Config: `vitest.config.ts` (excluded from `tsconfig.json` to avoid Vite version conflicts).
- **Scripts**: `npm test` (run once), `npm run test:watch`, `npm run test:coverage` (v8 provider).
- **Mock strategy**:
  - `mapbox-gl` — use `vi.hoisted()` + `vi.mock()` to avoid the hoisting-before-init error.
  - `@/lib/db` — `vi.mock("@/lib/db", () => ({ query: vi.fn() }))` in API route tests.
  - `pg` — `vi.mock("pg")` + `vi.resetModules()` / `delete globalThis._pgPool` in db tests.
  - `next/dynamic` — mock to return a plain stub component in MapLoader tests.
- **Coverage**: `@vitest/coverage-v8` must match Vitest's major version (both v3). The `vite` package must be installed explicitly as a dev dependency.

## Key Patterns

- **Mapbox SSR guard**: `mapbox-gl` uses `window` at import time. `MapLoader` wraps `MapView` with `next/dynamic({ ssr: false })` so it is never imported in the server bundle.
- **Map init**: `MapView` holds the DOM container via `containerRef` and the `Map` instance via `mapRef` (not state). Initialised once in `useEffect([], [])` with cleanup `map.remove()`.
- **DB singleton**: `global._pgPool` prevents creating a new pool on every hot reload in dev. API routes import `query` from `@/lib/db`.
- **GeoJSON API**: `GET /api/features?bbox=minLng,minLat,maxLng,maxLat` — validates bbox, queries PostGIS with `ST_MakeEnvelope` / `ST_Intersects` / `ST_AsGeoJSON`, returns `FeatureCollection`. Degrades gracefully (empty collection) when `DATABASE_URL` is absent.
- **Default map view**: Centre `[21.5, 60.2]` (Archipelago Sea, Finland), zoom 7. Mapbox Standard style.

## Environment Variables

| Variable                   | Where used                                   |
| -------------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | `MapView.tsx` — `mapboxgl.accessToken`       |
| `DATABASE_URL`             | `src/lib/db.ts` — `pg.Pool` connectionString |

Set both in `.env.local` (git-ignored).

## Data Architecture & Flow

- **Base Map Layers (Terrain, General Roads, Elevation)**: Rendered natively via Mapbox's built-in standard vector tile APIs. No self-hosted tile server needed.
- **Custom Overlay Layers (Cell Towers, Medical Facilities, Units, POIs)**: Fetched as GeoJSON from `/api/features?bbox=...` and rendered by Mapbox GL JS on the client.
- **Dynamic Dashboard**: As the user pans/zooms, the frontend passes the bounding box to API routes to query PostGIS for summary statistics (population, bridge capacity, etc.).

## Key Features to Implement

1. **Interactive Map Layer**: Critical infrastructure, terrain features (GO / SLOW GO / NO GO), weather impacts.
2. **Dynamic Viewport Clustering**: Mapbox native `cluster: true` for dense point layers (cell towers, demographics).
3. **Military Symbology**: `milsymbol` library for NATO APP-6 / US MIL-STD-2525 icons on the client side.
4. **Chokepoint & Logistics Analysis**: Road segments with bridge weight/height limits for heavy armour / convoy routing.
5. **Explainability Panel**: UI showing active data sources and timestamps for analyst trust.

## Primary Open-Source Data Sources

- **Terrain & Topography**: National Land Survey of Finland (NLS) GeoPackages.
- **Transportation (Roads/Bridges)**: Digiroad from the Finnish Transport Infrastructure Agency (FTIA).
- **Weather**: Finnish Meteorological Institute (FMI) Open Data WFS.
- **Demographics**: Statistics Finland (Paavo) 1km × 1km grid data.
- **Space & Comm Signatures**: N2YO REST API for satellite groundtracks; OpenCelliD / CellMapper for cellular networks.
