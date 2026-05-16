# Implementation Plan: Generic Info Panel & Bridge Zoom Fix

## Journal

_Updated after each phase._

---

## Phase 0: Pre-flight

- [ ] Run `npm test` — all tests must pass before starting.

---

## Phase 1: Bridge minzoom

**Goal**: Add `minzoom: 12` to `bridges-symbol` so icons only appear at city-district zoom.

### Tasks

- [ ] In `src/components/MapView.tsx`, add `minzoom: 12` to the `bridges-symbol` `addLayer` call.
- [ ] Update `src/test/components/MapView.test.tsx` to assert `bridges-symbol` is added with `minzoom: 12`.
- [ ] After completing tasks, add any missed items as new tasks.

### End-of-phase checklist

- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — all tests pass (hard blocker).
- [ ] Run `prettier --write .`
- [ ] Update Journal below.
- [ ] `git diff` → present commit message → wait for approval → commit.

---

## Phase 2: InfoPanel component

**Goal**: Create the generic `InfoPanel` React component and its tests.

### Tasks

- [ ] Create `src/components/InfoPanel.tsx`:
  - Export `InfoPanelData` interface: `{ title: string; rows: [string, string | null | undefined][] }`
  - Props: `data: InfoPanelData | null`, `onClose: () => void`
  - Returns `null` when `data` is `null`
  - Positioned `absolute right-4 top-1/2 -translate-y-1/2`
  - Dark-slate design matching `LayerPanel` (`bg-slate-900/90 border border-slate-700 rounded-lg`)
  - Title rendered in bold; rows rendered as `label — value` pairs; `null`/`undefined` → `—`
  - `×` close button (`aria-label="close info panel"`) in top-right
- [ ] Create `src/test/components/InfoPanel.test.tsx`:
  - Returns nothing when `data` is `null`
  - Renders title when `data` is provided
  - Renders label/value rows
  - Renders `—` for null/undefined values
  - Calls `onClose` when `×` button is clicked
- [ ] After completing tasks, add any missed items as new tasks.

### End-of-phase checklist

- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — all tests pass.
- [ ] Run `prettier --write .`
- [ ] Update Journal below.
- [ ] `git diff` → present commit message → wait for approval → commit.

---

## Phase 3: Wire MapView + MapWithNav

**Goal**: Replace the municipality popup with the `onInfoPanel` callback; wire state in `MapWithNav`.

### Tasks

- [ ] In `src/components/MapView.tsx`:
  - Import `InfoPanelData` from `@/components/InfoPanel`.
  - Add `onInfoPanel?: (data: InfoPanelData | null) => void` to `MapViewProps`.
  - In the `municipalities-fill` click handler: remove `mapboxgl.Popup`, call `onInfoPanel?.({ title, rows })`.
- [ ] In `src/components/MapWithNav.tsx`:
  - Import `InfoPanel` and `InfoPanelData`.
  - Add `infoPanelData` state (`InfoPanelData | null`, initially `null`).
  - Pass `onInfoPanel={setInfoPanelData}` to `MapView`.
  - Render `<InfoPanel data={infoPanelData} onClose={() => setInfoPanelData(null)} />`.
- [ ] Update `src/test/components/MapView.test.tsx`:
  - Pass `onInfoPanel` mock prop; assert it is called (not a Popup) when `municipalities-fill` is clicked.
- [ ] Update `src/test/components/MapWithNav.test.tsx`:
  - Assert `InfoPanel` is rendered in the component tree.
- [ ] After completing tasks, add any missed items as new tasks.

### End-of-phase checklist

- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — all tests pass.
- [ ] Run `prettier --write .`
- [ ] Update Journal below.
- [ ] `git diff` → present commit message → wait for approval → commit.
- [ ] Verify in browser: clicking municipality shows right-side panel (not popup); clicking cell tower / road / bridge still shows Mapbox popup; `×` dismisses the panel.

---

## Phase 4: Final checks & documentation

### Tasks

- [ ] Run `npm run test:coverage` and record coverage summary in Journal.
- [ ] Update `CLAUDE.md`:
  - Add `InfoPanel.tsx` to file structure.
  - Update municipality section: describe `InfoPanel` pattern and `onInfoPanel` prop.
  - Update bridge layer description: note `minzoom: 12`.
  - Update coverage count.
- [ ] Ask the user to inspect the running app and confirm satisfaction.

---

## Journal

### Phase 0
_Not yet started._

### Phase 1
_Not yet started._

### Phase 2
_Not yet started._

### Phase 3
_Not yet started._

### Phase 4
_Not yet started._
