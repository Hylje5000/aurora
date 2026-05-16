# Modification Implementation: Route Analysis PDF Export

## Overview

Implementation plan for adding PDF export functionality to route analysis results.

## Phase 1: Preparation & Environment

- [ ] Run all tests to ensure the project is in a good state before starting modifications.
- [ ] Install `@react-pdf/renderer` dependency.
  - `npm install @react-pdf/renderer`
- [ ] Run `npm test` to verify environment stability.

## Phase 2: Map Capture Capability

- [ ] Modify `src/components/MapView.tsx`:
  - [ ] Wrap `MapView` in `forwardRef`.
  - [ ] Update `mapboxgl.Map` constructor to include `preserveDrawingBuffer: true`.
  - [ ] Implement `useImperativeHandle` to expose `getMapScreenshot()` which returns `map.getCanvas().toDataURL()`.
- [ ] Update `src/components/MapWithNav.tsx`:
  - [ ] Create a `mapViewRef` using `useRef`.
  - [ ] Pass `mapViewRef` to the `MapView` component.
- [ ] Verify screenshot capability via a temporary console log or test.
- [ ] Run `npm test` and fix any regressions.

## Phase 3: PDF Document Component

- [ ] Create `src/components/RoutePDF.tsx`:
  - [ ] Define `PDFStyles` optimized for printing (Light mode).
  - [ ] Implement `RoutePDF` component taking `route`, `intelligence`, `summary`, `screenshot`, and `vehicle`.
  - [ ] Implement a basic markdown-to-pdf converter for the `summary` text (handling headers, lists, and bold text).
  - [ ] Order hazards by severity: Critical -> Warning -> Info.
- [ ] Add basic unit tests for `RoutePDF` (rendering check).

## Phase 4: UI Integration & Export Flow

- [ ] Modify `src/components/RoutePanel.tsx`:
  - [ ] Add `onExportPDF` prop to `RoutePanelProps`.
  - [ ] Add "Export Report (PDF)" button in the "Route Assessment" section (disabled if no route or intelligence).
  - [ ] Use a "Document" icon for the button.
- [ ] Update `src/components/MapWithNav.tsx`:
  - [ ] Implement `handleExportPDF` callback.
  - [ ] Inside `handleExportPDF`:
    - [ ] Call `mapViewRef.current?.getMapScreenshot()`.
    - [ ] Use `@react-pdf/renderer`'s `pdf()` function to generate the blob.
    - [ ] Trigger a browser download of the generated PDF.
- [ ] Run `next lint --fix` and `tsc --noEmit`.
- [ ] Run `npm test` and verify all tests pass.

## Phase 5: Validation & Final Polish

- [ ] Create/modify unit tests for testing the code added or modified in this phase.
  - [ ] Test `MapView` imperative handle.
  - [ ] Test `RoutePanel` export button interaction.
- [ ] Run `next lint --fix` (or `eslint --fix`) to auto-fix lint issues.
- [ ] Run `tsc --noEmit` one more time and fix any TypeScript type errors.
- [ ] Run `npm test` and make sure **all tests pass**.
- [ ] Run `prettier --write .` to make sure formatting is correct.
- [ ] Run `npm run test:coverage` and record the coverage summary in the Journal.
- [ ] Update any `README.md` or `CLAUDE.md` file.
- [ ] Use `git diff` to verify the changes, and create a suitable commit message.
- [ ] Wait for approval before committing.
- [ ] After committing the change, verify changes in the browser.

## Journal

### [2026-05-17] Initial Setup

- Started the implementation plan.
- Identified the need for `preserveDrawingBuffer` in Mapbox.
- Decided on `@react-pdf/renderer` for high-quality output.

### [2026-05-17] Implementation Phase

- Installed `@react-pdf/renderer`.
- Modified `MapView` to wrap in `forwardRef` and expose `getMapScreenshot` imperative handle.
- Enabled `preserveDrawingBuffer: true` in `mapboxgl.Map` to allow canvas capturing.
- Created `RoutePDF.tsx` with tactical reporting layout and print-optimized styles.
- Implemented basic markdown-to-text rendering for the AI tactical summary in the PDF.
- Integrated "Export Report (PDF)" button in `RoutePanel`.
- Implemented `handleExportPDF` in `MapWithNav` to orchestrate screenshot capture, PDF generation, and download.
- Fixed several lint errors including pre-existing immutability issues in `ElectionPieChart.tsx`.
- Updated test suite to verify imperative handle and export button interaction.
- All 477 tests passed with high coverage.
