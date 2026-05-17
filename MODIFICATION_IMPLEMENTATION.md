# Modification Implementation: Unified Bottom-Center Map Toolbar

## Journal

- **2026-05-17**: Initialized implementation plan for bottom-center map toolbar.

---

## Overview

Add a unified `MapToolbar` at the bottom-center of the screen with Grab / Click / Measure Distance / Measure Area modes. When a custom drawing layer is active, draw tools (Point / Line / Polygon / Rectangle + colour palette + Delete Selected + Cancel) are appended. The existing `DrawingToolbar` is kept for test compatibility but no longer rendered.

---

## Phase 0 — Baseline health check

- [ ] Run all tests to confirm the project is in a good state before starting:
  ```
  npm test
  ```
- [ ] Record the pass/fail count in the Journal.

---

## Phase 1 — New `mapTool` module

**Goal:** Create `src/lib/mapTool.ts` with the `MapTool` type and `MeasurementState` interface.

### Tasks

- [ ] Create `src/lib/mapTool.ts`:
  - Export `MapTool = 'grab' | 'click' | 'measure-distance' | 'measure-area'`
  - Export `DEFAULT_MAP_TOOL: MapTool = 'grab'`
  - Export `MeasurementState { distance_km?: number; area_km2?: number }`
- [ ] Create `src/test/lib/mapTool.test.ts`:
  - Test that `DEFAULT_MAP_TOOL === 'grab'`
  - Test that `MapTool` union values are the expected four strings (type-level, check via an array)
  - Test `MeasurementState` shape (optional fields)
- [ ] Run `next lint --fix` and `tsc --noEmit`.
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `prettier --write .`.
- [ ] Re-read this file and update if needed.
- [ ] Update Journal with actions taken, learnings, surprises, deviations.
- [ ] Present `git diff` summary to user for approval.
- [ ] Wait for user approval before committing or moving on.

---

## Phase 2 — `MapToolbar` component

**Goal:** Build the new `src/components/MapToolbar.tsx` presentational component.

### Tasks

- [ ] Create `src/components/MapToolbar.tsx`:
  - Props: `activeTool`, `onToolChange`, `measurement`, `activeDrawingLayerId`, `activeDrawingLayerName`, `activeDrawingTool`, `activeDrawingColour`, `hasDrawingSelection`, `onDrawToolChange`, `onDrawColourChange`, `onDeleteSelected`, `onCancelDrawing`
  - Layout: `absolute bottom-4 left-1/2 -translate-x-1/2 z-10` pill-shaped dark panel
  - Standard tools section: Grab (✋), Click (👆), Measure Distance (📏), Measure Area (⬡)
  - Measurement badge: shows e.g. "3.2 km" or "1.4 km²" under active measure button
  - Divider + draw tools section (only when `activeDrawingLayerId !== null`): Point / Line / Polygon / Rectangle icons + colour swatches + Delete Selected (conditional) + Cancel (✕)
  - Active tool highlighted with `bg-blue-600`
  - All buttons have `aria-label` and `aria-pressed`
  - `data-testid` attributes on all interactive elements
- [ ] Create `src/test/components/MapToolbar.test.tsx`:
  - Renders 4 standard tools
  - Active tool has `aria-pressed="true"`
  - `onToolChange` called when tool clicked
  - Draw section not rendered when `activeDrawingLayerId` is null
  - Draw section renders when `activeDrawingLayerId` is set
  - Draw tool buttons call `onDrawToolChange`
  - Colour swatches call `onDrawColourChange`
  - Delete Selected only visible when `hasDrawingSelection === true`
  - Cancel button calls `onCancelDrawing`
  - Measurement badge shows when `measurement` is provided
- [ ] Run `next lint --fix` and `tsc --noEmit`.
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `prettier --write .`.
- [ ] Re-read this file and update if needed.
- [ ] Update Journal.
- [ ] Present `git diff` summary. Wait for approval.

---

## Phase 3 — Lift drawing state; update `MapView` props and handle

**Goal:** Move `activeDrawingTool`, `activeDrawingColour`, `hasDrawingSelection` from `MapView` local state to props received from `MapWithNav`. Add `activeTool` prop. Expose `deleteDrawingSelected` via `MapViewHandle`. Remove `DrawingToolbar` render from `MapView`.

### Tasks

