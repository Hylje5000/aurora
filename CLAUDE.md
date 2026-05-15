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
│       ├── features/
│       │   └── route.ts        # GET /api/features?bbox=... → GeoJSON FeatureCollection (stub)
│       └── cell-towers/
│           └── route.ts        # GET /api/cell-towers?bbox=... → GeoJSON FeatureCollection (cell_towers table)
├── components/
│   ├── MapWithNav.tsx          # 'use client' state wrapper — owns selectedAreaId + layerVisibility, composes AreaNav + MapView + LayerPanel
│   ├── AreaNav.tsx             # 'use client' — top-centered AOI navigation button strip
│   ├── LayerPanel.tsx          # 'use client' — floating bottom-left toggle panel for terrain/contour/landcover layers
│   ├── MapView.tsx             # 'use client' Mapbox GL JS — terrain sources/layers, cell tower overlay, visibility sync effect
│   └── MapLoader.tsx           # next/dynamic(MapWithNav, {ssr:false}) — SSR guard
├── lib/
│   ├── areas.ts                # AOI definitions: Lappi, Karjala, Turku — bbox, color, description
│   ├── layers.ts               # LayerKey, LayerVisibility, DEFAULT_LAYER_VISIBILITY, LAYER_GROUPS
│   └── db.ts                   # pg.Pool singleton (global._pgPool dev-reload guard) + query<T>
└── test/
    ├── setup.ts                # @testing-library/jest-dom global matchers
    ├── api/
    │   ├── features.test.ts    # parseBbox unit tests + GET handler (mocked DB)
    │   └── cell-towers.test.ts # GET /api/cell-towers handler tests (mocked DB)
    ├── lib/
    │   ├── db.test.ts          # pool singleton guard + query passthrough
    │   ├── areas.test.ts       # AOI bbox validity, center-within-bbox, description presence
    │   └── layers.test.ts      # LayerKey completeness, DEFAULT_LAYER_VISIBILITY defaults, LAYER_GROUPS mappings
    └── components/
        ├── MapView.test.tsx    # mapbox-gl mock (vi.hoisted), AOI + cell tower + terrain layers, fetch, popup, fitBounds, setTerrain
        ├── MapWithNav.test.tsx # state wiring tests (stubbed AreaNav + MapView + LayerPanel)
        ├── LayerPanel.test.tsx # checkbox render, onToggle calls, collapse/expand
        ├── AreaNav.test.tsx    # button render + onSelect callback tests
        └── MapLoader.test.tsx  # next/dynamic stub
