# Implementation Plan: AOI Navigation & Highlighting

## Journal

### Phase 0 — 2026-05-15

- Git clean (only MODIFICATION_DESIGN.md and MODIFICATION_IMPLEMENTATION.md modified — expected).
- 20 tests passing across 4 test files before any changes.

### Phase 1 — 2026-05-15

- Created `src/lib/areas.ts` with `AreaOfInterest` interface and `AREAS_OF_INTEREST` array (3 areas: Lappi, Karjala, Turku).
- Created `src/test/lib/areas.test.ts` — 15 tests covering count, unique ids, bbox validity, center validity, center-within-bbox, and description length.
- All 35 tests passing. tsc clean. prettier applied.

---

## Phase 0 — Baseline Verification

- [ ] Run all tests to ensure the project is in a good state before starting modifications.
- [ ] Confirm git status is clean.
- [ ] Note findings in journal.

---

## Phase 1 — Create `src/lib/areas.ts` AOI Data Module

- [ ] Create `src/lib/areas.ts` with the `AreaOfInterest` interface and `AREAS_OF_INTEREST` constant.
  - 3 areas: Lappi (red), Karjala (blue), Turku (green)
  - Each has: `id`, `name`, `bbox: [minLng, minLat, maxLng, maxLat]`, `center`, `color`, `description`
  - Descriptions should be detailed enough to guide future DB ingestion queries.
- [ ] Create `src/test/lib/areas.test.ts`:
  - All 3 areas present
  - `id` values are unique
  - Each `bbox` is a 4-tuple of numbers where `bbox[0] < bbox[2]` and `bbox[1] < bbox[3]`
  - Each `center` is a 2-tuple of numbers
- [ ] After completing tasks, if any TODOs were added to code or anything was left unfinished, add new tasks here.
- [ ] Run `next lint --fix` and fix any issues.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — **all tests must pass. A non-zero exit is a hard blocker.**
- [ ] Run `prettier --write .` for formatting.
- [ ] Re-read this file and update as needed.
- [ ] Update journal with actions taken, learnings, surprises, deviations.
- [ ] Run `git diff`, draft commit message, present to user for approval.
- [ ] Wait for user approval. Do not commit or move to Phase 2 until approved.
- [ ] After committing, verify the dev server hot-reload shows no errors in the browser.

---

## Phase 2 — Create `AreaNav` Component

- [ ] Create `src/components/AreaNav.tsx`:
  - `'use client'` directive
  - Props: `selectedAreaId: string | null`, `onSelect: (id: string) => void`
  - Renders a horizontal flex row of buttons, one per AOI
  - Positioned `absolute top-4 left-1/2 -translate-x-1/2 z-10`
  - Buttons: dark semi-transparent background, rounded, gap between buttons
  - Active button: colored ring/border using the area's color
  - Import `AREAS_OF_INTEREST` from `@/lib/areas`
- [ ] Create `src/test/components/AreaNav.test.tsx`:
  - Renders 3 buttons with correct labels (Lappi, Karjala, Turku)
  - Clicking a button calls `onSelect` with the correct `id`
  - Active button has a distinguishing class/attribute when `selectedAreaId` matches
- [ ] After completing tasks, if any TODOs were added to code or anything was left unfinished, add new tasks here.
- [ ] Run `next lint --fix` and fix any issues.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — **all tests must pass. A non-zero exit is a hard blocker.**
- [ ] Run `prettier --write .` for formatting.
- [ ] Re-read this file and update as needed.
- [ ] Update journal with actions taken, learnings, surprises, deviations.
- [ ] Run `git diff`, draft commit message, present to user for approval.
- [ ] Wait for user approval. Do not commit or move to Phase 3 until approved.
- [ ] After committing, verify the dev server hot-reload shows no errors in the browser.

---

## Phase 3 — Extend `MapView` with AOI Layers + `selectedAreaId` Prop

