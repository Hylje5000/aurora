# Implementation Plan: Cellular Coverage Along Route

**Date:** 2026-05-16
**Branch:** `feat/cell-coverage`
**Design doc:** `MODIFICATION_DESIGN.md`

---

## Phases

### Phase 0 — Baseline health check

- [ ] Run `npm test` to confirm the suite is green before any changes.

---

### Phase 1 — Types (`src/lib/routing.ts`)

- [ ] Add `CoverageAnalysis` interface:
  ```typescript
  export interface CoverageAnalysis {
    route_length_m: number;
    covered_pct: number;
    gap_count: number;
    longest_gap_m: number;
    gap_geometry: GeoJSON.Geometry | null;
  }
  ```
- [ ] Add `coverage?: CoverageAnalysis | null` field to `RouteIntelligence`.
- [ ] Add unit tests for any new helper functions (none in this phase — types only).
- [ ] Run `tsc --noEmit` and fix type errors.
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `next lint --fix`.
- [ ] Run `prettier --write .`.
- [ ] Update journal below.
- [ ] `git diff` → present commit message for user approval.
- [ ] Wait for approval, then commit.

---

### Phase 2 — API: coverage query (`src/app/api/route-intelligence/route.ts`)

- [ ] Add `CoverageRow` interface for the DB result.
- [ ] Add coverage query to the `Promise.all` array (third entry):
  ```sql
  WITH route AS (SELECT ST_GeomFromGeoJSON($1) AS geom),
  towers AS (
    SELECT geom, COALESCE(range_m, 500)::float AS range_m
    FROM cell_towers
    WHERE ST_DWithin(geom::geography,
                     (SELECT geom::geography FROM route), 15000)
  ),
  coverage_union AS (
    SELECT ST_Union(ST_Buffer(t.geom::geography, t.range_m)::geometry) AS geom
    FROM towers t
  ),
  uncovered AS (
    SELECT ST_Difference(
      (SELECT geom FROM route),
      COALESCE((SELECT geom FROM coverage_union),
               'GEOMETRYCOLLECTION EMPTY'::geometry)
    ) AS geom
  ),
  covered AS (
    SELECT ST_Intersection(
      (SELECT geom FROM route),
      COALESCE((SELECT geom FROM coverage_union),
               'GEOMETRYCOLLECTION EMPTY'::geometry)
    ) AS geom
  )
  SELECT
    ST_AsGeoJSON(u.geom)                           AS gap_geojson,
    ST_Length((SELECT geom::geography FROM route)) AS route_length_m,
    ST_Length(c.geom::geography)                   AS covered_length_m,
    ST_Length(u.geom::geography)                   AS uncovered_length_m,
    ST_NumGeometries(u.geom)                       AS gap_count,
    (SELECT MAX(ST_Length(part::geography))
     FROM ST_Dump(u.geom) AS d(path, part))        AS longest_gap_m
  FROM uncovered u, covered c
  ```
- [ ] Parse the result row into `CoverageAnalysis`; handle empty/null cases gracefully.
- [ ] Attach `coverage` to the returned `RouteIntelligence` object.
- [ ] Wrap the coverage query in its own try/catch so a PostGIS failure on coverage does not break road/bridge hazard results — degrade to `coverage: null`.
- [ ] Add/update tests in `src/test/api/route-intelligence.test.ts`:
  - [ ] `mockQuery` now called 3× — update all existing test stubs with a third `.mockResolvedValueOnce`.
  - [ ] New test: coverage result with gap returned.
  - [ ] New test: full coverage (gap_geojson is empty geometry → `covered_pct = 100`).
  - [ ] New test: no towers near route (coverage empty → `covered_pct = 0`).
  - [ ] New test: coverage query throws → `coverage: null` but hazards still returned.
- [ ] Run `tsc --noEmit`.
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `next lint --fix`.
- [ ] Run `prettier --write .`.
- [ ] Update journal.
- [ ] `git diff` → present commit message for user approval.
- [ ] Wait for approval, then commit.

---

### Phase 3 — Layers config (`src/lib/layers.ts`)

- [ ] Add `"cellCoverageCircles"` to `LayerKey` union type.
- [ ] Add `cellCoverageCircles: boolean` to `LayerVisibility` interface.
- [ ] Set `cellCoverageCircles: false` in `DEFAULT_LAYER_VISIBILITY`.
- [ ] Add `cellCoverageCircles: ["coverage-circles-fill", "coverage-circles-line"]` to `LAYER_GROUPS`.
- [ ] Update `src/test/lib/layers.test.ts` to include `cellCoverageCircles` in key-completeness assertions.
- [ ] Run `tsc --noEmit`.
- [ ] Run `npm test`.
- [ ] Run `next lint --fix`.
- [ ] Run `prettier --write .`.
- [ ] Update journal.
- [ ] `git diff` → present commit message for user approval.
- [ ] Wait for approval, then commit.

