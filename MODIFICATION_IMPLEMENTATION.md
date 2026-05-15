# Implementation Plan: Testing Infrastructure for Aurora IPB

## Journal

### Phase 0 — 2026-05-15

- Git status was clean except for the two modification doc files (MODIFICATION_DESIGN.md, MODIFICATION_IMPLEMENTATION.md) as expected.
- `npm test` produced "Missing script: test" — confirmed no test runner existed.
- Original scripts: `dev`, `build`, `start`, `lint`.

### Phase 1 — 2026-05-15

- Installed Vitest 3.2.4, @vitejs/plugin-react 6.0.2, @testing-library/\* suite, jsdom 27, vite-tsconfig-paths 6.1.1.
- Discovered: Vitest 3.x bundles its own vendored Vite (rolldown-based), which conflicts with the outer Vite used by @vitejs/plugin-react when tsc type-checks `vitest.config.ts`. Fix: exclude `vitest.config.ts` from `tsconfig.json`. This is safe — the config is only consumed by Vitest, not the Next.js build.
- `next lint` subcommand syntax changed in Next.js 16; `npm run lint` (which runs `eslint`) works correctly.
- Runner confirmed operational: `npm test` exits with code 1 and message "No test files found" — expected.

### Phase 2 — 2026-05-15

- Exported `parseBbox` from `route.ts` to allow direct unit testing.
- Wrote 11 tests: 6 for `parseBbox` (null cases + valid tuple) and 5 for the `GET` handler (400 missing, 400 malformed, 200 empty+warning, 200 with features, 500 on DB error).
- `console.error` fires in the 500 test (route logs the error) — this appears in stderr during `npm test` but is not a failure; it's correct behavior.
- All 11 tests pass. Lint and tsc clean.

---

## Phase 0 — Baseline Verification

- [ ] Confirm git status is clean (no uncommitted changes).
- [ ] Confirm no existing test runner is configured (`npm test` should fail or be absent).
- [ ] Note current `package.json` scripts for the journal.

After completing Phase 0:

- [ ] Update journal with findings.

---

## Phase 1 — Install Dependencies & Configure Vitest

- [ ] Install dev dependencies:
  ```
  npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom vite-tsconfig-paths jsdom
  ```
- [ ] Create `vitest.config.ts` at project root:

  ```typescript
  import { defineConfig } from "vitest/config";
  import react from "@vitejs/plugin-react";
  import tsconfigPaths from "vite-tsconfig-paths";

  export default defineConfig({
    plugins: [react(), tsconfigPaths()],
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
    },
  });
  ```

- [ ] Create `src/test/setup.ts` with `import "@testing-library/jest-dom";`
- [ ] Add scripts to `package.json`:
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`
  - `"test:coverage": "vitest run --coverage"`
- [ ] Run `npm test` — expect "no test files found" (zero failures, zero passes) to confirm the runner starts correctly.

After completing Phase 1:

- [ ] Run `next lint --fix` and fix any issues.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` to confirm runner is operational.
- [ ] Run `prettier --write .` for formatting.
- [ ] Re-read this file and update as needed.
- [ ] Update journal with actions taken, learnings, surprises.
- [ ] Run `git diff` and draft a commit message; present to user for approval.
- [ ] Wait for user approval before committing or moving to Phase 2.

---

## Phase 2 — Write Tests for `parseBbox` and `GET /api/features`

- [ ] Create `src/test/api/features.test.ts`.
- [ ] Export `parseBbox` from `src/app/api/features/route.ts` (currently unexported) so it can be tested directly.
- [ ] Write `parseBbox` unit tests:
  - Returns `null` for missing input.
  - Returns `null` for wrong number of parts.
  - Returns `null` for non-numeric values.
  - Returns `null` when `minLng >= maxLng` or `minLat >= maxLat`.
  - Returns the correct 4-tuple for a valid bbox string.
- [ ] Write `GET` handler tests (mock `@/lib/db` with `vi.mock`):
  - Returns 400 with error message when `bbox` param is missing.
  - Returns 400 when bbox is malformed.
  - Returns empty `FeatureCollection` with `X-Aurora-Warning` header when `DATABASE_URL` is absent.
  - Returns `FeatureCollection` with features when DB returns rows.
  - Returns 500 when DB throws.
