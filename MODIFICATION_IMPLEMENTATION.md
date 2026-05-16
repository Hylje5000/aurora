# UI Layout & Accessibility Overhaul — Implementation Plan

**Branch**: `feat/ui-fixes`  
**Design doc**: `MODIFICATION_DESIGN.md`

---

## Journal

_Updated after each phase._

---

## Phase 0 — Pre-flight checks

- [ ] Run all tests to ensure the project is in a good state before starting modifications.
  ```
  npm test
  ```
- [ ] Confirm all tests pass (exit 0). A non-zero exit is a hard blocker — do not proceed.

---

## Phase 1 — Map Contrast & Accessibility (MapView.tsx + layers.ts)

No component API changes. Pure paint/layer changes — safest to do first.

- [ ] **`roads-line-casing` layer**: Add a dark halo line layer inserted before `roads-line`.
  - `line-color: "#0f172a"`, width interpolate `[zoom 8→3, zoom 14→7]`, `line-opacity: 0.65`.
  - `minzoom: 12`, `visibility` tied to `vis.roads`.
- [ ] **`roads-line` paint update**:
  - Default colour: `#64748b` → `#94a3b8`.
  - Opacity: `0.8` → `1.0`.
  - Width interpolation: `[zoom 8→1, zoom 14→3]` → `[zoom 8→1.5, zoom 14→4]`.
- [ ] **`route-line-outline` layer**: Add a white glow layer inserted before `route-line`.
  - `line-color: "#ffffff"`, `line-width: 9`, `line-opacity: 0.25`, slot `"top"`, round join/cap.
- [ ] **`railways-line` paint update**: width `2` → `3`; dasharray `[2, 2]` → `[4, 2]`.
- [ ] **Custom layer line-width**: change `"line-width": 4` → `5` in `addCustomLayerSourcesToMap`.
- [ ] **Custom layer circle-radius**: `10` → `11`.
- [ ] **`LAYER_GROUPS` in `src/lib/layers.ts`**: add `"roads-line-casing"` to the `roads` key array so visibility syncs correctly on layer toggle.
- [ ] After completing tasks, if any TODOs remain, add new tasks.
- [ ] Create/modify unit tests for code changed in this phase (MapView.test.tsx — mock layer assertions).
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix any type errors.
- [ ] Run `npm test` — must be green before proceeding.
- [ ] Run `prettier --write .`.
- [ ] Re-read `MODIFICATION_IMPLEMENTATION.md` to check for plan changes.
- [ ] Update Journal with learnings/deviations. Check off completed items.
- [ ] Run `git diff`, draft commit message, present to user for approval.
- [ ] Wait for approval. Do not commit or proceed until approved.

---

## Phase 2 — WeatherWidget & DatePicker: `bare` prop

- [ ] **`WeatherWidget.tsx`**: Add `bare?: boolean` prop.
  - When `bare=true`: omit outer `rounded-lg border ... backdrop-blur-sm shadow-xl` div; render content with `px-3 py-2 font-mono text-xs` wrapper.
  - When `bare=false` (default): behaviour unchanged.
- [ ] **`DatePicker.tsx`**: Add `bare?: boolean` prop.
  - When `bare=true`: return just the inner `<div className="flex items-center gap-1">` with selects; no outer panel div.
  - When `bare=false` (default): behaviour unchanged.
- [ ] **`MapWithNav.tsx`**: Replace two-box weather section with single unified panel (DatePicker in header row, WeatherWidget below), using `bare` on both.
- [ ] After completing tasks, if any TODOs remain, add new tasks.
- [ ] Create/modify unit tests:
  - `WeatherWidget.test.tsx`: add tests for `bare=true` verifying no outer panel div.
  - `DatePicker.test.tsx`: add tests for `bare=true`.
  - `MapWithNav.test.tsx`: update weather section test to reflect unified panel.
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix type errors.
- [ ] Run `npm test` — must be green.
- [ ] Run `prettier --write .`.
- [ ] Re-read `MODIFICATION_IMPLEMENTATION.md`.
- [ ] Update Journal. Check off completed items.
- [ ] `git diff`, draft commit message, present for approval.
- [ ] Wait for approval.

---

## Phase 3 — Merge Custom Layers into LayerPanel

- [ ] **`CustomLayerPanel.tsx`**: Extract inner body into an exported `CustomLayerSection` component.
  - `CustomLayerSection` takes the same props as `CustomLayerPanel`.
  - No outer absolute-positioned div in `CustomLayerSection` — renders a plain `<div>`.
  - Existing `data-testid` attributes stay on the appropriate inner elements.
  - Keep the default export `CustomLayerPanel` as a thin wrapper (outer panel div + collapse toggle + `<CustomLayerSection .../>`) to preserve existing tests.
- [ ] **`LayerPanel.tsx`**:
  - Import `CustomLayerSection` and its prop type.
  - Add `customLayerProps?: CustomLayerPanelProps` to `LayerPanelProps`.
  - Widen outer div: `w-48` → `w-56`.
  - At the bottom of the expanded body, render `<CustomLayerSection>` under a `CUSTOM LAYERS` section heading when `customLayerProps` is provided.
- [ ] **`MapWithNav.tsx`**:
  - Remove `import CustomLayerPanel` and its JSX.
  - Pass custom layer props object to `<LayerPanel customLayerProps={{...}} />`.
