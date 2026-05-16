# Project Context: Automated IPB (Intelligence Preparation of the Battlespace)

## Overview

We are building a web application for the Junction Defence Hackathon (Challenge by 61N). The tool automates the IPB process using open-source data to provide rapid, comprehensive environmental situational awareness for military operational planning. It visualizes geographic areas (e.g., Archipelago Sea, North Karelia, Lapland) and aggregates data dynamically based on the map viewport.

## Tech Stack

- **Frontend**: Next.js 16 (React), Tailwind CSS v4, Mapbox GL JS, milsymbol (NATO APP-6 military symbols), `@mapbox/mapbox-gl-draw` + `mapbox-gl-draw-rectangle-mode` for collaborative drawing.
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
│       ├── cell-towers/
│       │   └── route.ts        # GET /api/cell-towers?bbox=... → GeoJSON FeatureCollection (cell_towers table)
│       ├── weather/
│       │   └── route.ts        # GET /api/weather?region&month&day → WeatherStats JSON (weather_observations table)
│       ├── ai/
│       │   └── route.ts        # POST /api/ai → chat completion via ConfidentialMind Gemma-4 (OpenAI-compatible)
│       ├── elevation/
│       │   └── route.ts        # GET /api/elevation?lng=&lat= → { elevation_m, aoi_id, grid_file, dist_m } | { elevation_m: null }
│       ├── route-plan/
│       │   └── route.ts        # POST /api/route-plan → PlannedRoute JSON; proxies Mapbox Directions API server-side
│       ├── route-intelligence/
│       │   └── route.ts        # POST /api/route-intelligence → RouteIntelligence JSON; PostGIS ST_DWithin roads (20 m) + bridges (50 m) along route geometry; classifies hazards against vehicle profile
│       └── custom-layers/
│           ├── route.ts        # GET list + POST create custom layers
│           ├── [id]/
│           │   ├── route.ts    # DELETE custom layer (cascades features)
│           │   └── features/
│           │       ├── route.ts        # GET bbox features + POST create feature
│           │       └── [fid]/
│           │           └── route.ts    # PUT update + DELETE single feature
├── components/
│   ├── MapWithNav.tsx          # 'use client' state wrapper — owns selectedAreaId, layerVisibility,
│   │                           #   customLayers, enabledCustomLayerIds, activeDrawingLayerId, infoPanelData, selectedDay,
│   │                           #   routePanelOpen, plannedRoute, routeProfile, routeWaypoints, addingWaypoint, routePanelRef,
│   │                           #   routeIntelligence, focusedHazard; handleHazardsChange + handleHazardFocus build InfoPanel rows
│   ├── RoutePanel.tsx          # 'use client' forwardRef — floating route planning panel (bottom center);
│   │                           #   exposes addWaypoint(coords) via RoutePanelHandle; debounced POST /api/route-plan;
│   │                           #   profile selector, vehicle preset selector (Infantry/Wheeled APC/IFV/MBT/Custom) with
│   │                           #   editable mass/axle/bogie/height/width fields; waypoint list (drag/remove); leg accordion;
│   │                           #   route assessment section: debounced POST /api/route-intelligence (600 ms after route set),
│   │                           #   passable/impassable summary, severity-colored hazard rows (click → onHazardFocus)
│   ├── WeatherWidget.tsx       # 'use client' — fetches /api/weather, shows avg temp ± spread + rain stats
│   ├── DatePicker.tsx          # 'use client' — two <select> dropdowns (month/day) with leap-year day clamping
│   ├── AreaNav.tsx             # 'use client' — top-centered AOI navigation button strip
│   ├── LayerPanel.tsx          # 'use client' — floating bottom-left toggle panel for terrain/contour/landcover layers
│   ├── CustomLayerPanel.tsx    # 'use client' — floating bottom-right panel: create/toggle/delete custom drawing layers
│   ├── ElectionPieChart.tsx    # 'use client' — pure inline SVG pie chart of 2023 election vote shares; party color map; top-4 party list
│   ├── InfoPanel.tsx           # 'use client' — generic right-side info panel; accepts InfoPanelData {title, rows, component?} | null
│   ├── DrawingToolbar.tsx      # 'use client' — floating top-right tool palette (Point/Line/Polygon/Rectangle) + 8-colour palette
│   ├── FeatureDialog.tsx       # 'use client' — modal: name + description for a newly drawn feature
│   ├── MapView.tsx             # 'use client' Mapbox GL JS — terrain, cell towers, custom drawing layers, Draw control, visibility sync effect;
│   │                           #   route-hazards-source + three circle layers (critical/warning/info); useEffect([routeHazards]) syncs GeoJSON;
│   │                           #   useEffect([focusedHazard]) calls map.flyTo + places color-coded Marker (hazardFocusMarkerRef)
│   └── MapLoader.tsx           # next/dynamic(MapWithNav, {ssr:false}) — SSR guard
├── lib/
│   ├── areas.ts                # AOI definitions: Lappi, Karjala, Turku — bbox, color, description
│   ├── layers.ts               # LayerKey, LayerVisibility, DEFAULT_LAYER_VISIBILITY, LAYER_GROUPS
│   ├── customLayers.ts         # CustomLayer, CustomFeature, DrawingTool types; COLOUR_PALETTE (8 colours); DEFAULT_LAYER_COLOUR
│   ├── routing.ts              # RouteProfile, Waypoint, PlannedRoute, RouteLeg, RouteStep types; PROFILE_COLORS map;
│   │                           #   VehicleProfile, VEHICLE_PRESETS (Infantry/Wheeled APC/IFV/MBT/Custom);
│   │                           #   HazardSeverity, RouteHazard, RouteIntelligence types;
│   │                           #   formatDuration/formatDistance/profileLabel helpers
│   ├── milsymbol.ts            # createMilsymbolImage(opts) — NATO SIDC → SVG → HTMLImageElement (async)
│   ├── ai.ts                   # createAIClient() factory + CM_MODEL constant — ConfidentialMind OpenAI-compatible client
│   └── db.ts                   # pg.Pool singleton (global._pgPool dev-reload guard) + query<T>
├── types/
│   └── mapbox-gl-draw-rectangle-mode.d.ts   # minimal type declaration for untyped rectangle mode plugin
└── test/
    ├── setup.ts                # @testing-library/jest-dom global matchers
    ├── api/
    │   ├── route-plan.test.ts  # POST /api/route-plan — validation, Mapbox proxy, 503/502/404/200