---

### Phase 4 — MapView: gap overlay + coverage circles

- [ ] Add `routeCoverageGaps?: GeoJSON.Geometry | null` to `MapViewProps`.
- [ ] Add `towerToCirclePolygon(lng, lat, radiusM)` utility function inside `MapView.tsx` (file-private).
- [ ] On `style.load`, add:
  - `route-coverage-gaps-source` (GeoJSON, empty FeatureCollection)
  - `route-coverage-gaps-line` layer (line, `#ef4444`, width 6, dashed `[6, 4]`, slot `top`)
  - `coverage-circles-source` (GeoJSON, empty FeatureCollection)
  - `coverage-circles-fill` layer (fill, `#3b82f6`, opacity 0.07, slot `bottom`)
  - `coverage-circles-line` layer (line, `#3b82f6`, width 1, opacity 0.3, slot `bottom`)
- [ ] Add `useEffect([routeCoverageGaps])` to sync gap source.
- [ ] Extend `fetchCellTowers` (or add a `useEffect([rawTowerData, layerVisibility.cellCoverageCircles])`) to regenerate circle polygons from `rawTowerDataRef` and push to `coverage-circles-source`.
- [ ] Include `routeCoverageGaps` default value in function signature (`= null`).
- [ ] Update `src/test/components/MapView.test.tsx`:
  - [ ] Verify `route-coverage-gaps-source` is added on style load.
  - [ ] Verify `useEffect` syncs gap geometry to source.
  - [ ] Verify `coverage-circles-fill` and `coverage-circles-line` layers added.
- [ ] Run `tsc --noEmit`.
- [ ] Run `npm test`.
- [ ] Run `next lint --fix`.
- [ ] Run `prettier --write .`.
- [ ] Update journal.
- [ ] `git diff` → present commit message for user approval.
- [ ] Wait for approval, then commit.

---

### Phase 5 — RoutePanel: coverage UI

- [ ] In the Route Assessment block of `RoutePanel.tsx`, add a COMMS COVERAGE sub-section after the hazard list:
  - Shown when `intelligence?.coverage` is present (non-null).
  - Coverage bar: 12 block chars, `▓` for covered fraction, `░` for uncovered.
  - `✓ Full cellular coverage` when `covered_pct === 100`.
  - `X gap(s) · longest X.X km` when gaps exist.
  - `No coverage data` when `coverage` is null.
- [ ] Update `src/test/components/RoutePanel.test.tsx`:
  - [ ] Coverage block shows when intelligence has `coverage` data.
  - [ ] Coverage bar renders correct proportion.
  - [ ] Full-coverage message renders.
  - [ ] Null coverage shows "No coverage data".
- [ ] Run `tsc --noEmit`.
- [ ] Run `npm test`.
- [ ] Run `next lint --fix`.
- [ ] Run `prettier --write .`.
- [ ] Update journal.
- [ ] `git diff` → present commit message for user approval.
- [ ] Wait for approval, then commit.

---

### Phase 6 — LayerPanel: Coverage Circles toggle

- [ ] Add a row in the COMMS section of `LayerPanel.tsx`:
  ```
  cellCoverageCircles → "Coverage Circles" · cyan dot (#06b6d4)
  ```
- [ ] Update `src/test/components/LayerPanel.test.tsx` to assert the new row renders and fires `onToggle("cellCoverageCircles")`.
- [ ] Run `tsc --noEmit`.
- [ ] Run `npm test`.
- [ ] Run `next lint --fix`.
- [ ] Run `prettier --write .`.
- [ ] Update journal.
- [ ] `git diff` → present commit message for user approval.
- [ ] Wait for approval, then commit.

---

### Phase 7 — MapWithNav wiring

- [ ] Derive `routeCoverageGaps` from `routeIntelligence?.coverage?.gap_geometry ?? null`.
- [ ] Pass it to `<MapView routeCoverageGaps={routeCoverageGaps} … />`.
- [ ] Update `src/test/components/MapWithNav.test.tsx` if the stub MapView needs the new prop.
- [ ] Run `tsc --noEmit`.
- [ ] Run `npm test`.
- [ ] Run `next lint --fix`.
- [ ] Run `prettier --write .`.
- [ ] Update journal.
- [ ] `git diff` → present commit message for user approval.
- [ ] Wait for approval, then commit.

---

### Phase 8 — Final wrap-up

- [ ] Run `npm run test:coverage` and record summary in journal.
- [ ] Update `README.md` to mention cellular coverage analysis.
- [ ] Update `CLAUDE.md` — add `CoverageAnalysis` type, `cellCoverageCircles` LayerKey, and coverage gap layer to the relevant sections.
- [ ] Ask user to inspect the running app and confirm satisfaction.

---

## Journal

*(Updated after each phase.)*

### Pre-flight
- Suite baseline: TBD.
