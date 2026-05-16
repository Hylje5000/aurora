# Implementation Plan: Municipality Demographic Data Integration

## Overview

Ingests `data/demographic_data.json` into PostgreSQL, extends `/api/municipalities` with a LEFT JOIN, and updates the `MapView` click handler to display population statistics in the info panel.

---

## Phase 0 — Pre-flight & DB Ingestion Script

- [x] Run all tests to ensure the project is in a good state before starting.
- [x] Write `scripts/ingest_demographics.py`:
  - Reads `.env.local` for `DATABASE_URL`
  - `--no-drop` flag for idempotent re-runs
  - Creates `municipality_demographics` table (PRIMARY KEY on `nat_code`)
  - Reads `data/demographic_data.json`; extracts only `properties` (ignores geometry)
  - Uses `execute_values` + per-batch commits (500 rows/batch) with `tqdm` progress bar
- [x] Run the script against the dev database and confirm 308 rows inserted.
- [x] After completing tasks, add any TODOs found to this plan.
- [x] Run `tsc --noEmit` and fix any TypeScript errors.
- [x] Run `npm test` — must be green before proceeding.
- [x] Run `prettier --write .`.
- [x] Re-read this file and update as needed.
- [x] Update Journal below with learnings.
- [x] Present commit message for user approval. Do not commit until approved.

---

## Phase 1 — API Route Update

- [x] Update `src/app/api/municipalities/route.ts`:
  - Add `LEFT JOIN municipality_demographics d ON d.nat_code = m.nat_code` to the SQL query
  - Include all demographic columns in the SELECT
  - Include the new fields in the GeoJSON `properties` object (nullable — LEFT JOIN may miss)
- [x] After completing tasks, add any TODOs found to this plan.
- [x] Update unit tests in `src/test/api/municipalities.test.ts`:
  - Add test: response includes demographic fields when DB returns them
  - Add test: demographic fields are `null` when LEFT JOIN returns no match (graceful degradation)
  - Add test: SQL uses LEFT JOIN
- [x] Run `tsc --noEmit` and fix any TypeScript errors.
- [x] Run `npm test` — must be green before proceeding.
- [x] Run `prettier --write .`.
- [x] Re-read this file and update as needed.
- [x] Update Journal below.
- [x] Present commit message for user approval. Do not commit until approved.

---

## Phase 2 — MapView Click Handler Update

- [x] Update the `municipalities-fill` click handler in `src/components/MapView.tsx`:
  - Build base `rows` array with `Code` and `Region` as before
  - When `p.population != null`, push demographic rows (Population, Male, Female, Under 15, Over 65, Data year)
- [x] After completing tasks, add any TODOs found to this plan.
- [x] Update `src/test/components/MapView.test.tsx`:
  - Add test: clicking a municipality feature with demographic properties shows population rows in the InfoPanel
  - Add test: clicking a municipality feature without demographic properties (null) shows only Code and Region
- [x] Run `tsc --noEmit` and fix any TypeScript errors.
- [x] Run `npm test` — must be green before proceeding.
- [x] Run `prettier --write .`.
- [x] Re-read this file and update as needed.
- [x] Update Journal below.
- [x] Present commit message for user approval. Do not commit until approved.

---

## Phase 3 — Final Checks & Docs

- [x] Run `npm run test:coverage` and record the summary in the Journal below.
- [x] Update `CLAUDE.md` to reflect the new ingestion script, DB table, and API/MapView changes.
- [ ] Ask the user to inspect the running app and confirm they are satisfied.

---

## Journal

### Phases 0–2 (2026-05-16)

All three phases implemented in one session.

- **Phase 0:** 279 tests green at start. `scripts/ingest_demographics.py` follows the same pattern as `ingest_weather.py`. Ingested 308 rows (all Finnish municipalities, 2025 data). Used `ON CONFLICT (nat_code) DO UPDATE` for idempotent `--no-drop` runs.
- **Phase 1:** API route updated with LEFT JOIN. 6 tests (up from 4), covering full demographics match, LEFT JOIN null miss, and SQL shape. `/api/municipalities` at 100% coverage.
- **Phase 2:** Click handler extended conditionally — `p.population != null` guard ensures graceful degradation when demographics are absent. 2 new MapView tests (with/without demographics). 283 tests total, all passing.
- **Coverage (283 tests):** All API routes ≥96%, `/api/municipalities` 100%, `MapView.tsx` ~83% (unchanged — branch gaps in async callbacks).
- **No surprises.** The `kunta` code in the demographic JSON directly matches `nat_code` in the municipalities table, so no translation was needed.