- [ ] After completing tasks, if any TODOs remain, add new tasks.
- [ ] Create/modify unit tests:
  - `LayerPanel.test.tsx`: add tests for custom-layer section rendering.
  - `CustomLayerPanel.test.tsx`: update imports if needed; ensure existing tests still pass via the legacy wrapper.
  - `MapWithNav.test.tsx`: update `LayerPanel` stub to accept `customLayerProps`.
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix type errors.
- [ ] Run `npm test` — must be green.
- [ ] Run `prettier --write .`.
- [ ] Re-read `MODIFICATION_IMPLEMENTATION.md`.
- [ ] Update Journal. Check off completed items.
- [ ] `git diff`, draft commit message, present for approval.
- [ ] Wait for approval.

---

## Phase 4 — Route Panel & Info Panel: Right-Side Repositioning + Collapsibility

- [ ] **`RoutePanel.tsx`**:
  - Change outer div: `absolute bottom-10 left-1/2 -translate-x-1/2 w-96` → `absolute right-4 bottom-10 z-20 w-80`.
  - Add local `expanded` state (default `true`).
  - Add `▾/▸` chevron button in header row that toggles `expanded`.
  - Body div: conditionally render only when `expanded`.
- [ ] **`InfoPanel.tsx`**:
  - Change outer div: `absolute right-4 top-1/2 -translate-y-1/2 z-10 min-w-48` → `absolute right-4 top-20 z-20 w-72 max-h-[60vh] overflow-y-auto`.
  - Add local `collapsed` state (default `false`).
  - Add `▾/▸` chevron button in header row beside `×`.
  - Content and `data.component` hidden when `collapsed`.
- [ ] After completing tasks, if any TODOs remain, add new tasks.
- [ ] Create/modify unit tests:
  - `RoutePanel.test.tsx`: add test for collapse chevron; update position class assertion if any.
  - `InfoPanel.test.tsx`: add test for collapse chevron; update position class assertion if any.
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix type errors.
- [ ] Run `npm test` — must be green.
- [ ] Run `prettier --write .`.
- [ ] Re-read `MODIFICATION_IMPLEMENTATION.md`.
- [ ] Update Journal. Check off completed items.
- [ ] `git diff`, draft commit message, present for approval.
- [ ] Wait for approval.

---

## Phase 5 — "Plan a Route" Button & DrawingToolbar Reposition

- [ ] **`MapWithNav.tsx`** route toggle button:
  - Text: `"Route"` → `"Plan a Route"`.
  - Position: `top-4 right-20` → `top-4 right-4`.
  - Background: `bg-black/60 backdrop-blur-sm hover:bg-black/80` → `bg-blue-600 hover:bg-blue-700 backdrop-blur-sm`.
  - Border inactive: `border-white/30` → `border-blue-500`.
  - Padding: `px-3 py-1.5` → `px-4 py-2`.
  - `data-testid="route-toggle-btn"` — keep unchanged.
- [ ] **`DrawingToolbar.tsx`**: Change outer div `top-4 right-4` → `top-16 right-4`.
- [ ] After completing tasks, if any TODOs remain, add new tasks.
- [ ] Create/modify unit tests:
  - `MapWithNav.test.tsx`: update button text assertion from `"Route"` to `"Plan a Route"`.
  - `DrawingToolbar.test.tsx`: update position class assertion if any.
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix type errors.
- [ ] Run `npm test` — must be green.
- [ ] Run `prettier --write .`.
- [ ] Re-read `MODIFICATION_IMPLEMENTATION.md`.
- [ ] Update Journal. Check off completed items.
- [ ] `git diff`, draft commit message, present for approval.
- [ ] Wait for approval.

---

## Phase 6 — Final checks & wrap-up

- [ ] Run `npm run test:coverage` and record summary in Journal.
- [ ] Visually inspect the running app (dev server) and verify:
  - [ ] LayerPanel shows "Custom Layers" section at the bottom; CustomLayerPanel no longer renders bottom-right.
  - [ ] Weather + DatePicker appear as one unified box.
  - [ ] InfoPanel opens at right-4 top-20; collapse chevron works.
  - [ ] RoutePanel appears at right-4 bottom-10 (not bottom-centre); collapse chevron works.
  - [ ] "Plan a Route" button is blue, readable, sits at top-right.
  - [ ] Roads are more visible (casing visible at zoom ≥12); route line has white glow.
  - [ ] DrawingToolbar at top-16 right-4 (no overlap with route button).
  - [ ] No layout regressions: AreaNav, municipalities, cell towers, drawing flow.
- [ ] Update any README.md with layout/UX changes if applicable.
- [ ] Update `CLAUDE.md` to reflect new component layout and positioning.
- [ ] Ask the user to inspect the running app and confirm satisfaction or request further changes.

---

## Notes

- After completing a task, if any TODOs were added to the code or anything wasn't fully implemented,
  add new tasks to the relevant phase so nothing is left incomplete.
- Preserve all `data-testid` attributes on interactive/structural elements.
- Phases ordered from lowest to highest regression risk:
  1. Map paint (no API surface changes)
  2. Prop additions (backwards-compatible)
  3. Component merge (contained to LayerPanel/CustomLayerPanel)
  4. Position changes (CSS only)
  5. Button relabel/restyle (minimal logic)
