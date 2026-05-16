# Modification Implementation: UI Compaction

## Journal

- **2026-05-17**: Initialized implementation plan.

---

## Phase 0 — Baseline health check

- [ ] Run `npm test` to confirm the suite is green before any changes. A non-zero exit is a hard blocker.

---

## Phase 1 — LayerPanel: single Cell Towers toggle + max-height scroll

### Tasks

- [ ] In `src/lib/layers.ts`: no changes needed (individual cell keys remain).
- [ ] In `src/components/LayerPanel.tsx`:
  - Add `onToggleComms: () => void` to `LayerPanelProps`.
  - Replace the four COMMS rows (GSM, UMTS, LTE, CDMA) with a single "Cell Towers" row whose `checked` state is `visibility.cellGSM || visibility.cellUMTS || visibility.cellLTE || visibility.cellCDMA` and `onToggle` calls `onToggleComms()`.
  - Keep the "Coverage Circles" row unchanged.
  - Add `max-h-[calc(100vh-10rem)] overflow-y-auto` to the content `<div>`.
  - Reduce row gap `gap-1.5` → `gap-1`, bottom padding `pb-3` → `pb-2`, header padding `py-2` → `py-1.5`.
- [ ] In `src/components/MapWithNav.tsx`:
  - Add `handleCommsToggle` callback using a single `setLayerVisibility` functional update that reads current state of all 4 cell keys, computes `anyOn`, and sets all four to `!anyOn`.
  - Pass `onToggleComms={handleCommsToggle}` to `<LayerPanel>`.
- [ ] After completing tasks, if any TODOs were added or anything left unimplemented, add new tasks to cover them.
- [ ] Update/add unit tests in `src/test/components/LayerPanel.test.tsx`:
  - Replace tests for individual GSM/UMTS/LTE/CDMA rows with a "Cell Towers" row test.
  - Test `onToggleComms` callback is invoked.
  - Test scroll container renders (max-h class present).
- [ ] Update `src/test/components/MapWithNav.test.tsx`:
  - Update the `LayerPanel` stub to accept `onToggleComms` prop.
  - Add test that `handleCommsToggle` toggles all 4 cell keys.
- [ ] Run `next lint --fix` and fix any remaining lint issues.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — must be green before proceeding.
- [ ] Run `prettier --write .`.
- [ ] Re-read `MODIFICATION_IMPLEMENTATION.md` and update accordingly.
- [ ] `git diff` to review changes; draft commit message; present to user for approval.
- [ ] Wait for user approval, then commit.
- [ ] Verify hot-reload in browser shows the new single Cell Towers toggle and scrollable panel.

---

## Phase 2 — Weather panel: merge area name into date row

### Tasks

- [ ] In `src/components/MapWithNav.tsx` (inline weather panel JSX):
  - Remove the separate area-name `<div>` block (`px-3 pt-2.5 pb-1`).
  - Remove the separate date row `<div>` (`flex items-center gap-2 px-3 py-2 border-b`).
  - Replace both with a single `<div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-700/40">` containing:
    - `<span className="text-xs font-bold text-white flex-1 truncate">{area.name}</span>`
    - `<DatePicker bare … />`
- [ ] In `src/components/WeatherWidget.tsx`:
  - Reduce `mb-1` on the label row to `mb-0.5`.
- [ ] In `src/components/DatePicker.tsx`:
  - Reduce select padding `px-2 py-1` → `px-1.5 py-0.5`.
- [ ] After completing tasks, if any TODOs were added or anything left unimplemented, add new tasks to cover them.
- [ ] Update tests in `src/test/components/MapWithNav.test.tsx`:
  - Confirm the area name and DatePicker are now in the same row (no separate heading block).
- [ ] Update `src/test/components/WeatherWidget.test.tsx` if any class-based assertions exist.
- [ ] Update `src/test/components/DatePicker.test.tsx` if select padding assertions exist.
- [ ] Run `next lint --fix` and fix remaining issues.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — must be green.
- [ ] Run `prettier --write .`.
- [ ] Re-read `MODIFICATION_IMPLEMENTATION.md` and update accordingly.
- [ ] `git diff` to review; draft commit message; present for approval.
- [ ] Wait for approval, then commit.
- [ ] Verify hot-reload: weather panel header is now one compact row.

---

## Phase 3 — Final verification & wrap-up

### Tasks

- [ ] Run `npm run test:coverage` and record the coverage summary in the Journal below.
- [ ] Update `README.md` if it contains UI layout notes (check and update if relevant).
- [ ] Update `CLAUDE.md` to reflect:
  - LayerPanel now shows a single "Cell Towers" COMMS row (not 4 individual rows); `onToggleComms` prop added.
  - Weather panel header merges area name and DatePicker into one row.
  - LayerPanel content has `max-h` cap with scroll.
  - Updated coverage summary.
- [ ] Ask the user to inspect the running app and confirm satisfaction, or request further changes.

---

## Coverage Summary (to be filled in Phase 3)

```
(run npm run test:coverage and paste summary here)
```
