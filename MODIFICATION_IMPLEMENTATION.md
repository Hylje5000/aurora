# Implementation Plan: Cell Tower Overlay — Viewport-Driven API + Map Layer

## Journal

*(Updated after each phase)*

---

## Phase 0 — Baseline health check

- [ ] Run `npm test` and confirm all existing tests pass. Record count in journal.

---

## Phase 1 — API route `/api/cell-towers`

### Tasks

- [ ] Create `src/app/api/cell-towers/route.ts`:
  - Import `parseBbox` from `@/app/api/features/route`.
  - Accept `GET ?bbox=minLng,minLat,maxLng,maxLat`.
  - Return `400` if bbox missing or invalid.
  - Return empty `FeatureCollection` + `X-Aurora-Warning` header if `DATABASE_URL` is absent.
  - Query `cell_towers` with `ST_Intersects` + `ST_MakeEnvelope($1,$2,$3,$4,4326)` `LIMIT 2000`.
  - Map each row to a GeoJSON `Feature` with properties: `id, radio, aoi_id, range_m, avg_signal, samples`.
  - Return `500` with `{ error: "Database query failed" }` on DB error.
- [ ] Create `src/test/api/cell-towers.test.ts`:
  - Mirror the structure of `src/test/api/features.test.ts`.
  - `parseBbox` is already tested — import and test only the `GET` handler here.
  - Cover: missing bbox (400), invalid bbox (400), no `DATABASE_URL` (200 + warning header + empty collection), DB returns rows (200 + correct FeatureCollection shape), DB throws (500).
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix any type errors.
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `prettier --write .`.
- [ ] Re-read this plan; update it if anything changed.
- [ ] Update journal below with findings.
- [ ] Present `git diff` summary and commit message to user for approval. Wait for approval before committing.

---

## Phase 2 — MapView: clustered cell tower layer + fetch

### Tasks

- [ ] Modify `src/components/MapView.tsx`:
  - Add a `fetchCellTowers(map: mapboxgl.Map): Promise<void>` helper inside the component file (not exported):
    - Reads `map.getBounds()` → builds bbox string `minLng,minLat,maxLng,maxLat`.
    - Calls `fetch('/api/cell-towers?bbox=...')`.
    - Parses response JSON as a GeoJSON `FeatureCollection`.
    - Calls `(map.getSource('cell-towers-source') as mapboxgl.GeoJSONSource).setData(data)`.
    - Catches errors with `console.error`.
  - On `style.load`, after adding AOI layers:
    - Add GeoJSON source `cell-towers-source` with empty `FeatureCollection`, `cluster: true`, `clusterMaxZoom: 14`, `clusterRadius: 50`.
    - Add layer `cell-towers-clusters` (type `circle`) for clustered points.
    - Add layer `cell-towers-cluster-count` (type `symbol`) showing cluster count text.
    - Add layer `cell-towers-unclustered` (type `circle`) for individual towers, with a `match` expression on `["get", "radio"]` to color by type: GSM→`#facc15`, UMTS→`#f97316`, LTE→`#22c55e`, CDMA→`#a78bfa`, fallback→`#94a3b8`.
    - Register `map.on('click', 'cell-towers-unclustered', ...)` popup handler.
    - Register `map.on('mouseenter', 'cell-towers-unclustered', ...)` and `map.on('mouseleave', 'cell-towers-unclustered', ...)` for cursor changes.
    - Register `map.on('moveend', () => fetchCellTowers(map))`.
    - Call `fetchCellTowers(map)` immediately after all layers are added (initial load).
  - Popup content: radio type, AOI, estimated range (m), average signal (dBm).
- [ ] Modify `src/test/components/MapView.test.tsx`:
  - Extend the `vi.hoisted` mock to include: `mockGetBounds`, `mockGetSource`, `mockSetData`, `mockPopup` (`setLngLat`, `setHTML`, `addTo`), `MockPopup`.
  - Add to the `mapbox-gl` mock: `Popup: MockPopup`, and wire `getSource` to return `{ setData: mockSetData }`.
  - Add test: `style.load` callback registers `moveend` listener.
  - Add test: `style.load` callback adds `cell-towers-source` with `cluster: true`.
  - Add test: `style.load` callback adds `cell-towers-clusters`, `cell-towers-cluster-count`, `cell-towers-unclustered` layers.
  - Add test: `style.load` callback calls `fetch` (mock global `fetch`) for initial tower load.
  - Add test: `moveend` callback calls `fetch` with updated bbox.
  - Add test: clicking `cell-towers-unclustered` (simulate by invoking the registered click handler) creates and shows a `Popup`.
  - Note: `global.fetch` must be mocked with `vi.fn().mockResolvedValue(...)` returning a valid FeatureCollection.
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix any type errors.
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `prettier --write .`.
- [ ] Re-read this plan; update it if anything changed.
- [ ] Update journal below.
- [ ] Present `git diff` summary and commit message to user for approval. Wait for approval before committing.
- [ ] After committing, verify the change hot-reloads correctly in the browser (confirm towers appear when navigating to a tower-dense AOI).

---

## Phase 3 — Final polish & wrap-up

- [ ] Run `npm run test:coverage` and record the summary in the journal.
- [ ] Update `README.md` if one exists with relevant information about the cell tower overlay.
- [ ] Update `CLAUDE.md` to reflect:
  - New API route `GET /api/cell-towers?bbox=...`.
  - New Mapbox layers: `cell-towers-source`, `cell-towers-clusters`, `cell-towers-cluster-count`, `cell-towers-unclustered`.
  - `fetchCellTowers` helper in `MapView.tsx`.
  - New test file `src/test/api/cell-towers.test.ts`.
- [ ] After completing any task, if TODOs remain in the code or anything is partially implemented, add tasks here to track them.
- [ ] Ask the user to inspect the running app and confirm they are satisfied, or if any modifications are needed.

---

## Journal

### Phase 0 — 2026-05-15
- `npm install` required (node_modules not present). All 48 pre-existing tests passed after install.

### Phase 1 — 2026-05-15
- Created `src/app/api/cell-towers/route.ts` — imports `parseBbox` from the features route to avoid duplication.
- Created `src/test/api/cell-towers.test.ts` — 7 tests, all passing (55 total after phase).
- `next lint --fix` flag not supported in this Next.js version; used `eslint` directly via `npm run lint`.

### Phase 2 — 2026-05-15
- Updated `MapView.tsx` with `fetchCellTowers` helper, clustered GeoJSON source, 3 new layers, `moveend` listener, click popup, and cursor handlers.
- Extended `MapView.test.tsx` mock with `getBounds`, `getSource`, `setData`, `Popup`, and `global.fetch`; added 11 new tests (66 total after phase, all passing).
- Removed an unused `EMPTY_FC` constant caught by lint.

### Phase 3 — 2026-05-15
Coverage summary (66 tests):
- `cell-towers/route.ts`: 100% stmts/branch/funcs/lines
- `features/route.ts`: 100% stmts/branch/funcs/lines
- `areas.ts`: 100% stmts/branch/funcs/lines
- `db.ts`: 100% stmts/branch/funcs/lines
- `AreaNav.tsx`: 100% stmts/branch/funcs/lines
- `MapWithNav.tsx`: 100% stmts/branch/funcs/lines
- `MapView.tsx`: 98.97% stmts/lines, 73.07% branch (gaps at async null guards `if (!bounds) return` and `if (!res.ok) return` — expected, consistent with pre-existing pattern)
- `MapLoader.tsx`: 100% stmts/lines
