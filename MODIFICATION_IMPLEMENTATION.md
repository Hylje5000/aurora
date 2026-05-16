# Implementation Plan: Satellite Style Toggle

This plan outlines the steps to implement a global satellite style toggle in the Aurora IPB application.

## Journal

| Date       | Phase   | Notes                                                                                                                       |
| ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-16 | Initial | Plan created.                                                                                                               |
| 2026-05-16 | Phase 1 | Updated `src/lib/layers.ts` and `src/test/lib/layers.test.ts`. Fixed broken tests in `MapView.test.tsx`. All tests passing. |
| 2026-05-16 | Phase 2 | Added "Basemap" section and "Satellite View" toggle to `LayerPanel.tsx`. Updated `LayerPanel.test.tsx`. All tests passing. |
| 2026-05-16 | Phase 3 | Refactored `MapView.tsx` to handle style transitions cleanly using `layerVisibilityRef` inside `style.load` and correctly managing event listeners. Added `getStyle` mocking and specific test to `MapView.test.tsx`. All tests passing. |


## Phase 1: Preparation & Initial State

- [x] Run all tests to ensure the project is in a good state before starting modifications.
- [x] Modify `src/lib/layers.ts` to add `satellite` to `LayerKey` and `LayerVisibility`.
- [x] Update `DEFAULT_LAYER_VISIBILITY` in `src/lib/layers.ts` to include `satellite: false`.
- [x] Update `LAYER_GROUPS` in `src/lib/layers.ts` to include `satellite: []`.
- [x] Create/modify unit tests for testing the code added or modified in this phase.
- [x] Run `next lint --fix` (or `eslint --fix`) to auto-fix lint issues.
- [x] Run `tsc --noEmit` one more time and fix any TypeScript type errors.
- [x] Run `npm test` and make sure **all tests pass**.
- [x] Run `prettier --write .` to make sure formatting is correct.
- [x] Update the `MODIFICATION_IMPLEMENTATION.md` file with the current state (Journal).
- [ ] Use `git diff` to verify the changes, and create a suitable commit message.
- [ ] Wait for approval before committing.

## Phase 2: LayerPanel UI

- [x] Modify `src/components/LayerPanel.tsx` to add the "Basemap" section and "Satellite View" toggle.
- [x] Create/modify unit tests for `LayerPanel.tsx`.
- [x] Run `next lint --fix`.
- [x] Run `tsc --noEmit`.
- [x] Run `npm test`.
- [x] Run `prettier --write .`.
- [x] Update the `MODIFICATION_IMPLEMENTATION.md` file (Journal).
- [ ] Use `git diff` to verify the changes, and create a suitable commit message.
- [ ] Wait for approval before committing.

## Phase 3: MapView Refactoring & Style Logic

- [x] Refactor `src/components/MapView.tsx` to handle style transitions.
  - [x] Move initialization logic into reusable functions that can be called on `style.load`.
  - [x] Add `useEffect` to trigger `map.setStyle()` when `layerVisibility.satellite` changes.
  - [x] Ensure all custom sources, layers, icons, and event listeners are re-registered after style change.
- [x] Create/modify unit tests for `MapView.tsx` (mocking `setStyle` and style load events).
- [x] Run `next lint --fix`.
- [x] Run `tsc --noEmit`.
- [x] Run `npm test`.
- [x] Run `prettier --write .`.
- [x] Update the `MODIFICATION_IMPLEMENTATION.md` file (Journal).
- [ ] Use `git diff` to verify the changes, and create a suitable commit message.
- [ ] Wait for approval before committing.

## Phase 4: Final Validation

- [ ] Run `npm run test:coverage` and record the coverage summary in the Journal.
- [ ] Update `README.md` if necessary.
- [ ] Ask the user to inspect the package and running app.
- [ ] Final project cleanup and documentation update.