│   │   ├── route-intelligence.test.ts  # POST /api/route-intelligence — validation, road/bridge hazard rules, Infantry mass-skip, sorting, 503/500
    │   ├── features.test.ts    # parseBbox unit tests + GET handler (mocked DB)
    │   ├── cell-towers.test.ts # GET /api/cell-towers handler tests (mocked DB)
    │   ├── weather.test.ts     # GET /api/weather — params validation, aggregate stats, NULL precip, DB degradation
    │   ├── ai.test.ts          # POST /api/ai — 503 no config, 400 bad messages, 200 happy path, 502 APIError, 500 unexpected
    │   ├── elevation.test.ts   # GET /api/elevation — params validation, KNN query, dist calculation, 400/500
    │   ├── municipalities.test.ts           # GET /api/municipalities — base shape, demographic fields, LEFT JOIN null, election_data, 500
    │   ├── custom-layers.test.ts            # GET list + POST create (mocked DB)
    │   ├── custom-layers-id.test.ts         # DELETE layer (mocked DB)
    │   ├── custom-layers-features.test.ts   # GET bbox + POST feature (mocked DB)
    │   └── custom-layers-features-fid.test.ts  # PUT + DELETE feature (mocked DB)
    ├── lib/
    │   ├── db.test.ts          # pool singleton guard + query passthrough
    │   ├── ai.test.ts          # createAIClient — missing env vars, baseURL construction, trailing-slash strip, CM_MODEL fallback
    │   ├── areas.test.ts       # AOI bbox validity, center-within-bbox, description presence
    │   ├── layers.test.ts      # LayerKey completeness, DEFAULT_LAYER_VISIBILITY defaults, LAYER_GROUPS mappings
    │   ├── milsymbol.test.ts   # createMilsymbolImage — data URL format, option passthrough, onerror rejection
    │   ├── routing.test.ts     # formatDuration, formatDistance, profileLabel, PROFILE_COLORS, VEHICLE_PRESETS
    │   └── customLayers.test.ts # COLOUR_PALETTE completeness/uniqueness, type shapes, milsymbol extensibility
    └── components/
        ├── MapView.test.tsx    # mapbox-gl + MapboxDraw mocks (vi.hoisted), AOI + cell tower + terrain layers, fetch, popup, fitBounds, setTerrain, elevation click, route layer, waypoint markers, hazard circle layers, flyTo + marker on focusedHazard
        ├── MapWithNav.test.tsx # state wiring tests (stubbed AreaNav + MapView + LayerPanel + CustomLayerPanel + InfoPanel + WeatherWidget + DatePicker + RoutePanel); intelligence + focusedHazard wiring
        ├── RoutePanel.test.tsx # waypoint add/remove/reorder, profile switch, fetch trigger, leg accordion, loading/error; vehicle preset selector, intelligence fetch, hazard list, onHazardFocus
        ├── LayerPanel.test.tsx # checkbox render, onToggle calls, collapse/expand
        ├── AreaNav.test.tsx    # button render + onSelect callback tests
        ├── ElectionPieChart.test.tsx  # SVG slices, < 2% grouping, single-slice circle, empty data, party colors
        ├── InfoPanel.test.tsx  # null data, title/row render, — fallback, onClose callback, optional component
        ├── MapLoader.test.tsx  # next/dynamic stub
        ├── WeatherWidget.test.tsx     # loading, stats display, sampleSize=0 fallback, refetch on prop change
        ├── DatePicker.test.tsx        # month/day selects, onChange, day clamping, option counts
        ├── CustomLayerPanel.test.tsx  # layer list, toggle, create form, delete confirm
        ├── DrawingToolbar.test.tsx    # tool buttons, colour swatches, cancel, delete selected
        └── FeatureDialog.test.tsx     # name/description form, save/discard, keyboard shortcuts
