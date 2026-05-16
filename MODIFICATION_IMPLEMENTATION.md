# Implementation Plan: Military Symbol Support

## Overview
This plan outlines the steps to add NATO military symbol support to custom drawing layers in the Aurora IPB project.

## Journal
- **Phase 1**: Baseline tests passed (229 tests). Verified `DATABASE_URL`.
- **Phase 2**: Created `milsymbolData.ts` with curated NATO symbols and affiliations. Implemented `SymbolPicker` component with search and preview. Added unit tests for `SymbolPicker` (5 tests passed).
- **Phase 3**: Integrated `SymbolPicker` into `FeatureDialog`. Updated `MapView` to pass drawing tool type and handle SIDC in save callback. Updated `FeatureDialog` tests (10 tests passed).
- **Phase 4**: Verified POST route already handles `properties`. Updated PUT route to support `properties` updates. Added API test cases for property persistence (all API tests passed).
- **Phase 5**: Implemented `ensureMilsymbolImages` utility for dynamic image registration in Mapbox. Added `symbol` layer to `MapView` for custom layers. Fixed lint errors related to `any` usage. Verified with tests (all MapView tests passed).
- **Phase 6**: Final coverage report: 93.73% Statements, 89.27% Branch. Overall excellent quality. Updated README.md with new features. Fixed bug where symbol picker wasn't visible due to state sync issues.

## Phase 1: Preparation & Baseline
- [x] Run all tests to ensure the project is in a good state before starting modifications.
- [x] Verify that `DATABASE_URL` is set in `.env.local` for local testing.

## Phase 2: Symbol Data & Picker Component
- [x] Create `src/lib/milsymbolData.ts` with a curated list of NATO SIDCs and names.
- [x] Create `src/components/SymbolPicker.tsx` (searchable list + preview).
- [x] Create a unit test for `SymbolPicker` (rendering, filtering).
- [x] Run `next lint --fix`.
- [x] Run `tsc --noEmit`.
- [x] Run `npm test`.
- [x] Update Journal.

## Phase 3: Feature Dialog Integration
- [x] Update `FeatureDialog.tsx` to accept and handle an optional SIDC state.
- [x] Integrate `SymbolPicker` into `FeatureDialog` (visible only for Point features).
- [x] Update `MapView.tsx` to pass the feature type to `FeatureDialog` (needed to toggle symbol picker).
- [x] Update `FeatureDialog.test.tsx` to cover symbol selection.
- [x] Run `next lint --fix`.
- [x] Run `tsc --noEmit`.
- [x] Run `npm test`.
- [x] Update Journal.

## Phase 4: API & Persistence
- [x] Refine `POST /api/custom-layers/[id]/features` to ensure `properties` are correctly handled.
- [x] Update `PUT /api/custom-layers/[id]/features/[fid]` to support updating `properties`.
- [x] Update API tests to verify SIDC persistence.
- [x] Run `next lint --fix`.
- [x] Run `tsc --noEmit`.
- [x] Run `npm test`.
- [x] Update Journal.

## Phase 5: Map Rendering Logic
- [x] Create `ensureMilsymbolImages(map, features)` helper in `MapView.tsx` or a new lib file.
- [x] Add the `symbol` layer to `MapView.tsx` for custom layers (filtered for features with `sidc`).
- [x] Update `fetchCustomLayerFeatures` to call `ensureMilsymbolImages`.
- [x] Update `MapView.test.tsx` to verify symbol layer registration and image loading.
- [x] Run `next lint --fix`.
- [x] Run `tsc --noEmit`.
- [x] Run `npm test`.
- [x] Update Journal.

## Phase 6: Final Validation
- [x] Run `npm run test:coverage` and record the coverage summary in the Journal.
- [x] Update `README.md` if necessary.
- [x] Verify the full flow in the browser: Draw Point -> Select Symbol -> Save -> Refresh -> Symbol renders correctly.
- [x] Ask the user to inspect the package.
