# Implementation Plan - AI Route Executive Summary

## Phase 1: Foundation & Verification
- [ ] Run all tests to ensure the project is in a good state before starting modifications.
    - `npm test`
- [ ] Research and define the AI System Prompt for "military-grade" tactical summaries.

## Phase 2: State Management & UI Components
- [ ] Create `src/components/SummaryModal.tsx` based on `FeatureDialog.tsx` styling.
- [ ] Update `MapWithNav.tsx` to include:
    - State for `routeSummary` (string | null).
    - State for `summaryLoading` (boolean).
    - State for `summaryModalOpen` (boolean).
    - Handlers `handleSummaryChange` and `handleSummaryModalOpen`.
- [ ] Update `RoutePanel.tsx` props to accept summary state and handlers.

## Phase 3: AI Integration & Background Fetching
- [ ] Implement AI fetch logic in `RoutePanel.tsx`:
    - Add a `useEffect` that triggers when `intelligence` is updated.
    - Call `POST /api/ai` with a structured prompt containing route details, vehicle profile, hazards, and comms data.
    - Update summary state in `MapWithNav`.
- [ ] Add the "AI Summary" button to the `RoutePanel` (Route Assessment section):
    - Show loading spinner if `summaryLoading` is true.
    - Show button if `routeSummary` exists.

## Phase 4: Validation & Cleanup
- [ ] Create/modify unit tests for testing the code added or modified in this phase.
    - `src/test/components/SummaryModal.test.tsx`
    - Update `RoutePanel.test.tsx` and `MapWithNav.test.tsx`.
- [ ] Run `next lint --fix` (or `eslint --fix`) to auto-fix lint issues.
- [ ] Run `tsc --noEmit` one more time and fix any TypeScript type errors.
- [ ] Run `npm test` and make sure **all tests pass**.
- [ ] Run `prettier --write .` to make sure formatting is correct.
- [ ] Update the `MODIFICATION_IMPLEMENTATION.md` file with the current state (Journal).
- [ ] Use `git diff` to verify the changes, and create a suitable commit message.
- [ ] Wait for approval before committing.
- [ ] After committing, verify changes in the browser.

## Phase 5: Finalization
- [ ] Run `npm run test:coverage` and record the coverage summary in the Journal.
- [ ] Update any `README.md` or `CLAUDE.md` file if necessary.
- [ ] Ask the user to inspect the running app.

## Journal
- **2026-05-17**: Initialized implementation plan.
- **2026-05-17**: Ran baseline tests. All 467 tests passed.
- **2026-05-17**: Created `SummaryModal.tsx` and wired it into `MapWithNav.tsx`.
- **2026-05-17**: Updated `RoutePanel.tsx` with AI fetching logic and an "AI Summary" button.
- **2026-05-17**: Wrote unit tests for `SummaryModal.tsx` and ran coverage suite. All 475 tests passed. Coverage for `SummaryModal.tsx` is at 100%. `eslint` warnings fixed. Ready to commit.