```

## Testing

- **Framework**: Vitest 3 + `@testing-library/react` + jsdom. Config: `vitest.config.ts` (excluded from `tsconfig.json` to avoid Vite version conflicts).
- **Scripts**: `npm test` (run once), `npm run test:watch`, `npm run test:coverage` (v8 provider).
- **Mock strategy**:
  - `mapbox-gl` — use `vi.hoisted()` + `vi.mock()` to avoid the hoisting-before-init error. Mock Map instance includes `on`, `addSource`, `addLayer`, `fitBounds`, `getBounds`, `getSource`, `getCanvas`, `setConfigProperty`, `setLayoutProperty`, `setTerrain`; mock `Popup` with `setLngLat`, `setHTML`, `addTo`.
  - `global.fetch` — mocked with `vi.fn()` in MapView tests to simulate cell tower API responses.
  - `@/lib/db` — `vi.mock("@/lib/db", () => ({ query: vi.fn() }))` in API route tests.
  - `pg` — `vi.mock("pg")` + `vi.resetModules()` / `delete globalThis._pgPool` in db tests.
  - `next/dynamic` — mock to return a plain stub component in MapLoader tests.
  - Child components (`AreaNav`, `MapView`, `LayerPanel`) — `vi.mock` with data-attribute stubs in `MapWithNav` tests to isolate state wiring.
- **Coverage**: `@vitest/coverage-v8` must match Vitest's major version (both v3). The `vite` package must be installed explicitly as a dev dependency.
- **Coverage summary (last run — 107 tests)**: `areas.ts` 100%, `db.ts` 100%, `layers.ts` 100%, `features/route.ts` 100%, `cell-towers/route.ts` 100%, `AreaNav.tsx` 100%, `LayerPanel.tsx` 100%, `MapWithNav.tsx` 100%, `MapView.tsx` ~99% stmts/lines (branch gaps at async null guards inside callbacks — expected), `MapLoader.tsx` 100% stmts/lines.

## Key Patterns

- **Mapbox SSR guard**: `mapbox-gl` uses `window` at import time. `MapLoader` wraps `MapWithNav` with `next/dynamic({ ssr: false })` so it is never imported in the server bundle.
- **Map init**: `MapView` holds the DOM container via `containerRef` and the `Map` instance via `mapRef` (not state). Initialised once in `useEffect([], [])` with cleanup `map.remove()`.
- **AOI layers**: On `map.on('style.load', ...)`, `MapView` adds a single GeoJSON source (`aoi-source`) with all three AOI bounding-box polygons, then an `aoi-fill` layer (opacity 0.12) and `aoi-outline` layer (width 2), both using `["get", "color"]` data-driven expressions.
- **AOI navigation**: `MapWithNav` owns `selectedAreaId` state. When it changes, a `useEffect` in `MapView` calls `map.fitBounds(area.bbox, { padding: 60, duration: 1200 })`.
- **AOI data module**: `src/lib/areas.ts` exports `AREAS_OF_INTEREST` — the single source of truth for bbox, color, and description. Bboxes are `[minLng, minLat, maxLng, maxLat]` EPSG:4326, directly usable in PostGIS `ST_MakeEnvelope`.
- **DB singleton**: `global._pgPool` prevents creating a new pool on every hot reload in dev. API routes import `query` from `@/lib/db`.
- **GeoJSON API**: `GET /api/features?bbox=minLng,minLat,maxLng,maxLat` — validates bbox, queries PostGIS with `ST_MakeEnvelope` / `ST_Intersects` / `ST_AsGeoJSON`, returns `FeatureCollection`. Degrades gracefully (empty collection) when `DATABASE_URL` is absent.
- **Cell tower API**: `GET /api/cell-towers?bbox=minLng,minLat,maxLng,maxLat` — queries `cell_towers` table (PostGIS GIST index on `geom`), returns up to 2000 features with properties `id, radio, aoi_id, range_m, avg_signal, samples`. Same bbox validation and graceful degradation as the features route. `parseBbox` is imported from `@/app/api/features/route`.
- **Cell tower overlay**: On `style.load`, `MapView` adds `cell-towers-source` (GeoJSON, `cluster:true`, `clusterMaxZoom:14`, `clusterRadius:50`) and six layers: `cell-towers-clusters` (circle, color `#94a3b8`), `cell-towers-cluster-count` (symbol), plus four per-radio-type circle layers — `cell-towers-gsm` (`#fde047`), `cell-towers-umts` (`#fb923c`), `cell-towers-lte` (`#4ade80`), `cell-towers-cdma` (`#c4b5fd`) — each with a static `["==", ["get", "radio"], TYPE]` filter. A `fetchCellTowers(map)` helper is called immediately after `style.load` and on every `moveend` event; it reads `map.getBounds()`, fetches `/api/cell-towers?bbox=...`, and calls `source.setData()`.
- **Cell tower popup**: Clicking any of the four per-type layers opens a `mapboxgl.Popup` showing radio type, AOI, estimated range (m), and average signal (dBm). Cursor changes to `pointer` on hover.
- **Layer toggle system**: `src/lib/layers.ts` exports `LayerKey` (8 values: `terrain3d`, `hillshade`, `contours`, `landcover`, `cellGSM`, `cellUMTS`, `cellLTE`, `cellCDMA`), `LayerVisibility`, `DEFAULT_LAYER_VISIBILITY` (cell types all default `true`, terrain3d `false`), and `LAYER_GROUPS` (maps each key to the Mapbox layer IDs it controls). `MapWithNav` owns `layerVisibility` state and a `handleToggle` callback, passing them to both `LayerPanel` and `MapView`.
- **Dark theme**: On `style.load`, `map.setConfigProperty("basemap", "lightPreset", "night")` switches the Mapbox Standard basemap to night mode. Military basemap hardening also disables POI/transit labels, 3D objects, and sets water to dark blue (`#0d2137`). `globals.css` overrides `.mapboxgl-ctrl-group` styles to match the slate dark palette (`#1e293b` bg, `#334155` borders, inverted SVG icons). AreaNav inactive buttons use `border-white/30`.
- **Default map view**: Centre `[21.5, 60.2]` (Archipelago Sea, Finland), zoom 7. Mapbox Standard style (night preset).
- **LayerPanel**: Floating dark-slate panel (`absolute left-4 bottom-10`) with collapsible sections — TERRAIN (3D Terrain, Hillshade), ELEVATION (Contour Lines), VEGETATION (Land Cover), COMMS (GSM, UMTS, LTE, CDMA). Each row is a checkbox with a colored dot calling `onToggle(key)`. COMMS dot colors match the map marker colors exactly.
- **Terrain & intelligence layers**: On `style.load`, `MapView` adds two Mapbox-hosted sources — `mapbox-dem` (raster-dem, `mapbox://mapbox.mapbox-terrain-dem-v1`) and `terrain-v2` (vector, `mapbox://mapbox.mapbox-terrain-v2`) — and five layers in Standard style slots: `hillshading` (hillshade, slot `bottom`), `landcover-military` (fill from `landcover` source-layer, GO/SLOW-GO/NO-GO colours, slot `bottom`), `contours-minor` + `contours-major` (lines from `contour` source-layer, slot `bottom`), `contours-labels` (symbol, slot `middle`).
- **Layer visibility sync**: A `useEffect([layerVisibility])` in `MapView` guarded by `styleLoadedRef` calls `map.setLayoutProperty(layerId, 'visibility', 'visible'|'none')` for each layer group and `map.setTerrain({...})` / `map.setTerrain(null)` for the `terrain3d` toggle.
- **3D terrain**: When `layerVisibility.terrain3d` is true, `map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })` enables terrain extrusion. When false, `map.setTerrain(null)` flattens the map. Hillshade and contours remain readable in 2D mode.

