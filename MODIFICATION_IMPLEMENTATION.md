# Implementation Plan: Election Data Pie Chart in Municipality InfoPanel

## Overview

Ingest `data/election_data.csv` into PostgreSQL, extend `/api/municipalities` with a LEFT JOIN on the election summary, build a pure-SVG `ElectionPieChart` component, extend `InfoPanelData` with an optional `component` field, and wire everything together in the `MapView` municipality click handler.

---

## Phase 0 — Pre-flight

- [x] Run all tests to ensure the project is in a good state before starting.
- [ ] After completing tasks, add any TODOs found to this plan.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — must be green before proceeding.
- [ ] Run `prettier --write .`.
- [ ] Re-read this file and update as needed.
- [ ] Update Journal below with learnings.
- [ ] Present commit message for user approval. Do not commit until approved.

---

## Phase 1 — CSV Cleanup & DB Ingestion Script

- [ ] Write `scripts/ingest_elections.py`:
  - Read `data/election_data.csv` with `cp1252` encoding (strip `\r` line endings).
  - Get `DATABASE_URL` from `.env.local` (same pattern as other ingest scripts).
  - `--no-drop` flag for idempotent re-runs.
  - Filter rows: keep only rows where `Puolue` has no `(YYYY)` suffix, is not `"Puolueiden äänet yhteensä"`, and is not `"Muut"`.
  - Filter columns: keep only those matching `KU\d+` with **no** trailing ` -YY` historical suffix (regex: `KU(\d+) [^-]+$`). Extract `nat_code` as zero-padded 3-digit string.
  - Transpose wide→long: for each (party, municipality) pair, skip `.` values; emit `(nat_code, party, vote_share)`.
  - `CREATE TABLE IF NOT EXISTS municipality_elections (nat_code TEXT, party TEXT, vote_share REAL, PRIMARY KEY (nat_code, party))`.
  - `CREATE INDEX IF NOT EXISTS … ON municipality_elections (nat_code)`.
  - Upsert with `ON CONFLICT (nat_code, party) DO UPDATE SET vote_share = EXCLUDED.vote_share`.
  - After upsert, rebuild `municipality_election_summary`: `DROP TABLE IF EXISTS municipality_election_summary CASCADE; CREATE TABLE municipality_election_summary AS SELECT nat_code, json_object_agg(party, vote_share) AS parties FROM municipality_elections GROUP BY nat_code; ALTER TABLE municipality_election_summary ADD PRIMARY KEY (nat_code);`.
  - Print summary: row counts for both tables.
- [ ] Run `python scripts/ingest_elections.py` against the dev database; confirm ~6 776 rows in `municipality_elections` and 308 rows in `municipality_election_summary`.
- [ ] After completing tasks, add any TODOs found to this plan.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — must be green before proceeding.
- [ ] Run `prettier --write .`.
- [ ] Re-read this file and update as needed.
- [ ] Update Journal below with learnings.
- [ ] Present commit message for user approval. Do not commit until approved.

---

## Phase 2 — API Route Update

- [ ] Update `src/app/api/municipalities/route.ts`:
  - Add `LEFT JOIN municipality_election_summary e ON e.nat_code = m.nat_code` to the SQL.
  - Add `e.parties AS election_data` to SELECT.
  - Add `election_data: string | null` to the TypeScript query result type.
  - In the `properties` object: `election_data: row.election_data ?? null`.
- [ ] Update unit tests in `src/test/api/municipalities.test.ts`:
  - Add `election_data` field to `BASE_ROW` (as a JSON string `'{"KOK":26.4,"PS":18.2}'`).
  - Add test: `election_data` present in properties when DB returns it.
  - Add test: `election_data` is null when LEFT JOIN finds no match.
  - Add test: SQL query uses `LEFT JOIN municipality_election_summary`.
- [ ] After completing tasks, add any TODOs found to this plan.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — must be green before proceeding.
- [ ] Run `prettier --write .`.
- [ ] Re-read this file and update as needed.
- [ ] Update Journal below.
- [ ] Present commit message for user approval. Do not commit until approved.

---

## Phase 3 — ElectionPieChart Component

- [ ] Create `src/components/ElectionPieChart.tsx`:
  - Props: `data: Record<string, number>` (party → vote share %).
  - Party color map for KOK, PS, SDP, KESK, VIHR, VAS, RKP, KD, LIIKE; all others `#64748b`.
  - Merge parties with share < 2% into an "Other" slice; add to any existing `Muu puolue` share if present.
  - Sort slices by share descending (largest first), "Other" last.
  - Render a 160×160 SVG pie chart (center 80,80, radius 70) using arc paths.
  - Handle single-slice edge case (full circle — `<circle>` element instead of `<path>`).
  - Below the SVG, list the top 4 parties (by share, largest first) as rows: colored dot + abbreviation + percentage.
  - Styled to match the dark InfoPanel theme (slate text, `font-mono text-xs`).