- [ ] In `src/components/MapView.tsx`:
  - Add to `MapViewProps`:
    - `activeTool?: MapTool` (default `'grab'`)
    - `activeDrawingTool?: DrawingTool | null`
    - `activeDrawingColour?: string`
    - `onDrawToolChange?: (t: DrawingTool | null) => void`
    - `onDrawColourChange?: (hex: string) => void`
    - `onDrawSelectionChange?: (has: boolean) => void`
    - `onMeasurementUpdate?: (m: MeasurementState | null) => void`
  - Remove local state: `activeDrawingTool`, `activeDrawingColour`, `hasDrawingSelection`
  - Replace with props (with fallback defaults for backward compat)
  - Update all internal references (`effectiveTool`, draw colour ref, `setActiveDrawingTool` → `onDrawToolChange`, etc.)
  - Replace `setHasDrawingSelection(...)` → `onDrawSelectionChange?.(...)`
  - Add `deleteDrawingSelected` to `MapViewHandle` interface → calls `drawRef.current?.trash()`
  - Remove `<DrawingToolbar ... />` render from JSX
  - Add `activeToolRef = useRef<MapTool>('grab')` + keep in sync via effect
- [ ] Ensure `handleCancelDrawing` in `MapView` still calls `onCancelDrawing?.()` and calls `onDrawToolChange?.(null)`.
- [ ] Update `src/test/components/MapView.test.tsx`:
  - Pass the new props through the mock/stub where needed
  - Update any snapshot or explicit assertions about `DrawingToolbar` being absent
  - Add test: clicking a cell tower when `activeTool='grab'` does not call elevation fetch
  - Add test: when `activeTool='click'`, general click fires elevation
- [ ] Run `next lint --fix` and `tsc --noEmit`.
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `prettier --write .`.
- [ ] Re-read this file and update if needed.
- [ ] Update Journal.
- [ ] Present `git diff` summary. Wait for approval.

---

## Phase 4 — Measurement logic in `MapView`

**Goal:** Implement the Measure Distance and Measure Area modes inside `MapView`.

### Tasks

- [ ] In `src/components/MapView.tsx`, add in `style.load`:
  - `"measure-source"` — GeoJSON source (FeatureCollection)
  - `"measure-line"` — line layer (dashed cyan `#06b6d4`, width 2)
  - `"measure-fill"` — fill layer (cyan, opacity 0.12, only Polygon features)
  - `"measure-vertices"` — circle layer (cyan, radius 5, white stroke 1.5, only Point features)
- [ ] Add `measurePointsRef = useRef<[number,number][]>([])` to `MapView`
- [ ] Add pure helper functions (outside component):
  - `haversineKm(a, b): number` — great-circle distance between two lon/lat pairs
  - `computeDistanceKm(points): number` — sum haversine for consecutive pairs
  - `computeAreaKm2(points): number` — Shoelace formula in equirectangular approximation; returns 0 for < 3 points
  - `buildMeasureFeatures(points, mode): GeoJSON.FeatureCollection` — returns appropriate features for updating the measure-source
- [ ] Update the `map.on("click", async (e) => {...})` handler:
  - After waypoint intercept, check `activeToolRef.current`:
    - `'grab'` → `return` immediately
    - `'measure-distance'` or `'measure-area'` → push `[lng, lat]` to `measurePointsRef.current`, call `updateMeasureSources(map, ...)`, call `onMeasurementUpdate?.(...)`; return
    - `'click'` → fall through to existing elevation logic
- [ ] Add `map.on("dblclick", (e) => { e.preventDefault(); ... })` — on double-click in measure mode, pop the duplicate last point added by the preceding click event (Mapbox fires click then dblclick), leaving the path finalised.
- [ ] Add `useEffect([activeTool])` to:
  - Update `activeToolRef.current`
  - Clear measure state when leaving measure modes
  - Set cursor appropriately
- [ ] Add `clearMeasureSources(map)` helper — sets measure-source to empty FeatureCollection
- [ ] Update `src/test/components/MapView.test.tsx`:
  - Test `haversineKm` / `computeDistanceKm` / `computeAreaKm2` pure helpers directly (import them)
  - Test: when `activeTool='measure-distance'`, map click appends a point and calls `onMeasurementUpdate` with `{ distance_km: ... }`
  - Test: when `activeTool='grab'`, map click does not call fetch or `onMeasurementUpdate`
  - Test: switching from `'measure-distance'` to `'grab'` clears measure state
