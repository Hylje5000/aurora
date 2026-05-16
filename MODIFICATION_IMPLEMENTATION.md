# Implementation Plan: Elevation Click Feature

## Overview

Add on-demand terrain elevation lookup: user clicks anywhere on the map → amber marker pin appears at click point → InfoPanel shows elevation, coordinates, AOI, and source distance pulled from the NLS Finland DEM stored in PostGIS `height_data`.

---

## Phase 0 — Baseline verification

- [ ] Run `npm test` to confirm the project is in a good state before starting.
- [ ] Record the test count and any pre-existing failures in the Journal.

---

## Phase 1 — API Route (`src/app/api/elevation/route.ts`)

- [ ] Create `src/app/api/elevation/route.ts` implementing `GET /api/elevation?lng=&lat=`.
  - Parse and validate `lng` and `lat` as finite numbers; return 400 on invalid input.
  - Guard with `if (!process.env.DATABASE_URL)` → return `{ elevation_m: null }`.
  - Run KNN query: `ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326) LIMIT 1`.
  - Include `ST_Distance(geom::geography, …::geography) AS dist_m` for transparency.
  - Return `{ elevation_m, aoi_id, grid_file, dist_m }` on hit, `{ elevation_m: null }` on empty result.
  - Wrap DB call in try/catch → 500 on error.
- [ ] Create `src/test/api/elevation.test.ts` covering:
  - Missing `lng` or `lat` → 400
  - Non-numeric params → 400
  - `DATABASE_URL` absent → 200 `{ elevation_m: null }`
  - DB returns a row → 200 with all fields
  - DB returns no rows (outside AOI) → 200 `{ elevation_m: null }`
  - DB throws → 500
- [ ] Run `next lint --fix` and fix any issues.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — suite must be green before proceeding.
- [ ] Run `prettier --write .`.
- [ ] Re-read `MODIFICATION_IMPLEMENTATION.md` and note any changes needed.
- [ ] Update Journal with Phase 1 outcome.
- [ ] Use `git diff` to review changes and draft a commit message, then present it for approval.
- [ ] Wait for approval before committing.

---

## Phase 2 — MapView click handler + marker (`src/components/MapView.tsx`)

- [ ] Add `elevationMarkerRef = useRef<mapboxgl.Marker | null>(null)` alongside existing refs.
- [ ] Inside the `style.load` callback (after all existing layer/event setup), add `map.on("click", async (e) => { … })`:
  - Remove previous marker immediately on each click.
  - Fetch `/api/elevation?lng=${lng.toFixed(6)}&lat=${lat.toFixed(6)}`.
  - On `elevation_m === null` → call `onInfoPanel?.(null)` and return.
  - On hit → place amber 14 px circle Marker at click point, call `onInfoPanel?.({ title, rows })` with 5 rows: Elevation, Coordinates, AOI, Source, Source dist.
  - Catch errors silently (elevation is supplementary).
- [ ] Extend the existing `useEffect([infoPanelOpen])` to remove and null the marker when `infoPanelOpen` becomes false.
- [ ] Add `elevationMarkerRef.current?.remove()` to the map teardown cleanup function.
- [ ] After completing each task, if any TODOs were added or anything left unimplemented, add new tasks to this plan.
- [ ] Update `src/test/components/MapView.test.tsx`:
  - Add elevation fetch mock alongside existing `global.fetch` mock.
  - Add test: click on map → fetch called with correct lng/lat params.
  - Add test: fetch returns elevation data → `onInfoPanel` called with correct rows.
  - Add test: fetch returns `{ elevation_m: null }` → `onInfoPanel` called with `null`.
  - Add test: fetch throws → `onInfoPanel` not called (silent fail).
- [ ] Run `next lint --fix` and fix any issues.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — suite must be green before proceeding.
- [ ] Run `prettier --write .`.
- [ ] Re-read `MODIFICATION_IMPLEMENTATION.md` and note any changes needed.
- [ ] Update Journal with Phase 2 outcome.
- [ ] Use `git diff` to review changes and draft a commit message, then present it for approval.
- [ ] Wait for approval before committing.

---

## Phase 3 — Final verification & documentation

- [ ] Run `npm run test:coverage` and record the coverage summary in the Journal.
- [ ] Manual testing checklist (record results in Journal):
  - [ ] Click on land inside an AOI → amber pin appears, InfoPanel shows elevation + coordinates + AOI.
  - [ ] Click outside all three AOIs → InfoPanel closes.
  - [ ] Click × on InfoPanel → pin disappears.
  - [ ] Click again → new pin replaces old one.
  - [ ] Click on a cell tower → popup appears AND InfoPanel updates with elevation.
  - [ ] Click on a road or bridge → same dual behaviour.
  - [ ] With 3D terrain disabled → elevation still shows.
- [ ] Update `CLAUDE.md` to document:
  - The new `GET /api/elevation` route and its response shape.
  - The `elevationMarkerRef` in MapView and its lifecycle.
  - The "click anywhere" elevation pattern as an established extensibility point.
- [ ] Ask the user to inspect the running app and confirm they are satisfied, or request further changes.

---

## Journal

### Phase 0
_Not started._

### Phase 1
_Not started._

### Phase 2
_Not started._

### Phase 3
_Not started._