- [ ] Create `src/test/components/ElectionPieChart.test.tsx`:
  - Test: renders SVG with correct number of slices.
  - Test: top 4 parties listed below in descending order.
  - Test: parties < 2% are grouped into "Other".
  - Test: single-party (100%) renders a circle, not a path.
  - Test: returns null / graceful when `data` is empty `{}`.
- [ ] After completing tasks, add any TODOs found to this plan.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — must be green before proceeding.
- [ ] Run `prettier --write .`.
- [ ] Re-read this file and update as needed.
- [ ] Update Journal below.
- [ ] Present commit message for user approval. Do not commit until approved.

---

## Phase 4 — InfoPanel Extension & MapView Wiring

- [ ] Update `src/components/InfoPanel.tsx`:
  - Add `component?: React.ReactNode` to `InfoPanelData`.
  - Render `{data.component}` below the rows section when present.
- [ ] Update `src/test/components/InfoPanel.test.tsx`:
  - Add test: optional `component` is rendered when provided.
  - Verify existing tests still pass (no regression).
- [ ] Update `src/components/MapView.tsx` — `municipalities-fill` click handler:
  - Import `ElectionPieChart`.
  - After building `rows`, extract `election_data` from properties:
    ```typescript
    const rawElection = p.election_data as string | null;
    const electionData = rawElection
      ? (JSON.parse(rawElection) as Record<string, number>)
      : null;
    ```
  - Pass `component: electionData ? <ElectionPieChart data={electionData} /> : null` in the `onInfoPanel` call.
- [ ] Update `src/test/components/MapView.test.tsx`:
  - Mock `ElectionPieChart` with `vi.mock("@/components/ElectionPieChart", () => ({ default: () => <div data-testid="election-pie-chart" /> }))`.
  - Add test: clicking municipality feature with `election_data` property causes InfoPanel to receive `component` (ElectionPieChart rendered).
  - Add test: clicking municipality feature without `election_data` (null) passes no `component`.
- [ ] After completing tasks, add any TODOs found to this plan.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — must be green before proceeding.
- [ ] Run `prettier --write .`.
- [ ] Re-read this file and update as needed.
- [ ] Update Journal below.
- [ ] Present commit message for user approval. Do not commit until approved.

---

## Phase 5 — Final Checks & Docs

- [ ] Run `npm run test:coverage` and record the summary in the Journal below.
- [ ] Update `CLAUDE.md` to reflect the new election ingestion script, DB tables, and ElectionPieChart changes.
- [ ] Ask the user to inspect the running app and confirm they are satisfied.

---

## Journal

### Phases 0–4 (2026-05-16)

All phases implemented in one session.

- **Phase 0:** 283 tests green at start. Branch: `feat/election-data`.
- **Phase 1:** `scripts/ingest_elections.py` reads `data/election_data.csv` (cp1252), strips Windows `\r`, filters 164 historical municipality columns and historical-only parties (those with `(YYYY)` in name). Transposes wide→long: 6 132 rows inserted into `municipality_elections` (308 municipalities × ~20 parties, `.` values skipped). Summary table rebuilt from `json_object_agg`. 308 summary rows confirmed.
- **Phase 2:** API route extended with `LEFT JOIN municipality_election_summary e ON e.nat_code = m.nat_code`. `e.parties::text AS election_data` added to SELECT. 2 new tests (election_data present, election_data null) + 1 SQL shape test. 9 total in that file, all passing.
- **Phase 3:** `ElectionPieChart.tsx` — pure SVG (160×160 viewBox, r=70), `buildSlices` merges < 2% parties into "Other", single-slice edge case uses `<circle>`. 9 tests, all passing. 100% stmts/lines coverage.
- **Phase 4:** `InfoPanelData.component?: React.ReactNode` added; InfoPanel renders it below rows. MapView click handler parses `election_data` JSON string from properties and passes `<ElectionPieChart>` as `component`. 2 new tests in InfoPanel (optional component, no component regression), 2 new tests in MapView (with/without election_data). All green.
- **Coverage (299 tests):** `ElectionPieChart.tsx` 100% stmts/lines, `/api/municipalities` 100%, `InfoPanel.tsx` 100%. MapView ~84% (unchanged branch gap pattern in async callbacks).
- **No surprises.** nat_code zero-padding worked cleanly (Statistics Finland stores `KU91` for Helsinki but our DB uses `091`). The `parties::text` cast was needed to get a plain JSON string from PostgreSQL JSONB into the TypeScript query type.
