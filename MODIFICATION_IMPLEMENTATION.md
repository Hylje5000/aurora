# Implementation Plan: Aurora IPB Enhancements

This plan outlines the steps taken to implement the Satellite Style Toggle, Generic Info Panel, and Bridge Zoom Fix.

## Journal

| Date       | Phase   | Notes                                                                                                                                                                                                                                    |
| ---------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-16 | Initial | Plan created.                                                                                                                                                                                                                            |
| 2026-05-16 | Phase 1 | Updated `src/lib/layers.ts` and `src/test/lib/layers.test.ts`. Added `minzoom: 12` to bridges. All tests passing.                                                                                                                        |
| 2026-05-16 | Phase 2 | Added "Basemap" section and "Satellite View" toggle to `LayerPanel.tsx`. Created `InfoPanel` component and tests. All tests passing.                                                                                                     |
| 2026-05-16 | Phase 3 | Refactored `MapView.tsx` to handle style transitions and municipality `onInfoPanel` callback. Wired state in `MapWithNav`. All tests passing.                                                                                            |
| 2026-05-16 | Phase 4 | Ran `npm run test:coverage`. Coverage report generated successfully. Implementation complete!                                                                                                                                            |

## Phase 1: Preparation & Bridge Fix

- [x] Run all tests to ensure the project is in a good state.
- [x] Modify `src/lib/layers.ts` to add `satellite` to `LayerKey` and `LayerVisibility`.
- [x] Update `DEFAULT_LAYER_VISIBILITY` and `LAYER_GROUPS` in `src/lib/layers.ts`.
- [x] Add `minzoom: 12` to `bridges-symbol` in `src/components/MapView.tsx`.
- [x] Run `npm test` and ensure all tests pass.

## Phase 2: UI Components (Satellite Toggle & InfoPanel)

- [x] Modify `src/components/LayerPanel.tsx` to add the "Basemap" section and "Satellite View" toggle.
- [x] Create `src/components/InfoPanel.tsx` and `src/test/components/InfoPanel.test.tsx`.
- [x] Run `npm test`.

## Phase 3: MapView Refactoring & State Wiring

- [x] Refactor `src/components/MapView.tsx` to handle style transitions (Satellite Toggle).
- [x] Move initialization logic into reusable functions that can be called on `style.load`.
- [x] Replace municipality popups with `onInfoPanel` callback in `MapView.tsx`.
- [x] Update `MapWithNav.tsx` to own `infoPanelData` state and render `InfoPanel`.
- [x] Run `npm test`.

## Phase 4: Final Validation

- [x] Run `npm run test:coverage`.
- [x] Update `CLAUDE.md` and `MODIFICATION_DESIGN.md`.
- [x] Run `prettier --write .`.