- [ ] Modify `src/components/MapView.tsx`:
  - Add `selectedAreaId?: string | null` to `MapViewProps`
  - On `map.on('style.load', ...)` (not `map.on('load', ...)`):
    - Build a `GeoJSON.FeatureCollection` with 3 `Feature<Polygon>` entries
    - Each polygon is the closed bbox ring: `[minLng,minLat] → [maxLng,minLat] → [maxLng,maxLat] → [minLng,maxLat] → [minLng,minLat]`
    - `properties: { color, name }` per feature
    - `map.addSource("aoi-source", { type: "geojson", data: featureCollection })`
    - `map.addLayer({ id: "aoi-fill", type: "fill", source: "aoi-source", paint: { "fill-color": ["get", "color"], "fill-opacity": 0.12 } })`
    - `map.addLayer({ id: "aoi-outline", type: "line", source: "aoi-source", paint: { "line-color": ["get", "color"], "line-width": 2 } })`
  - Add `useEffect([selectedAreaId])`:
    - If `selectedAreaId` is null or map not ready, return
    - Find matching area in `AREAS_OF_INTEREST`
    - Call `mapRef.current.fitBounds(area.bbox, { padding: 60, duration: 1200 })`
  - Use `mapRef.current?.isStyleLoaded()` guard or store a `styleLoaded` flag to avoid calling `addSource` before style is ready
- [ ] Modify `src/test/components/MapView.test.tsx`:
  - Extend the existing mapbox-gl mock so the mock Map has `on`, `addSource`, `addLayer`, `fitBounds`, `isStyleLoaded` methods
  - Test: `addSource` and `addLayer` are called after the `'style.load'` event fires
  - Test: `fitBounds` is called with the correct bbox when `selectedAreaId` prop is set
  - Test: `fitBounds` is not called when `selectedAreaId` is null
- [ ] After completing tasks, if any TODOs were added to code or anything was left unfinished, add new tasks here.
- [ ] Run `next lint --fix` and fix any issues.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — **all tests must pass. A non-zero exit is a hard blocker.**
- [ ] Run `prettier --write .` for formatting.
- [ ] Re-read this file and update as needed.
- [ ] Update journal with actions taken, learnings, surprises, deviations.
- [ ] Run `git diff`, draft commit message, present to user for approval.
- [ ] Wait for user approval. Do not commit or move to Phase 4 until approved.
- [ ] After committing, verify the dev server hot-reload shows no errors in the browser.

---

## Phase 4 — Create `MapWithNav` and Update `MapLoader`

- [ ] Create `src/components/MapWithNav.tsx`:
  - `'use client'` directive
  - `useState<string | null>(null)` for `selectedAreaId`
  - Renders: `<div className="relative w-full h-full">` containing `<AreaNav>` and `<MapView>`
- [ ] Modify `src/components/MapLoader.tsx`:
  - Change dynamic import from `"./MapView"` to `"./MapWithNav"`
  - Keep `ssr: false` and loading placeholder unchanged
- [ ] Create `src/test/components/MapWithNav.test.tsx`:
  - Stub both `AreaNav` and `MapView` to capture their props
  - Test: clicking a button in `AreaNav` changes `selectedAreaId` passed to `MapView`
  - Test: `MapWithNav` renders without crashing
- [ ] After completing tasks, if any TODOs were added to code or anything was left unfinished, add new tasks here.
- [ ] Run `next lint --fix` and fix any issues.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — **all tests must pass. A non-zero exit is a hard blocker.**
- [ ] Run `prettier --write .` for formatting.
- [ ] Re-read this file and update as needed.
- [ ] Update journal with actions taken, learnings, surprises, deviations.
- [ ] Run `git diff`, draft commit message, present to user for approval.
- [ ] Wait for user approval. Do not commit or move to Phase 5 until approved.
- [ ] After committing, verify the dev server hot-reload: 3 buttons appear at top-center, clicking animates the map, AOI polygons are visible.

---

## Phase 5 — Final Cleanup & Documentation

- [ ] Run `npm run test:coverage` and record the coverage summary in the journal.
- [ ] Update `README.md` with any relevant information about the AOI navigation feature.
- [ ] Update `CLAUDE.md` to reflect the new files, component structure, and AOI data module.
- [ ] Ask the user to inspect the running app and confirm they are satisfied, or note any modifications needed.
- [ ] Run `npm test` one final time — all tests must pass.
- [ ] Update journal with final notes.
- [ ] Run `git diff`, draft commit message, present to user for approval.
- [ ] Wait for user approval before committing.

---

## Notes

- After completing any task, if you added TODOs to code or left anything partially implemented, add new tasks here immediately.
- A failing `npm test` is a hard blocker — do not proceed to the next phase until all tests pass.
- The `selectedAreaId` `useEffect` in `MapView` must guard against calling `fitBounds` before the Mapbox style is loaded.
- Use `map.on('style.load', ...)` (not `map.on('load', ...)`) for the Mapbox Standard style, as `'load'` may fire before style tiles are ready.