- [ ] Run `next lint --fix` and `tsc --noEmit`.
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `prettier --write .`.
- [ ] Re-read this file and update if needed.
- [ ] Update Journal.
- [ ] Present `git diff` summary. Wait for approval.

---

## Phase 5 — Wire everything in `MapWithNav`

**Goal:** Add the new state to `MapWithNav`, render `MapToolbar`, and pass all new props to `MapView`.

### Tasks

- [ ] In `src/components/MapWithNav.tsx`:
  - Import `MapTool`, `DEFAULT_MAP_TOOL`, `MeasurementState` from `@/lib/mapTool`
  - Import `MapToolbar` from `./MapToolbar`
  - Import `COLOUR_PALETTE` from `@/lib/customLayers`
  - Add state:
    - `activeTool: MapTool` (default `DEFAULT_MAP_TOOL`)
    - `activeDrawingTool: DrawingTool | null` (default `null`)
    - `activeDrawingColour: string` (default `COLOUR_PALETTE[0].hex`)
    - `hasDrawingSelection: boolean` (default `false`)
    - `measurement: MeasurementState | null` (default `null`)
  - Add handler: `handleDeleteSelected` → `mapViewRef.current?.deleteDrawingSelected()`
  - Add handler: `handleToolChange(t: MapTool)` — sets activeTool, clears measurement if leaving measure mode
  - Pass new props to `<MapView>`: `activeTool`, `activeDrawingTool`, `activeDrawingColour`, `onDrawToolChange={setActiveDrawingTool}`, `onDrawColourChange={setActiveDrawingColour}`, `onDrawSelectionChange={setHasDrawingSelection}`, `onMeasurementUpdate={setMeasurement}`
  - Render `<MapToolbar>` with all required props positioned `absolute bottom-4 left-1/2 -translate-x-1/2 z-10`
  - When `activeTool` changes to a non-measure value, also reset `measurement` to `null`
  - When `activeDrawingLayerId` becomes null, reset `activeDrawingTool` to null
- [ ] Update `src/test/components/MapWithNav.test.tsx`:
  - Update the `MapView` stub to accept and forward the new props
  - Update the `MapToolbar` stub (or use actual component with mocked children)
  - Add test: selecting Grab tool calls `setActiveTool('grab')`
  - Add test: selecting a draw tool when layer active passes tool to MapView
  - Add test: `onMeasurementUpdate` updates measurement state and passes to MapToolbar
  - Add test: `onDeleteSelected` calls `mapViewRef.deleteDrawingSelected`
- [ ] Run `next lint --fix` and `tsc --noEmit`.
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `prettier --write .`.
- [ ] Re-read this file and update if needed.
- [ ] Update Journal.
- [ ] Present `git diff` summary. Wait for approval.

---

## Phase 6 — Final cleanup and documentation

- [ ] Run `npm run test:coverage` and record the coverage summary in the Journal.
- [ ] Verify in the browser (dev server must be running):
  - Toolbar appears at bottom-center
  - Grab mode: map pans normally, no elevation popup on click
  - Click mode: elevation and municipality popups fire
  - Measure Distance: clicking places points, distance badge updates
  - Measure Area: clicking builds polygon, area badge updates
  - Double-click finalises measurement without adding extra point
  - Switching tool clears measurement
  - When a drawing layer is active: draw section appears in toolbar
  - Draw tools work (Point/Line/Polygon/Rectangle)
  - Colour swatches work
  - Delete Selected appears when a draw feature is selected
  - Cancel button exits drawing mode
  - Old `DrawingToolbar` (top-right) is gone
- [ ] Update `CLAUDE.md`:
  - Update `MapToolbar` description
  - Update `MapView` props list
  - Update `MapWithNav` state list
  - Remove `DrawingToolbar` from active components note (keep as "kept for test compatibility")
  - Add `src/lib/mapTool.ts` to the file structure
- [ ] Ask the user to inspect the running app and confirm satisfaction or request changes.
- [ ] After user approval, update Journal with final state.
- [ ] Present final `git diff` summary. Wait for approval before committing.

---

## Notes

- After completing any task, if you added TODOs or left anything partially implemented, add new tasks to capture them.
- The `DrawingToolbar.tsx` component file must not be deleted — existing tests import it.
- The `DrawingToolbar.test.tsx` tests should continue to pass unchanged throughout all phases.
- Measurement math is self-contained (no external dependency). Haversine is accurate enough for Finland-scale distances; Shoelace + equirectangular is sufficient for areas up to ~100 km².