```

## Testing

- **Framework**: Vitest 3 + `@testing-library/react` + jsdom. Config: `vitest.config.ts` (excluded from `tsconfig.json` to avoid Vite version conflicts).
- **Scripts**: `npm test` (run once), `npm run test:watch`, `npm run test:coverage` (v8 provider).
- **Mock strategy**:
  - `mapbox-gl` — use `vi.hoisted()` + `vi.mock()` to avoid the hoisting-before-init error. Mock Map instance includes `on`, `addSource`, `addLayer`, `addImage`, `fitBounds`, `getBounds`, `getSource`, `getCanvas`, `setConfigProperty`, `setLayoutProperty`, `setTerrain`, `removeLayer`, `removeSource`, `setPaintProperty`, `getZoom`; mock `Popup` with `setLngLat`, `setHTML`, `addTo`.
  - `@mapbox/mapbox-gl-draw` — `vi.hoisted()` mock with `changeMode`, `delete`, `trash` fns; `.modes` static property. Uses `eslint-disable @typescript-eslint/no-explicit-any` because the library uses `export =` syntax incompatible with `typeof` mock casting.
  - `mapbox-gl-draw-rectangle-mode` — `vi.mock(…, () => ({ default: {} }))`.
  - `@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css` — `vi.mock(…, () => ({}))`.
  - `@/lib/milsymbol` — `vi.mock("@/lib/milsymbol", () => ({ createMilsymbolImage: vi.fn(() => Promise.resolve(new Image())), ensureMilsymbolImages: vi.fn(() => Promise.resolve()) }))` in MapView tests.
  - `milsymbol` — `vi.mock("milsymbol", () => ({ default: { Symbol: MockSymbol } }))` in milsymbol.ts unit tests.
  - `global.fetch` — mocked with `vi.fn()` in MapView and MapWithNav tests.
  - `@/lib/db` — `vi.mock("@/lib/db", () => ({ query: vi.fn() }))` in API route tests.
  - `pg` — `vi.mock("pg")` + `vi.resetModules()` / `delete globalThis._pgPool` in db tests.
  - `next/dynamic` — mock to return a plain stub component in MapLoader tests.
  - Child components (`AreaNav`, `MapView`, `LayerPanel`, `CustomLayerPanel`, `InfoPanel`) — `vi.mock` with data-attribute stubs in `MapWithNav` tests to isolate state wiring.
- **Coverage**: `@vitest/coverage-v8` must match Vitest's major version (both v3). The `vite` package must be installed explicitly as a dev dependency.
- **AI route**: `POST /api/ai` accepts `{ messages: ChatCompletionMessageParam[], maxTokens?: number, temperature?: number }` and returns `{ content: string, model: string, usage: {promptTokens, completionTokens, totalTokens} | null }`. Uses the `openai` npm SDK with a custom `baseURL` (`CM_BASE_URL + "/v1"`) to call ConfidentialMind's Gemma-4 endpoint. Returns 503 when `CM_BASE_URL`/`CM_API_KEY` are absent, 502 on `OpenAI.APIError`, 400 on bad input. `src/lib/ai.ts` exports `createAIClient()` (factory, not singleton) and `CM_MODEL` constant. No `NEXT_PUBLIC_` prefix — credentials never reach the browser.
- **Coverage summary (last run — 437 tests)**: All API routes 100% except `route-intelligence/route.ts` ~96% (uncovered: empty-body edge at lines 110–111 and non-ok early return at 199–200). All lib modules 100% (`routing.ts` 100% including new vehicle/hazard types, `ai.ts` 100%). `AreaNav.tsx` 100%, `LayerPanel.tsx` 100%, `DrawingToolbar.tsx` 100%, `FeatureDialog.tsx` 100%, `InfoPanel.tsx` 100%, `ElectionPieChart.tsx` 100% stmts/lines, `RoutePanel.tsx` ~98.6%, `CustomLayerPanel.tsx` ~98%, `WeatherWidget.tsx` 100%, `DatePicker.tsx` 100%, `MapWithNav.tsx` ~86%, `MapView.tsx` ~86% stmts/lines (branch gaps at async null guards inside callbacks — expected), `MapLoader.tsx` 100% stmts/lines.
- **RoutePanel debounce testing**: Uses `vi.advanceTimersByTimeAsync(400)` for route fetch and `vi.advanceTimersByTimeAsync(600)` for intelligence fetch inside `act()` to properly flush microtasks after the debounced async fetch inside `setTimeout`.

## Key Patterns

- **Mapbox SSR guard**: `mapbox-gl` uses `window` at import time. `MapLoader` wraps `MapWithNav` with `next/dynamic({ ssr: false })` so it is never imported in the server bundle.
- **Map init**: `MapView` holds the DOM container via `containerRef` and the `Map` instance via `mapRef` (not state). Initialised once in `useEffect([], [])` with cleanup `map.remove()`.
- **AOI layers**: On `map.on('style.load', ...)`, `MapView` adds a single GeoJSON source (`aoi-source`) with all three AOI bounding-box polygons, then an `aoi-fill` layer (opacity 0.12) and `aoi-outline` layer (width 2), both using `["get", "color"]` data-driven expressions.
- **AOI navigation**: `MapWithNav` owns `selectedAreaId` state. When it changes, a `useEffect` in `MapView` calls `map.fitBounds(area.bbox, { padding: 60, duration: 1200 })`.
- **AOI data module**: `src/lib/areas.ts` exports `AREAS_OF_INTEREST` — the single source of truth for bbox, color, and description. Bboxes are `[minLng, minLat, maxLng, maxLat]` EPSG:4326, directly usable in PostGIS `ST_MakeEnvelope`.
- **DB singleton**: `global._pgPool` prevents creating a new pool on every hot reload in dev. API routes import `query` from `@/lib/db`.
- **GeoJSON API**: `GET /api/features?bbox=minLng,minLat,maxLng,maxLat` — validates bbox, queries PostGIS with `ST_MakeEnvelope` / `ST_Intersects` / `ST_AsGeoJSON`, returns `FeatureCollection`. Degrades gracefully (empty collection) when `DATABASE_URL` is absent.
- **Cell tower API**: `GET /api/cell-towers?bbox=minLng,minLat,maxLng,maxLat` — queries `cell_towers` table (PostGIS GIST index on `geom`), returns up to 2000 features with properties `id, radio, aoi_id, range_m, avg_signal, samples`. Same bbox validation and graceful degradation as the features route. `parseBbox` is imported from `@/app/api/features/route`.
- **Cell tower overlay**: On `style.load` (async callback), `MapView` adds `cell-towers-source` (GeoJSON, `cluster:true`, `clusterMaxZoom:14`, `clusterRadius:50`) and six layers: `cell-towers-clusters` (circle, color `#94a3b8`), `cell-towers-cluster-count` (symbol), plus four per-radio-type **symbol** layers — `cell-towers-gsm`, `cell-towers-umts`, `cell-towers-lte`, `cell-towers-cdma` — each using a NATO milsymbol icon registered via `map.addImage()`. Icons are generated by `createMilsymbolImage` (SIDC `SFGPUUSR-------`, Friendly Ground Signal Radio Unit) with friendly blue `fillColor` (`#3b82f6`) and `uniqueDesignation` text (GSM/UMTS/LTE/CDMA). The four images are loaded in parallel via `Promise.all` before the layers are added. The two cluster layers start hidden if all four cell-type toggles are off. `fetchCellTowers(map, rawDataRef, visRef)` is called immediately after `style.load` and on every `moveend`; it fetches `/api/cell-towers?bbox=...`, stores the raw `FeatureCollection` in `rawTowerDataRef`, then pushes a filtered copy (via `filterByEnabled`) to the source so cluster counts only reflect enabled radio types.
- **Cell tower popup**: Clicking any of the four per-type layers opens a `mapboxgl.Popup` showing radio type, AOI, estimated range (m), and average signal (dBm). Cursor changes to `pointer` on hover.
- **Elevation click**: A general `map.on("click", async (e) => { … })` handler (no layer argument, registered once inside `if (!eventsAttachedRef.current)`) fetches `GET /api/elevation?lng=&lat=` for every map click and calls `onInfoPanel` with 5 rows: Elevation (m), Coordinates, AOI, Source ("NLS Finland DEM (50 m)"), Source dist (m). If `elevation_m` is `null` (outside all AOIs), calls `onInfoPanel(null)`. Errors are caught silently — elevation is supplementary context. An amber 14 px `mapboxgl.Marker` (`elevationMarkerRef`) is placed at the click point and removed on the next click, on InfoPanel close, or on map teardown. Extensibility point: future point-query routes (temperature, etc.) follow the same pattern and add rows without UI changes.
- **Elevation API**: `GET /api/elevation?lng=&lat=` — queries `height_data` table using PostGIS KNN (`ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1,$2),4326) LIMIT 1`) with `ST_Distance(geom::geography,…::geography) AS dist_m`. Returns `{ elevation_m, aoi_id, grid_file, dist_m }` on hit, `{ elevation_m: null }` when outside all AOIs, degrades gracefully when `DATABASE_URL` absent. `height_data` has ~1.9 M rows at 50 m resolution with a GiST index on `geom`.
- **InfoPanel**: Generic right-side panel (`absolute right-4 top-1/2 -translate-y-1/2`) driven by `InfoPanelData { title: string; rows: [string, string|null|undefined][]; component?: React.ReactNode }`. `MapWithNav` owns `infoPanelData` state and passes `onInfoPanel={setInfoPanelData}` to `MapView`. Used for municipality clicks (includes demographics + election chart when available) and elevation clicks; any future layer can open it by calling `onInfoPanel?.({title, rows})`. The optional `component` is rendered below the rows section (used for `ElectionPieChart`). Dismissed via the `×` button (`aria-label="close info panel"`).
- **Municipality demographics**: Clicking a municipality shows Code, Region, and — when the `municipality_demographics` table has a matching row — Population (Finnish locale formatting), Male/Female counts + percentages, Under 15 count + %, Over 65 count + %, and Data year. The `municipalities-fill` click handler checks `p.population != null` before appending the demographic rows (graceful degradation if the LEFT JOIN misses). Ingested via `scripts/ingest_demographics.py` from `data/demographic_data.json` (Statistics Finland, 308 municipalities, 2025 data). DB table: `municipality_demographics` — `nat_code TEXT PRIMARY KEY`, plus `til_vuosi`, `population`, `male/female` counts + pcts, `age_0_14/age_15_64/age_65plus` counts + pcts.
- **Municipality election data**: Clicking a municipality also shows an `ElectionPieChart` in the InfoPanel `component` slot — a pure inline SVG pie chart of 2023 parliamentary election vote shares by party, plus a top-4 party list. Parties with share < 2% are grouped into an "Other" slice. Party colors are official Finnish party colors (KOK `#1D5091`, PS `#003580`, SDP `#CC0000`, KESK `#00873E`, VIHR `#82B300`, VAS `#D32F2F`, RKP `#FFD700`, KD `#003F87`, LIIKE `#F06400`). Ingested via `scripts/ingest_elections.py` from `data/election_data.csv` (Statistics Finland, 2023, cp1252 encoding, wide format transposed to 6 132 rows). DB tables: `municipality_elections(nat_code, party, vote_share, PK(nat_code,party))` + `municipality_election_summary(nat_code PK, parties JSONB)`. The API LEFT JOINs `municipality_election_summary`; the click handler parses `election_data` JSON and passes `<ElectionPieChart>` as the `component` field; degrades gracefully to null when absent.
- **Weather widget**: When `selectedAreaId !== null`, `MapWithNav` renders a `WeatherWidget` + `DatePicker` block (`absolute left-4 top-16 z-10`). `selectedDay` state (default: today's month/day) is shared between them. `WeatherWidget` fetches `/api/weather?region&month&day` on prop change via `useEffect` + `AbortController`; shows avg temp ± spread, ↑max/↓min, rain probability %, avg mm on wet days. Falls back to "No data" when `sampleSize === 0`. `DatePicker` renders two `<select>` dropdowns (Month Jan–Dec, Day 1–31 clamped to month max); Feb max is 29 to allow leap years.
- **Weather API**: `GET /api/weather?region=turku|karjala|lappi&month=1-12&day=1-31` — runs a single aggregate SQL over `weather_observations` table. `COUNT(precip_mm)` (non-NULL only) gives rain probability; `-1` precip was converted to `NULL` at ingestion so the SQL needs no special handling. Returns `WeatherStats` JSON; degrades gracefully to zeroed stats (200) when DB is absent or throws.
- **Weather DB table**: `weather_observations` — columns `id, region_id, year, month, day, precip_mm (nullable), mean_temp, max_temp, min_temp`. Index on `(region_id, month, day)`. Ingested via `scripts/ingest_weather.py` from `data/weather/{region}_weather.csv` (FMI station data 2016–2026). `-1` precip stored as NULL; rows with missing temperature readings skipped.
- **Layer toggle system**: `src/lib/layers.ts` exports `LayerKey` (13 values: `satellite`, `terrain3d`, `hillshade`, `contours`, `landcover`, `cellGSM`, `cellUMTS`, `cellLTE`, `cellCDMA`, `roads`, `bridges`, `railways`, `municipalities`), `LayerVisibility`, `DEFAULT_LAYER_VISIBILITY` (cell types all default `true`, terrain3d `false`, satellite `false`), and `LAYER_GROUPS` (maps each key to the Mapbox layer IDs it controls). `MapWithNav` owns `layerVisibility` state and a `handleToggle` callback, passing them to both `LayerPanel` and `MapView`.
- **Dark theme**: On `style.load`, `map.setConfigProperty("basemap", "lightPreset", "night")` switches the Mapbox Standard basemap to night mode. Military basemap hardening also disables POI/transit labels, 3D objects, and sets water to dark blue (`#0d2137`). `globals.css` overrides `.mapboxgl-ctrl-group` styles to match the slate dark palette (`#1e293b` bg, `#334155` borders, inverted SVG icons). AreaNav inactive buttons use `border-white/30`.
- **Default map view**: Centre `[21.5, 60.2]` (Archipelago Sea, Finland), zoom 7. Mapbox Standard style (night preset).
- **LayerPanel**: Floating dark-slate panel (`absolute left-4 bottom-10`) with collapsible sections — BASEMAP (Satellite View), TERRAIN (3D Terrain, Hillshade), ELEVATION (Contour Lines), VEGETATION (Land Cover), INFRA (Roads, Bridges, Railways, Municipalities), COMMS (GSM, UMTS, LTE, CDMA). Each row is a checkbox with a colored dot calling `onToggle(key)`. COMMS dot colors match the map marker colors exactly.
- **Terrain & intelligence layers**: On `style.load`, `MapView` adds two Mapbox-hosted sources — `mapbox-dem` (raster-dem, `mapbox://mapbox.mapbox-terrain-dem-v1`) and `terrain-v2` (vector, `mapbox://mapbox.mapbox-terrain-v2`) — and five layers in Standard style slots: `hillshading` (hillshade, slot `bottom`), `landcover-military` (fill from `landcover` source-layer, GO/SLOW-GO/NO-GO colours, slot `bottom`), `contours-minor` + `contours-major` (lines from `contour` source-layer, slot `bottom`), `contours-labels` (symbol, slot `middle`).
- **Layer visibility sync**: A `useEffect([layerVisibility])` in `MapView` guarded by `styleLoadedRef` (1) updates `layerVisibilityRef.current`, (2) calls `source.setData(filterByEnabled(rawTowerDataRef.current, layerVisibility))` so cluster counts immediately reflect the current toggles, (3) iterates `LAYER_GROUPS` calling `map.setLayoutProperty(layerId, 'visibility', ...)`, (4) calls `map.setTerrain({...})` / `map.setTerrain(null)` for `terrain3d`, (5) applies `clustersVisible` (OR of the four cell-type flags) to the two cluster layers so they hide when all COMMS types are off, and (6) handles `satellite` style switch.
- **Cell tower source filtering**: `filterByEnabled(data, vis)` returns a new `FeatureCollection` containing only features whose `radio` property matches an enabled type (fast-path returns `data` unchanged when all four types are on). Raw fetched data is kept in `rawTowerDataRef`; `layerVisibilityRef` gives async `moveend` handlers access to the current toggle state without closing over a stale value.
- **3D terrain**: When `layerVisibility.terrain3d` is true, `map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })` enables terrain extrusion. When false, `map.setTerrain(null)` flattens the map. Hillshade and contours remain readable in 2D mode.

## Route Planning

- **Architecture**: `RoutePanel` (client component) owns waypoints internally and posts to `POST /api/route-plan`. The API route is a server-side proxy to the Mapbox Directions API — this keeps `NEXT_PUBLIC_MAPBOX_TOKEN` out of client bundle network calls and provides a single caching/rate-limit point.
- **`src/lib/routing.ts`**: `RouteProfile` (`driving|walking|cycling|driving-traffic`), `Waypoint`, `PlannedRoute`, `RouteLeg`, `RouteStep` types. `PROFILE_COLORS` map drives both the route line paint and waypoint marker colors. `formatDuration`/`formatDistance`/`profileLabel` helpers.
- **`POST /api/route-plan`**: validates 2–25 `[lng, lat]` waypoints + profile. Calls `https://api.mapbox.com/directions/v5/mapbox/{profile}/{coords}?geometries=geojson&steps=true&overview=full`. Returns `PlannedRoute` JSON. 503 when token absent, 502 on Mapbox error, 404 when no route found.
- **RoutePanel** (`absolute left-4 bottom-40 z-10`): `forwardRef` with `RoutePanelHandle.addWaypoint(coords)`. Profile selector with 4 emoji icons. Waypoint list with up/down reorder and × remove. 400 ms debounced fetch fires when ≥2 waypoints. Route summary and per-leg step accordion. "Add Stop" triggers `onAddingWaypointChange(true)`.
- **Waypoint placement flow**: `RoutePanel` → `onAddingWaypointChange(true)` → `MapWithNav.addingWaypoint=true` → `MapView` cursor=crosshair + `addingWaypointRef=true`. Map click fires `onWaypointClick([lng,lat])` → `MapWithNav.handleWaypointClick` → `routePanelRef.current.addWaypoint(coords)` + `setAddingWaypoint(false)`.
- **MapView route layer**: `route-source` (GeoJSON, empty at init) + `route-line` (line, width 5, slot `top`) added in `style.load`. `useEffect([plannedRoute, routeProfile])` updates source data and repaints line color via `setPaintProperty`. `useEffect([routeWaypoints])` creates/destroys numbered `mapboxgl.Marker` elements. Markers cleaned up on unmount.
- **Waypoint intercept**: The existing general `map.on("click", …)` elevation handler checks `addingWaypointRef.current` first. If true, fires `onWaypointClickRef.current([lng, lat])` and returns — elevation fetch is skipped.

### Route Intelligence (Phase 2)

- **`src/lib/routing.ts` additions**: `VehicleProfile` interface + `VEHICLE_PRESETS` (Infantry, Wheeled APC, IFV/BMP-type, MBT/tank, Custom). `HazardSeverity` (`critical|warning|info`), `RouteHazard`, `RouteIntelligence` types.
- **`POST /api/route-intelligence`**: accepts `{ routeGeometry: GeoJSON.LineString, vehicle: VehicleProfile }`. Runs two PostGIS queries in parallel — roads (`ST_DWithin(geom::geography, route_geom::geography, 20)`, `DISTINCT ON (link_id)`, LIMIT 500) and bridges (`ST_DWithin`, 50 m buffer). Classifies each row against vehicle profile: 10 road rules (mass/bogie/axle/width/height limits, damage, condition class, rut depth, pavement) and 5 bridge rules (vehicle/bogie/axle mass, height, status). Infantry (`mass_t=0`) skips all mass-based checks. Sorts CRITICAL→WARNING→INFO. Returns `{ hazards[], summary: { critical, warning, info, passable } }`. 503 when `DATABASE_URL` absent, 400 on bad input.
- **`RoutePanel` vehicle section**: `<select>` with 5 presets auto-fills 5 editable `<input type="number">` fields (mass/axle/bogie/height/width). Editing any field switches preset to "Custom".
- **`RoutePanel` Route Assessment section**: `useEffect([route, vehicle])` debounced 600 ms — fetches `POST /api/route-intelligence` when route is set. Shows passable (green) or impassable (red) summary. Severity-colored hazard rows (clickable → `onHazardFocus`). Clearing intelligence is handled by the route-fetch effect's early return (waypoints < 2) and the intelligence effect's callback-only early return when `!route`.
- **`MapWithNav` intelligence state**: `routeIntelligence: RouteIntelligence | null`, `focusedHazard: RouteHazard | null`. `handleHazardsChange` sets intelligence and clears `focusedHazard` when null. `handleHazardFocus` sets `focusedHazard` and builds InfoPanel rows (bridge: name/mass/height/status; road: mass/width/condition). InfoPanel `onClose` clears `focusedHazard`.
- **`MapView` hazard layers**: `route-hazards-source` (GeoJSON) + three circle layers (`route-hazards-critical` red r=8, `route-hazards-warning` amber r=6, `route-hazards-info` slate r=5), all slot `top`. `useEffect([routeHazards])` converts array to `FeatureCollection`. `useEffect([focusedHazard])` calls `map.flyTo({ center, zoom: 15, duration: 800 })` and places a color-coded `mapboxgl.Marker` (`hazardFocusMarkerRef`); removed on next focus change or unmount.

## Collaborative Drawing Layers

### Database Schema (run `.local/setup_custom_layers.sql` to create)

Two PostGIS tables:

- **`custom_layers`**: `id UUID`, `name TEXT`, `description TEXT`, `color TEXT`, `created_at`, `updated_at`. One row per user-created named layer.
- **`custom_features`**: `id UUID`, `layer_id UUID` (FK → cascade), `name TEXT`, `description TEXT`, `feature_type TEXT` (`Point|LineString|Polygon|Rectangle`), `geom GEOMETRY(Geometry,4326)`, `color TEXT`, `properties JSONB`, `created_at`, `updated_at`. GIST index on `geom`. The `properties` JSONB column is reserved for future military symbol data (SIDC, milsymbol options) without schema migration.

### API Routes (`/api/custom-layers`)

| Method | Path                                        | Purpose                               |
| ------ | ------------------------------------------- | ------------------------------------- |
| GET    | `/api/custom-layers`                        | List all layers                       |
| POST   | `/api/custom-layers`                        | Create a layer                        |
| DELETE | `/api/custom-layers/[id]`                   | Delete layer + cascade features       |
| GET    | `/api/custom-layers/[id]/features?bbox=...` | Bbox-scoped feature fetch             |
| POST   | `/api/custom-layers/[id]/features`          | Create a feature (ST_GeomFromGeoJSON) |
| PUT    | `/api/custom-layers/[id]/features/[fid]`    | Update name/description/color         |
| DELETE | `/api/custom-layers/[id]/features/[fid]`    | Delete a single feature               |

All routes degrade gracefully (empty response / 503) when `DATABASE_URL` is absent.

### Drawing System

- **`@mapbox/mapbox-gl-draw`** integrated into `MapView` via `drawRef`. Rectangle mode via `mapbox-gl-draw-rectangle-mode` plugin registered as `draw_rectangle` mode.
- **Draw control** is initialised in the one-shot `useEffect` after map load; `map.addControl(draw)` makes it SSR-safe since `MapView` is already inside `MapLoader`'s `next/dynamic({ ssr: false })`.
- **Draw events**: `draw.create` → opens `FeatureDialog`; on save → `POST /api/custom-layers/[id]/features` → refresh source. On discard → `draw.delete(featureId)`. `draw.selectionchange` → `hasDrawingSelection` state → shows "Delete Selected" button in `DrawingToolbar`.
- **Per-layer Mapbox sources**: Each custom layer gets a Mapbox GeoJSON source `custom-layer-<id>` with three rendering layers: `-fill` (Polygon), `-line` (LineString+Polygon outline), `-circle` (Point). All use `["get", "color"]` data-driven expressions for per-feature colour.
- **Viewport-scoped loading**: Custom layer features are fetched only when a layer is enabled, using current map bbox. Re-fetched on every `moveend` for all enabled layers.
- **Drawing tools**: Point (`draw_point`), Line (`draw_line_string`), Polygon (`draw_polygon`), Rectangle (`draw_rectangle`).
- **Colour palette**: 8 military colours — Red `#ef4444`, Orange `#f97316`, Yellow `#eab308`, Green `#22c55e`, Blue `#3b82f6`, Cyan `#06b6d4`, White `#f8fafc`, Purple `#a855f7`. Stored per feature in `custom_features.color`.

### State Ownership

- **`MapWithNav`** owns: `customLayers[]`, `enabledCustomLayerIds: Set<string>`, `activeDrawingLayerId: string|null`, `infoPanelData`, `selectedDay: {month, day}` (defaults to today). Fetches layer list on mount. Handles `onCreateLayer`/`onDeleteLayer`/`onToggleLayer`/`onSetActiveDrawingLayer`/`onCancelDrawing`.
- **`MapView`** owns internally: `activeDrawingTool`, `activeDrawingColour`, `hasDrawingSelection`, `dialogOpen`. Renders `DrawingToolbar` and `FeatureDialog` inside its own container (positioned absolutely within `relative w-full h-full` wrapper).
- **`CustomLayerPanel`** (bottom-right): collapsible list with toggle checkbox, colour dot, active-drawing selector (click layer name), inline delete confirm, inline create form.
- **`DrawingToolbar`** (top-right, only when a drawing layer is active): tool buttons, colour swatches, cancel button, "Delete Selected" (when Draw control has a selection).
- **`FeatureDialog`**: modal that appears after `draw.create`; Name + Description fields; Save → POST to API; Discard → `draw.delete`.

## Environment Variables

| Variable                   | Where used                                   |
| -------------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | `MapView.tsx` — `mapboxgl.accessToken`       |
| `DATABASE_URL`             | `src/lib/db.ts` — `pg.Pool` connectionString |
| `CM_BASE_URL`              | `src/lib/ai.ts` — ConfidentialMind project endpoint (server-side only) |
| `CM_API_KEY`               | `src/lib/ai.ts` — ConfidentialMind JWT bearer token (server-side only) |
| `CM_MODEL_NAME`            | `src/lib/ai.ts` — model ID, defaults to `google/gemma-4-31B-it`        |

Set both in `.env.local` (git-ignored).

## Data Architecture & Flow

- **Base Map Layers (Terrain, General Roads, Elevation)**: Rendered natively via Mapbox's built-in standard vector tile APIs. No self-hosted tile server needed.
- **Custom Overlay Layers (Cell Towers, Medical Facilities, Units, POIs)**: Fetched as GeoJSON from dedicated API routes (`/api/cell-towers`, `/api/features`, etc.) and rendered by Mapbox GL JS on the client. Cell towers are live — fetched on every viewport change.
- **Collaborative Drawing Layers**: User-created named layers stored in PostGIS. Features drawn with `@mapbox/mapbox-gl-draw`, saved to `custom_features` table, and loaded on-demand per viewport when a layer is enabled.
- **Dynamic Dashboard**: As the user pans/zooms, the frontend passes the bounding box to API routes to query PostGIS for summary statistics (population, bridge capacity, etc.).

## Key Features to Implement

1. **Interactive Map Layer**: Critical infrastructure, terrain features (GO / SLOW GO / NO GO), weather impacts.
2. **Dynamic Viewport Clustering**: Mapbox native `cluster: true` for dense point layers (cell towers implemented; demographics pending).
3. **Military Symbology**: `milsymbol` library for NATO APP-6 / US MIL-STD-2525 icons — **implemented for cell towers** (SIDC `SFGPUUSR-------`, colour-coded per radio type). Pending: unit markers on custom layers (SIDC field in `custom_features.properties` JSONB ready).
4. **Collaborative Drawing**: **Implemented** — custom named layers with Point/Line/Polygon/Rectangle drawing, per-feature colours, free-text annotation, shared across all users via PostGIS.
5. **Chokepoint & Logistics Analysis**: Road segments with bridge weight/height limits for heavy armour / convoy routing.
6. **Explainability Panel**: UI showing active data sources and timestamps for analyst trust.

## Primary Open-Source Data Sources

- **Terrain & Topography**: National Land Survey of Finland (NLS) GeoPackages.
- **Transportation (Roads/Bridges)**: Digiroad from the Finnish Transport Infrastructure Agency (FTIA).
- **Weather**: Finnish Meteorological Institute (FMI) Open Data WFS.
- **Demographics**: Statistics Finland (Paavo) 1km × 1km grid data.
- **Space & Comm Signatures**: N2YO REST API for satellite groundtracks; OpenCelliD / CellMapper for cellular networks.