## Environment Variables

| Variable                   | Where used                                   |
| -------------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | `MapView.tsx` — `mapboxgl.accessToken`       |
| `DATABASE_URL`             | `src/lib/db.ts` — `pg.Pool` connectionString |

Set both in `.env.local` (git-ignored).

## Data Architecture & Flow

- **Base Map Layers (Terrain, General Roads, Elevation)**: Rendered natively via Mapbox's built-in standard vector tile APIs. No self-hosted tile server needed.
- **Custom Overlay Layers (Cell Towers, Medical Facilities, Units, POIs)**: Fetched as GeoJSON from dedicated API routes (`/api/cell-towers`, `/api/features`, etc.) and rendered by Mapbox GL JS on the client. Cell towers are live — fetched on every viewport change.
- **Dynamic Dashboard**: As the user pans/zooms, the frontend passes the bounding box to API routes to query PostGIS for summary statistics (population, bridge capacity, etc.).

## Key Features to Implement

1. **Interactive Map Layer**: Critical infrastructure, terrain features (GO / SLOW GO / NO GO), weather impacts.
2. **Dynamic Viewport Clustering**: Mapbox native `cluster: true` for dense point layers (cell towers implemented; demographics pending).
3. **Military Symbology**: `milsymbol` library for NATO APP-6 / US MIL-STD-2525 icons on the client side.
4. **Chokepoint & Logistics Analysis**: Road segments with bridge weight/height limits for heavy armour / convoy routing.
5. **Explainability Panel**: UI showing active data sources and timestamps for analyst trust.

## Primary Open-Source Data Sources

- **Terrain & Topography**: National Land Survey of Finland (NLS) GeoPackages.
- **Transportation (Roads/Bridges)**: Digiroad from the Finnish Transport Infrastructure Agency (FTIA).
- **Weather**: Finnish Meteorological Institute (FMI) Open Data WFS.
- **Demographics**: Statistics Finland (Paavo) 1km × 1km grid data.
- **Space & Comm Signatures**: N2YO REST API for satellite groundtracks; OpenCelliD / CellMapper for cellular networks.
