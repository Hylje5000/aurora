# Implementation Plan: Collaborative Custom Drawing Layers

## Journal

**Phase 0 (2026-05-16):** All 119 pre-existing tests passed. Clean baseline.

**Phase 1 (2026-05-16):** Created `.local/setup_custom_layers.sql` (gitignored, for manual DB setup), `src/lib/customLayers.ts` (types + palette), and 10 unit tests. 129 tests pass. Discovered `.local/` is in `.gitignore` — SQL script will not be committed, only lives locally for the user to run.

**Phase 6 (2026-05-16):** Coverage run: 225 tests, 95.23% stmts overall. All API routes ≥96%, all lib modules 100%, all new UI components ≥95%. Updated CLAUDE.md with full drawing system documentation. Cleanup committed.

**Phase 5 (2026-05-16):** Updated MapWithNav with customLayers/enabledCustomLayerIds/activeDrawingLayerId state, fetch on mount, and CRUD handlers. Added CustomLayerPanel. Extended MapView stub and added 6 new MapWithNav tests. 225 tests pass.

**Phase 4 (2026-05-16):** Integrated MapboxDraw into MapView with DrawRectangle plugin. Added per-layer Mapbox sources/layers (fill/line/circle with data-driven colour). Wired FeatureDialog and DrawingToolbar inside MapView JSX. Added 13 new MapView tests (Draw init, custom layer sources, draw.create→FeatureDialog flow, discard, cancel, delete, enabledCustomLayerIds fetch/clear, moveend refetch). Lessons: (1) `export = MapboxDraw` in types requires `any` cast for mock; (2) `setState` inside `useEffect` blocked by `react-hooks/set-state-in-effect` — solved by computing `effectiveTool = activeDrawingLayerId ? activeDrawingTool : null` as a derived value; (3) ref cleanup warning fixed by capturing ref value before returning from effect. 219 tests pass.

**Phase 3 (2026-05-16):** Installed `@mapbox/mapbox-gl-draw`, `mapbox-gl-draw-rectangle-mode`, `@types/mapbox__mapbox-gl-draw`. Created `FeatureDialog`, `DrawingToolbar`, `CustomLayerPanel` components with 39 unit tests. Learned: ESLint `react-hooks/set-state-in-effect` blocks `setState` calls inside `useEffect` bodies — fixed by splitting FeatureDialog into an outer guard (`if (!open) return null`) and an inner `DialogForm` component that mounts fresh each time, initialising state via `useState("")` naturally. 206 tests pass.

**Phase 2 (2026-05-16):** Created 4 API route files (GET+POST `/api/custom-layers`, DELETE `/api/custom-layers/[id]`, GET+POST `/api/custom-layers/[id]/features`, PUT+DELETE `/api/custom-layers/[id]/features/[fid]`) and 38 unit tests covering all routes. Lesson: module-level `const NO_DB = !process.env.DATABASE_URL` is evaluated once at import time — tests that set `DATABASE_URL` after import see stale value. Fixed by checking `process.env.DATABASE_URL` inline in each handler. 167 tests pass.

---

## Phase 0 — Baseline health check

- [ ] Run `npm test` and confirm all existing tests pass before touching any code.

---

## Phase 1 — Database setup & types

- [ ] Create `.local/` directory if it doesn't exist.
- [ ] Write `.local/setup_custom_layers.sql` with the PostGIS schema (custom_layers + custom_features tables, indexes).
- [ ] Create `src/lib/customLayers.ts` with:
  - `CustomLayer` type
  - `CustomFeature` type
  - `DrawingTool` union type (`'point' | 'line_string' | 'polygon' | 'rectangle'`)
  - `COLOUR_PALETTE` constant (8 hex colours with labels)
  - `DEFAULT_LAYER_COLOUR` constant

**Phase 1 wrap-up:**
- [ ] Write unit tests for `src/lib/customLayers.ts` (palette completeness, type guards if any).
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix any type errors.
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `prettier --write .`.
- [ ] Re-read MODIFICATION_IMPLEMENTATION.md for any changes.
- [ ] Update journal with learnings.
- [ ] `git diff` → draft commit message → present to user for approval.
- [ ] Wait for user approval before committing.
- [ ] After commit, verify hot-reload in browser if dev server is running.

---

## Phase 2 — API routes

- [ ] `src/app/api/custom-layers/route.ts` — GET (list all layers) + POST (create layer).
- [ ] `src/app/api/custom-layers/[id]/route.ts` — DELETE layer (CASCADE handled by DB).
- [ ] `src/app/api/custom-layers/[id]/features/route.ts` — GET (bbox-scoped) + POST (create feature). Reuse `parseBbox` from the features route. Store geometry via `ST_GeomFromGeoJSON`.
- [ ] `src/app/api/custom-layers/[id]/features/[fid]/route.ts` — PUT (update name/description/color) + DELETE (single feature).
- [ ] All routes degrade gracefully when `DATABASE_URL` is absent (return empty/404 with message).
- [ ] After adding any TODOs or incomplete items, add new tasks here.

**Phase 2 wrap-up:**
- [ ] Write unit tests for all four route files (mock `@/lib/db`).
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix any type errors.
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `prettier --write .`.
- [ ] Re-read MODIFICATION_IMPLEMENTATION.md for any changes.
- [ ] Update journal.
- [ ] `git diff` → draft commit message → present to user for approval.
- [ ] Wait for user approval before committing.

---

## Phase 3 — UI components

