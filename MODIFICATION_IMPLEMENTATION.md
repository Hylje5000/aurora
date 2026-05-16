# Implementation Plan: Historical Weather Widget

## Overview

Adds a historical weather widget to the Aurora IPB map. Weather CSV data is ingested into PostgreSQL, queried via a new API route, and displayed in two new components (`WeatherWidget` + `DatePicker`) wired into `MapWithNav`.

---

## Phase 0 — Pre-flight & DB Ingestion Script

- [x] Run all tests to ensure the project is in a good state before starting.
  ```
  npm test
  ```
- [x] Write `scripts/ingest_weather.py`:
  - Reads `.env.local` for `DATABASE_URL`
  - `--no-drop` flag for idempotent re-runs
  - Creates `weather_observations` table (with index on `region_id, month, day`)
  - Parses all three CSVs; converts `-1` precip to `NULL`; skips station name column
  - Uses `execute_values` + per-batch commits (500 rows/batch) with `tqdm` progress bars
- [x] Run the script against the dev database and confirm row counts (~10,800 rows total).
- [x] After completing tasks, add any TODOs found to this plan.
- [x] Create/modify unit tests for the ingestion script if relevant.
- [x] Run `tsc --noEmit` and fix any TypeScript errors.
- [x] Run `npm test` — must be green before proceeding.
- [x] Run `prettier --write .`.
- [x] Re-read this file and update as needed.
- [x] Update Journal below with learnings.
- [x] Present commit message for user approval. Do not commit until approved.

---

## Phase 1 — API Route `/api/weather`

- [x] Create `src/app/api/weather/route.ts`:
  - Validates `region`, `month`, `day` query params (400 on bad input)
  - Runs single aggregate SQL query against `weather_observations`
  - Returns `WeatherStats` JSON
  - Graceful degradation (returns `sampleSize: 0` zeroed stats when DB is absent or query fails)
- [x] Export the `WeatherStats` type from the route file (or a shared lib file if needed).
- [x] After completing tasks, add any TODOs found to this plan.
- [x] Write unit tests in `src/test/api/weather.test.ts` covering:
  - Valid request returns correct aggregated stats
  - `-1` precip excluded from rain average (NULL handling)
  - Missing params → 400
  - Invalid region → 400
  - DB failure → 200 with zeroed stats
- [x] Run `tsc --noEmit` and fix any TypeScript errors.
- [x] Run `npm test` — must be green before proceeding.
- [x] Run `prettier --write .`.
- [x] Re-read this file and update as needed.
- [x] Update Journal below.
- [x] `git diff` — present commit message for user approval.

---

## Phase 2 — `WeatherWidget` Component

- [x] Create `src/components/WeatherWidget.tsx`:
  - Props: `region: string`, `month: number`, `day: number`
  - `useEffect` fetches `/api/weather?…` on prop change
  - Loading state while fetching
  - Displays: avg mean temp ± spread, avg max/min, rain probability %, avg mm on wet days
  - Hidden/zeroed gracefully when `sampleSize === 0`
  - Styling: dark slate card, `font-mono text-xs`, consistent with InfoPanel / LayerPanel
- [x] After completing tasks, add any TODOs found to this plan.
- [x] Write unit tests in `src/test/components/WeatherWidget.test.tsx` covering:
  - Renders loading state initially
  - Displays stats after successful fetch
  - Shows fallback when `sampleSize === 0`
  - Refetches when props change
- [x] Run `tsc --noEmit` and fix any TypeScript errors.
- [x] Run `npm test` — must be green before proceeding.
- [x] Run `prettier --write .`.
- [x] Re-read this file and update as needed.
- [x] Update Journal below.
- [x] `git diff` — present commit message for user approval.

---

## Phase 3 — `DatePicker` Component

- [x] Create `src/components/DatePicker.tsx`:
  - Props: `month: number`, `day: number`, `onChange: (month: number, day: number) => void`
  - Two `<select>` dropdowns: Month (Jan–Dec) and Day (1–31)
  - Days clamped to valid range for the chosen month (Feb max 29)
  - When month changes and current day is out of range, clamp day to new month's max
  - Styling: dark slate, consistent with other panels
- [x] After completing tasks, add any TODOs found to this plan.
- [x] Write unit tests in `src/test/components/DatePicker.test.tsx` covering:
  - Renders correct month and day selects
  - Calls `onChange` with correct values on month change
  - Calls `onChange` with correct values on day change
  - Clamps day when month changes to shorter month
- [x] Run `tsc --noEmit` and fix any TypeScript errors.
- [x] Run `npm test` — must be green before proceeding.
- [x] Run `prettier --write .`.
- [x] Re-read this file and update as needed.
- [x] Update Journal below.
- [x] `git diff` — present commit message for user approval.

---

## Phase 4 — Wire into `MapWithNav` + Final Polish

- [x] Add `selectedDay` state to `MapWithNav` (defaults to today's month/day).
- [x] Render `WeatherWidget` + `DatePicker` in a `absolute left-4 top-16 z-10` container, conditional on `selectedAreaId !== null`.
- [x] Ensure the widget resets/refetches when the selected region changes.
- [x] After completing tasks, add any TODOs found to this plan.
- [x] Update `MapWithNav` tests to cover the new weather widget stub and date picker stub.
- [x] Run `tsc --noEmit` and fix any TypeScript errors.
- [x] Run `npm test` — must be green before proceeding.
- [x] Run `prettier --write .`.
- [x] Re-read this file and update as needed.
- [x] Update Journal below.
- [x] `git diff` — present commit message for user approval.

---

## Phase 5 — Final Checks & Docs

- [ ] Run `npm run test:coverage` and record the summary in the Journal below.
- [ ] Update `CLAUDE.md` to reflect new components, API route, DB table, and ingestion script.
- [ ] Ask the user to inspect the running app and confirm they are satisfied.

---

## Journal

### Phase 0 (2026-05-16)

- Started with 248 passing tests.
- Wrote `scripts/ingest_weather.py` following `ingest_geodata.py` pattern exactly.
- **Surprise:** FMI CSV uses `'-'` (bare dash) as well as `'-1'` for missing values. `'-'` appears in precip and occasionally in temperature columns (station downtime). Fixed by adding `_parse_float()` helper that returns `None` for `'-'`, and skipping rows where any temperature column is missing (`NOT NULL` constraint).
- **Surprise:** `prettier --write .` OOM-crashed trying to format large GeoJSON data files. Created `.prettierignore` with `data/` to exclude them.
- Ingested 10,852 rows total (turku: 3,651 | karjala: 3,549 | lappi: 3,652). Slightly under the expected ~10,800 due to skipped rows with missing temperature readings.

### Phases 1–4 (2026-05-16)

All phases implemented in one session:

- **Phase 1:** `src/app/api/weather/route.ts` — validates params, runs aggregate SQL, exports `WeatherStats`. DB errors degrade gracefully to zeroed stats (200) rather than 500. 12 tests, 260 total.
- **Phase 2:** `src/components/WeatherWidget.tsx` — useEffect + AbortController for clean fetch cancellation on re-render. Shows loading → stats or "No data". 6 tests, 266 total.
- **Phase 3:** `src/components/DatePicker.tsx` — two `<select>` dropdowns, day clamped to month max, Feb capped at 29. 9 tests, 275 total.
- **Phase 4:** `MapWithNav.tsx` wired — `selectedDay` state defaults to today, conditional render block `{selectedAreaId && ...}`, WeatherWidget refetches automatically when region changes. Added WeatherWidget + DatePicker stubs to MapWithNav tests. 4 new tests, 279 total.
