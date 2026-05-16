# Modification Implementation Plan: Cell Tower Friendly Color

## Phase 1: Pre-checks

- [ ] Run all tests to ensure the project is in a good state before starting modifications.
- [ ] Create/modify unit tests for testing the code added or modified in this phase.
- [ ] Run `eslint --fix .` to auto-fix lint issues.
- [ ] Run `tsc --noEmit` one more time and fix any TypeScript type errors.
- [ ] Run `npm test` and make sure **all tests pass**. A non-zero exit is a hard blocker.
- [ ] Run `prettier --write .` to make sure formatting is correct.
- [ ] Update the `MODIFICATION_IMPLEMENTATION.md` file with the current state (Journal).
- [ ] Use `git diff` to verify the changes, and create a suitable commit message for any changes.
- [ ] Wait for approval before committing.
- [ ] After committing the change, verify changes in the browser if the dev server is running.

## Phase 2: Modify Cell Tower Colors

- [ ] Open `src/components/MapView.tsx`.
- [ ] Find the `towerLayers` configuration array (around line 452).
- [ ] Change the `color` property for `GSM`, `UMTS`, `LTE`, and `CDMA` radio types from their custom colors to `#3b82f6` (friendly Blue).
- [ ] Create/modify unit tests for testing the code added or modified in this phase (update `src/components/MapView.test.tsx` if any color assertions exist).
- [ ] Run `eslint --fix .` to auto-fix lint issues.
- [ ] Run `tsc --noEmit` one more time and fix any TypeScript type errors.
- [ ] Run `npm test` and make sure **all tests pass**. A non-zero exit is a hard blocker.
- [ ] Run `prettier --write .` to make sure formatting is correct.
- [ ] Update the `MODIFICATION_IMPLEMENTATION.md` file with the current state (Journal).
- [ ] Use `git diff` to verify the changes, and create a suitable commit message for any changes.
- [ ] Wait for approval before committing.
- [ ] After committing the change, verify changes in the browser if the dev server is running.

## Phase 3: Final Verification and Documentation

- [ ] Run `npm run test:coverage` and record the coverage summary in the Journal.
- [ ] Update any `README.md` or `CLAUDE.md` file if it references the old colors.
- [ ] Ask the user to inspect the package (and running app, if any).
- [ ] Create/modify unit tests for testing the code added or modified in this phase (Not applicable for this documentation phase).
- [ ] Run `eslint --fix .` to auto-fix lint issues.
- [ ] Run `tsc --noEmit` one more time and fix any TypeScript type errors.
- [ ] Run `npm test` and make sure **all tests pass**. A non-zero exit is a hard blocker.
- [ ] Run `prettier --write .` to make sure formatting is correct.
- [ ] Update the `MODIFICATION_IMPLEMENTATION.md` file with the current state (Journal).
- [ ] Use `git diff` to verify the changes, and create a suitable commit message for any changes.
- [ ] Wait for approval before committing.
- [ ] After committing the change, verify changes in the browser if the dev server is running.

---

## Journal

**[Phase 1]**

- Ran `npm test && npx eslint --fix . && npx tsc --noEmit && npx prettier --write .`
- All 237 tests passed.
- Linters, type checks, and formatters executed successfully with no errors.
- Pre-checks complete.

**[Phase 2]**
- Modified `src/components/MapView.tsx` to set cell tower radio colors to `#3b82f6` (friendly Blue).
- Modified `src/components/LayerPanel.tsx` to update the corresponding UI dot colors to `#3b82f6`.
- Ran `npm test && npx eslint --fix . && npx tsc --noEmit && npx prettier --write .`. All checks and 237 tests passed.
- Verified changes with `git diff`.
- Awaiting approval to commit.

**[Phase 3]**
_Pending_