- [ ] If any TODOs arise, add them as new tasks below.

After completing Phase 2:

- [ ] Run `next lint --fix` and fix any issues.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `prettier --write .` for formatting.
- [ ] Re-read this file and update as needed.
- [ ] Update journal.
- [ ] Run `git diff`, draft commit message, present to user for approval.
- [ ] Wait for user approval before committing or moving to Phase 3.

---

## Phase 3 — Write Tests for `db.ts` Pool Singleton

- [ ] Create `src/test/lib/db.test.ts`.
- [ ] Mock the `pg` module with `vi.mock("pg")` so no real connection is attempted.
- [ ] Test that importing `pool` twice returns the same instance (singleton guard).
- [ ] Test that `query` calls `pool.query` with the correct arguments.
- [ ] If any TODOs arise, add them as new tasks below.

After completing Phase 3:

- [ ] Run `next lint --fix` and fix any issues.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `prettier --write .` for formatting.
- [ ] Re-read this file and update as needed.
- [ ] Update journal.
- [ ] Run `git diff`, draft commit message, present to user for approval.
- [ ] Wait for user approval before committing or moving to Phase 4.

---

## Phase 4 — Write Tests for `MapView` and `MapLoader` Components

- [ ] Create `src/test/components/MapView.test.tsx`.
  - Mock `mapbox-gl` at module level with `vi.mock`.
  - Assert that the container `<div>` with `w-full h-full` is rendered.
  - Assert that `mapboxgl.Map` constructor is called once on mount.
  - Assert that `map.remove()` is called on unmount (cleanup).
- [ ] Create `src/test/components/MapLoader.test.tsx`.
  - Mock `next/dynamic` to return a simple stub component.
  - Assert that `MapLoader` renders without crashing.
- [ ] If any TODOs arise, add them as new tasks below.

After completing Phase 4:

- [ ] Run `next lint --fix` and fix any issues.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `prettier --write .` for formatting.
- [ ] Re-read this file and update as needed.
- [ ] Update journal.
- [ ] Run `git diff`, draft commit message, present to user for approval.
- [ ] Wait for user approval before committing or moving to Phase 5.

---

## Phase 5 — Update `modify.md` PDCA Loop

- [ ] Open `.claude/commands/modify.md`.
- [ ] Remove the `"or npx jest or npx vitest run, whichever is configured"` hedging language from every test run step — replace with `npm test`.
- [ ] Change wording so a non-zero test exit is an explicit blocker (not optional).
- [ ] Add a step to the final phase: "Run `npm run test:coverage` and record the coverage summary in the journal."
- [ ] Verify the file reads cleanly end-to-end.

After completing Phase 5:

- [ ] Run `next lint --fix` and fix any issues.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `prettier --write .` for formatting.
- [ ] Re-read this file and update as needed.
- [ ] Update journal.
- [ ] Run `git diff`, draft commit message, present to user for approval.
- [ ] Wait for user approval before committing or moving to Phase 6.

---

## Phase 6 — Final Cleanup

- [ ] Run `npm run test:coverage` and record the coverage summary in the journal.
- [ ] Update `README.md` with a "Testing" section: framework, how to run tests, how to run coverage.
- [ ] Update `CLAUDE.md` to document the test infrastructure: framework, test file layout, mock strategy, and the `npm test` / `npm run test:watch` / `npm run test:coverage` scripts.
- [ ] Ask the user to inspect the test suite and confirm they are satisfied, or note any further modifications needed.

After completing Phase 6:

- [ ] Run `npm test` one final time — all tests must pass.
- [ ] Update journal with final notes.
- [ ] Run `git diff`, draft commit message, present to user for approval.
- [ ] Wait for user approval before committing.

---

## Notes

- After completing any task, if you added TODOs to the code or left anything partially implemented, add new tasks here immediately.
- A failing `npm test` is a hard blocker — do not proceed to the next phase until all tests pass.
