# Route-Intelligence Overlap Filter — Implementation Plan

**Branch**: `feat/ui-fixes`  
**Design doc**: `MODIFICATION_DESIGN.md`

---

## Phase 1 — Pre-flight checks

- [ ] Run `npm test` to confirm the suite is green before any changes.

## Phase 2 — Apply the SQL fix

- [ ] In `src/app/api/route-intelligence/route.ts`, replace the roads `query<RoadRow>(...)` call with the CTE-based query:
  - Wrap `ST_GeomFromGeoJSON($1)` in a `route` CTE.
  - Add a `route_corridor` CTE: `ST_Buffer(geom::geography, 10)::geometry`.
  - `CROSS JOIN route rt` and `CROSS JOIN route_corridor rc` in the `FROM` clause.
  - Add `AND ST_Length(ST_Intersection(r.geom, rc.geom)::geography) > 15` to `WHERE`.
  - Change `ST_Centroid(geom)` → `ST_ClosestPoint(r.geom, rt.geom)` for `closest_pt`.
  - Add a brief inline comment above the new `WHERE` condition explaining the overlap constants.
- [ ] After completing this task, if you added any TODOs or left anything partially implemented, add new tasks here to track them.
- [ ] Run `next lint --fix` to auto-fix lint issues.
- [ ] Run `tsc --noEmit` and fix any TypeScript type errors.
- [ ] Run `npm test` — all tests must pass. A non-zero exit is a hard blocker.
- [ ] Run `prettier --write .` to normalise formatting.
- [ ] Re-read this file to check for anything missed.
- [ ] Update this file: check off completed items, add Journal entry.
- [ ] Run `git diff` and present the proposed commit message to the user for approval.
- [ ] **Wait for user approval before committing or moving on.**

## Phase 3 — Final checks and wrap-up

- [ ] Run `npm run test:coverage` and record the coverage summary in the Journal below.
- [ ] Update `CLAUDE.md` if the route-intelligence description needs updating.
- [ ] Ask the user to inspect the running app and confirm they are satisfied, or note any further modifications needed.

---

## Journal

### 2026-05-16 — Phase 1

Pre-flight: `npm test` — 467 tests passing, 37 files, all green. Clean baseline confirmed.

### 2026-05-16 — Phase 2

Applied the SQL fix to `src/app/api/route-intelligence/route.ts`:
- Added `route` and `route_corridor` CTEs.
- Changed `ST_Centroid(geom)` → `ST_ClosestPoint(r.geom, rt.geom)`.
- Added `AND ST_Length(ST_Intersection(r.geom, rc.geom)::geography) > 15` to the `WHERE` clause.
- Inline comment explains the 10 m / 15 m constants.

No TypeScript changes, no test changes needed — the fix is SQL text only and the mocked query layer isolates tests from SQL details.

ESLint, `tsc --noEmit`, `npm test` (467/467), and `prettier` all clean.

Committed: `96d6936 fix(route-intelligence): add overlap filter to suppress side-road false positives`

### 2026-05-16 — Phase 3

`npm run test:coverage`:
- All files: **91.55% stmts / 84.12% branch / 83.7% functions / 91.55% lines**
- `route-intelligence/route.ts`: 96.31% stmts / 87.82% branch / 100% functions (unchanged — fix is SQL, not new logic branches)

CLAUDE.md updated: file tree comment and `POST /api/route-intelligence` description updated to document the corridor CTE, overlap filter, and `ST_ClosestPoint`.
