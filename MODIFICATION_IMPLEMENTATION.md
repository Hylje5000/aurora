# Implementation Plan: Cell Tower Layer Toggles

## Journal

_(Updated after each phase)_

---

## Phase 0: Baseline Health Check

- [ ] Run `npm test` to confirm all 96 tests pass before any changes.
- [ ] Run `tsc --noEmit` to confirm zero TypeScript errors.
- [ ] Run `next lint` to confirm zero lint errors.

---

## Phase 1: Extend `src/lib/layers.ts`

Add four new `LayerKey` values (`cellGSM`, `cellUMTS`, `cellLTE`, `cellCDMA`) and map them to
dedicated Mapbox layer IDs.

- [ ] Add `"cellGSM" | "cellUMTS" | "cellLTE" | "cellCDMA"` to the `LayerKey` union type.
- [ ] Add all four to `LayerVisibility` interface (all `boolean`).
- [ ] Add all four to `DEFAULT_LAYER_VISIBILITY`, each defaulting to `true`.
- [ ] Add all four to `LAYER_GROUPS`:
  - `cellGSM: ["cell-towers-gsm"]`
  - `cellUMTS: ["cell-towers-umts"]`
  - `cellLTE: ["cell-towers-lte"]`
  - `cellCDMA: ["cell-towers-cdma"]`
- [ ] Update unit tests in `src/test/lib/layers.test.ts` to cover the four new keys.
- [ ] After completing tasks, add new tasks here for any TODOs left in the code.
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix any errors.
- [ ] Run `npm test` — must be green before proceeding.
- [ ] Run `prettier --write .`.
- [ ] Re-read this file and update if anything has changed.
- [ ] Update Journal below with findings.
- [ ] Present `git diff` and a commit message for approval. Do not commit until the user approves.

---

## Phase 2: Update `src/components/MapView.tsx`

Replace the single `cell-towers-unclustered` layer with four per-type layers; brighten colors.

- [ ] Change cluster circle color from `#64748b` to `#94a3b8`.
- [ ] Change stroke on unclustered points from `#1e293b` to `rgba(0,0,0,0.5)`.
- [ ] Remove the `cell-towers-unclustered` layer and its `match` color expression.
- [ ] Add four new per-type circle layers immediately after the cluster count layer:
  - `cell-towers-gsm` — filter `["==", ["get", "radio"], "GSM"]`, color `#fde047`
  - `cell-towers-umts` — filter `["==", ["get", "radio"], "UMTS"]`, color `#fb923c`
  - `cell-towers-lte` — filter `["==", ["get", "radio"], "LTE"]`, color `#4ade80`
  - `cell-towers-cdma` — filter `["==", ["get", "radio"], "CDMA"]`, color `#c4b5fd`
  - All four: `circle-radius: 5`, `circle-stroke-width: 1`, `circle-stroke-color: rgba(0,0,0,0.5)`
  - Initial visibility driven by the matching `layerVisibility.cell*` prop value.
- [ ] Update the popup click handler to attach to all four layer IDs instead of
      `cell-towers-unclustered`.
- [ ] Update the `mouseenter` / `mouseleave` cursor handlers to all four layer IDs.
- [ ] Confirm the visibility-sync `useEffect` needs no changes (it already iterates `LAYER_GROUPS`
      which now includes the four new keys).
- [ ] Update tests in `src/test/components/MapView.test.tsx`:
  - Replace references to `cell-towers-unclustered` with the four new layer IDs.
  - Add/update test that each per-type layer is added with the correct filter and color.
  - Add test that popup attaches to each of the four per-type layers.
  - Add test that cursor events are attached to each of the four per-type layers.
- [ ] After completing tasks, add new tasks here for any TODOs left in the code.
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix any errors.
- [ ] Run `npm test` — must be green before proceeding.
- [ ] Run `prettier --write .`.
- [ ] Re-read this file and update if anything has changed.
- [ ] Update Journal below with findings.
- [ ] Present `git diff` and a commit message for approval. Do not commit until the user approves.
- [ ] After committing, verify the map shows brighter per-type cell tower markers in the browser.

---

## Phase 3: Update `src/components/LayerPanel.tsx`

Add a COMMS section with one row per radio type.

- [ ] Add a `COMMS` section heading after the `VEGETATION` section.
- [ ] Add four `LayerRow` entries:
  - `GSM` — `dotColor="#fde047"`, toggle key `"cellGSM"`
  - `UMTS` — `dotColor="#fb923c"`, toggle key `"cellUMTS"`
  - `LTE` — `dotColor="#4ade80"`, toggle key `"cellLTE"`
  - `CDMA` — `dotColor="#c4b5fd"`, toggle key `"cellCDMA"`
- [ ] Update tests in `src/test/components/LayerPanel.test.tsx`:
  - Assert the COMMS section heading is rendered.
  - Assert each of the four rows is rendered with the correct label.
  - Assert each checkbox calls `onToggle` with the correct key.
  - Assert checked state reflects the `visibility` prop for each new key.
- [ ] After completing tasks, add new tasks here for any TODOs left in the code.
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix any errors.
- [ ] Run `npm test` — must be green before proceeding.
- [ ] Run `prettier --write .`.
- [ ] Re-read this file and update if anything has changed.
- [ ] Update Journal below with findings.
- [ ] Present `git diff` and a commit message for approval. Do not commit until the user approves.
- [ ] After committing, verify the COMMS section appears in the layer panel and toggles hide/show
      the correct radio-type markers on the map.

---

## Phase 4: Wrap-Up

- [ ] Run `npm run test:coverage` and record the full coverage summary in the Journal below.
- [ ] Update `CLAUDE.md` to reflect:
  - The four new `LayerKey` values and their defaults.
  - The new COMMS section in `LayerPanel`.
  - The new per-type cell tower layer IDs in `MapView`.
  - The updated color table for cell tower markers.
- [ ] Ask the user to inspect the running app and confirm they are satisfied, or if any changes
      are needed.

---

## Journal

### Phase 0

_(to be filled in)_

### Phase 1

_(to be filled in)_

### Phase 2

_(to be filled in)_

### Phase 3

_(to be filled in)_

### Phase 4 — Coverage Summary

_(to be filled in)_