- [ ] Install dependencies: `npm install @mapbox/mapbox-gl-draw mapbox-gl-draw-rectangle-mode` and `npm install -D @types/mapbox__mapbox-gl-draw`.
- [ ] Create `src/components/FeatureDialog.tsx` — modal with Name + Description fields; `onSave(name, description)` + `onDiscard()` callbacks.
- [ ] Create `src/components/DrawingToolbar.tsx` — tool buttons (point/line/polygon/rectangle) + 8-colour swatch palette + Cancel button. Receives `activeDrawingLayerName`, `activeTool`, `activeColour`, `onToolChange`, `onColourChange`, `onCancel`, `onDeleteSelected`.
- [ ] Create `src/components/CustomLayerPanel.tsx` — collapsible dark-slate floating panel (bottom-right). Shows layer list with toggle checkbox, colour dot, active-drawing-layer selector, delete button with inline confirm. Inline "New Layer" form (name input + colour swatches + Create button). Calls `onCreateLayer`, `onDeleteLayer`, `onToggleLayer`, `onSetActiveDrawingLayer` callbacks.
- [ ] After adding any TODOs or incomplete items, add new tasks here.

**Phase 3 wrap-up:**
- [ ] Write unit tests for `FeatureDialog`, `DrawingToolbar`, `CustomLayerPanel` (mock callbacks, check render).
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix any type errors.
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `prettier --write .`.
- [ ] Re-read MODIFICATION_IMPLEMENTATION.md for any changes.
- [ ] Update journal.
- [ ] `git diff` → draft commit message → present to user for approval.
- [ ] Wait for user approval before committing.
- [ ] After commit, verify components render correctly in the browser.

---

## Phase 4 — MapView integration

- [ ] Import `MapboxDraw` and `DrawRectangle` mode (dynamic import inside `useEffect` to avoid SSR issues — or add to mapbox-gl mock).
- [ ] Initialise `drawRef` after map `load`; register `draw.create`, `draw.update`, `draw.delete`, `draw.selectionchange` event handlers on the map.
- [ ] Accept new props from `MapWithNav`: `customLayers`, `enabledCustomLayerIds`, `activeDrawingLayerId`, `activeDrawingTool`, `activeDrawingColour`, `onDrawCreate`, `onDrawDelete`, `onDrawUpdate`, `onDrawSelectionChange`.
- [ ] On `style.load`, register per-layer Mapbox sources (`custom-layer-<id>`) and three layers each: fill (polygons/rectangles), line (lines/polygon outlines), circle (points).
- [ ] On `enabledCustomLayerIds` change: for newly enabled layers, fetch features from the API (current bbox); for disabled layers, clear source data.
- [ ] On `moveend`, re-fetch features for all enabled custom layers.
- [ ] Show `FeatureDialog` when `draw.create` fires; on save, POST to API then update source data; on discard, delete the drawn feature from the Draw control.
- [ ] When `activeDrawingLayerId` changes or `activeDrawingTool` changes, call `draw.changeMode(...)`.
- [ ] Apply per-feature colour using Mapbox data-driven expressions `["get", "color"]` on fill-color/line-color/circle-color.
- [ ] `draw.selectionchange` → call `onDrawSelectionChange` so toolbar can show "Delete selected" button.
- [ ] Handle `draw.delete` for features that were already persisted (DELETE to API).
- [ ] After adding any TODOs or incomplete items, add new tasks here.

**Phase 4 wrap-up:**
- [ ] Update/extend `MapView` tests to cover: Draw control init, custom layer source registration, `draw.create` flow, `draw.delete` flow, moveend re-fetch for custom layers.
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix any type errors.
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `prettier --write .`.
- [ ] Re-read MODIFICATION_IMPLEMENTATION.md for any changes.
- [ ] Update journal.
- [ ] `git diff` → draft commit message → present to user for approval.
- [ ] Wait for user approval before committing.
- [ ] After commit, verify the full drawing flow works end-to-end in the browser.

---

## Phase 5 — MapWithNav wiring

- [ ] Add state to `MapWithNav`:
  - `customLayers: CustomLayer[]` (fetched from GET `/api/custom-layers` on mount)
  - `enabledCustomLayerIds: Set<string>`
  - `activeDrawingLayerId: string | null`
  - `activeDrawingTool: DrawingTool | null`
  - `activeDrawingColour: string` (default first palette colour)
  - `selectedFeatureIds: string[]`
- [ ] Implement handlers: `handleCreateLayer`, `handleDeleteLayer`, `handleToggleLayer`, `handleSetActiveDrawingLayer`, `handleToolChange`, `handleColourChange`, `handleDrawCreate`, `handleDrawDelete`, `handleDrawUpdate`, `handleDrawSelectionChange`.
- [ ] Wire `CustomLayerPanel` and `DrawingToolbar` into the layout (absolutely positioned).
- [ ] Pass all draw-related props to `MapView`.
- [ ] After adding any TODOs or incomplete items, add new tasks here.

**Phase 5 wrap-up:**
- [ ] Update/extend `MapWithNav` tests to cover new state wiring.
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix any type errors.
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `prettier --write .`.
- [ ] Re-read MODIFICATION_IMPLEMENTATION.md for any changes.
- [ ] Update journal.
- [ ] `git diff` → draft commit message → present to user for approval.
- [ ] Wait for user approval before committing.
- [ ] After commit, do a full end-to-end browser test: create layer → draw polygon → save → reload page → confirm drawing persists.

---

## Phase 6 — Polish & finalisation

- [ ] Run `npm run test:coverage` and record the coverage summary in the Journal section below.
- [ ] Update `README.md` (if it exists) with relevant information.
- [ ] Update `CLAUDE.md` to reflect new components, API routes, DB tables, and drawing system.
- [ ] Ask the user to inspect the running app and confirm they are satisfied, or request further modifications.

---

## After completing any task

If you added TODOs to the code or didn't fully implement something, add a new task to the relevant phase so it gets addressed before moving on.
