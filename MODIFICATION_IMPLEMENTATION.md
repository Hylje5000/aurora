# Implementation Plan: GeoJSON Data Ingestion & Infrastructure Overlays

## Journal

_Updated after each phase._

---

## Phase 0: Pre-flight Checks

- [ ] Run all tests to ensure the project is in a good state before starting modifications.
  ```
  npm test
  ```
  All tests must pass before proceeding.

---

## Phase 1: Python Ingestion Script

**Goal**: Write `scripts/ingest_geodata.py` that reads all GeoJSON files, reprojects EPSG:3067→4326, aggregates Digiroad attributes per `link_id`, and loads 4 PostGIS tables.

### Tasks

- [ ] Create `scripts/` directory and `scripts/ingest_geodata.py`
- [ ] Add `scripts/requirements.txt` with: `geopandas`, `psycopg2-binary`, `shapely`, `python-dotenv`
- [ ] Implement `create_tables(conn)` — DROP IF EXISTS + CREATE for `roads`, `bridges`, `railways`, `municipalities` with all columns and GIST indexes
- [ ] Implement `ingest_roads(conn, region, data_dir)`:
  - Load `dr_kaistojen_lukumaara.json` as geometry base (most features = most complete road network)
  - Reproject all GDFs to EPSG:4326
  - Group by `link_id`, aggregate: `MIN` for restrictions, `FIRST` for descriptive
  - Flag `has_damage / damage_recurring` from `dr_kelirikko`
  - Join `condition_class`, `condition_text`, `rut_depth_mm`, `ride_quality` from `tiestotiedot_paallysteiden_kunto` by spatial intersection
  - Join `admin_class`, `functional_class`, `has_structure` from `dr_tielinkki` (Lappi/Karjala only)
  - Batch-insert using `executemany`
- [ ] Implement `ingest_bridges(conn, region, data_dir)`:
  - Parse Point geometry from EPSG:3067 coordinates, reproject to 4326
  - Extract weight columns: `ajoneuvon_suurin_sallittu_massa`, `ajoneuvoyhdistelman_suurin_sallittu_massa`, `ajoneuvon_suurin_sallittu_telille_kohdistuva_massa`, `ajoneuvon_suurin_sallittu_akselille_kohdistuva_massa`
  - Parse `korkeusrajoitus` string for height in metres
  - Parse `kayttotarkoitukset` for `type_name`
- [ ] Implement `ingest_railways(conn, region, data_dir)` — skip regions where file is absent
- [ ] Implement `ingest_municipalities(conn, region, data_dir)` — deduplicate by `nat_code` across regions
- [ ] Implement `main()` with argparse: `--region all|turku|lappi|karjala`, reads `DATABASE_URL` from `.env.local`
- [ ] Test script against local database; verify row counts and spot-check records

### End-of-phase checklist
- [ ] Run `npm test` — all tests still pass (script is Python-only, no JS changes yet).
- [ ] Update Journal with row counts and any surprises.
- [ ] `git diff` and present commit message for approval.
- [ ] Wait for approval, then commit.

---

## Phase 2: Database API Routes

**Goal**: Add 4 new Next.js API routes that serve GeoJSON from the new tables.

### Tasks

- [ ] Create `src/app/api/roads/route.ts`:
  - Reuse `parseBbox` from `@/app/api/features/route`
  - Query all road columns with `ST_Intersects + ST_MakeEnvelope`, `LIMIT 5000`
  - Graceful degradation when `DATABASE_URL` absent
- [ ] Create `src/app/api/bridges/route.ts` — same bbox pattern, all bridge columns
- [ ] Create `src/app/api/railways/route.ts` — same bbox pattern
- [ ] Create `src/app/api/municipalities/route.ts` — no bbox, return all municipalities
- [ ] Write unit tests:
  - `src/test/api/roads.test.ts`
  - `src/test/api/bridges.test.ts`
  - `src/test/api/railways.test.ts`
  - `src/test/api/municipalities.test.ts`

### End-of-phase checklist
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — all tests pass.
- [ ] Run `prettier --write .`
- [ ] Re-read MODIFICATION_IMPLEMENTATION.md for any updates.
- [ ] Update Journal.
- [ ] `git diff` and present commit message for approval.
- [ ] Wait for approval, then commit.

---

## Phase 3: Layer System Extension

**Goal**: Add 4 new `LayerKey` values, defaults, and `LAYER_GROUPS` entries to `src/lib/layers.ts`.

### Tasks

- [ ] Add to `LayerKey` union type: `'roads' | 'bridges' | 'railways' | 'municipalities'`
- [ ] Add to `DEFAULT_LAYER_VISIBILITY`:
  - `roads: true`, `bridges: true`, `railways: true`, `municipalities: false`
- [ ] Add to `LAYER_GROUPS`:
  - `roads: ['roads-line']`
  - `bridges: ['bridges-symbol']`
  - `railways: ['railways-line']`
  - `municipalities: ['municipalities-fill', 'municipalities-outline']`
- [ ] Update `src/test/lib/layers.test.ts` to cover the 4 new keys

### End-of-phase checklist
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix errors.
- [ ] Run `npm test` — all tests pass.
- [ ] Run `prettier --write .`
- [ ] Re-read MODIFICATION_IMPLEMENTATION.md.
- [ ] Update Journal.
- [ ] `git diff` and present commit message for approval.
- [ ] Wait for approval, then commit.

---

## Phase 4: MapView Infrastructure Layers

**Goal**: Add roads, bridges (NATO milsymbol), railways, and municipality layers to `MapView.tsx` with click-to-popup interaction.

### Tasks

- [ ] In `style.load` callback, register bridge NATO milsymbol images:
  - `bridge-active`: SIDC `SFGPIBE--------`, `fillColor: '#facc15'` (yellow)
  - `bridge-inactive`: SIDC `SFGPIBE--------`, `fillColor: '#94a3b8'` (grey)
  - Load both in parallel via `Promise.all`
- [ ] Add `municipalities-source` (GeoJSON, fetched once from `/api/municipalities`)
- [ ] Add `municipalities-fill` (fill, white, 0.05 opacity) and `municipalities-outline` (line, white 0.4 opacity, 1px) layers
- [ ] Add `roads-source` (GeoJSON, initially empty) and `roads-line` layer:
  - Color by `condition_class`: `1-2 → #ef4444`, `3 → #eab308`, `4-5 → #22c55e`, `null → #64748b`
  - Width: 2px
- [ ] Add `bridges-source` (GeoJSON, initially empty) and `bridges-symbol` layer:
  - `icon-image`: `['case', ['==', ['get', 'status'], 'kaytossa'], 'bridge-active', 'bridge-inactive']`
  - `icon-size: 0.5`, `icon-allow-overlap: true`
- [ ] Add `railways-source` (GeoJSON, initially empty) and `railways-line` layer:
  - `line-color: '#a78bfa'`, `line-width: 2`, `line-dasharray: [2, 2]`
- [ ] Implement `fetchRoads(map)`, `fetchBridges(map)`, `fetchRailways(map)` — fetch on `moveend`, update respective sources
- [ ] Call all three fetch functions after `style.load` and register `moveend` handlers
- [ ] Add click popup handlers for all 4 layer types
- [ ] Add cursor `pointer` on mouseenter/mouseleave for roads, bridges, railways, municipalities
- [ ] Update `useEffect([layerVisibility])` to handle visibility for all 4 new layer groups
- [ ] Update `MapView.test.tsx`:
  - Assert `addImage` called for `bridge-active`, `bridge-inactive`
  - Assert `addSource` called for all 4 new sources
  - Assert `addLayer` called for all 5 new layers
  - Test click popup for `roads-line` and `bridges-symbol`
- [ ] After completing tasks, add any TODOs found in code as new tasks here.

### End-of-phase checklist
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix errors.
- [ ] Run `npm test` — all tests pass.
- [ ] Run `prettier --write .`
- [ ] Re-read MODIFICATION_IMPLEMENTATION.md.
- [ ] Update Journal.
- [ ] `git diff` and present commit message for approval.
- [ ] Wait for approval, then commit.
- [ ] Verify hot-reload in browser: new layers appear, popups work on click.

---

## Phase 5: LayerPanel UI Updates

**Goal**: Add an "INFRASTRUCTURE" section to `LayerPanel.tsx`.

### Tasks

- [ ] Add `INFRASTRUCTURE` section after `COMMS` section with 4 new checkboxes:
  - Roads — amber dot `#f59e0b`
  - Bridges — yellow dot `#facc15`
  - Railways — purple dot `#a78bfa`
  - Municipalities — slate dot `#cbd5e1`
- [ ] Update `src/test/components/LayerPanel.test.tsx`:
  - Assert all 4 new checkboxes render
  - Assert `onToggle` called with correct key for each

### End-of-phase checklist
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix errors.
- [ ] Run `npm test` — all tests pass.
- [ ] Run `prettier --write .`
- [ ] Re-read MODIFICATION_IMPLEMENTATION.md.
- [ ] Update Journal.
- [ ] `git diff` and present commit message for approval.
- [ ] Wait for approval, then commit.
- [ ] Verify in browser: Infrastructure section appears in panel, toggles show/hide layers correctly.

---

## Phase 6: Final Checks & Documentation

### Tasks

- [ ] Run `npm run test:coverage` and record coverage summary in Journal.
- [ ] Update `README.md` if present with new layers and ingestion script usage.
- [ ] Update `CLAUDE.md`:
  - Add `scripts/ingest_geodata.py` to file structure
  - Add new database tables to Data Architecture section
  - Add new API routes
  - Add new `LayerKey` values and layer IDs
  - Update LayerPanel section list
  - Update coverage count
- [ ] Ask the user to inspect the running app and confirm satisfaction or note modifications needed.

---

## Journal

### Phase 0
_Not yet started._

### Phase 1
_Not yet started._

### Phase 2
_Not yet started._

### Phase 3
_Not yet started._

### Phase 4
_Not yet started._

### Phase 5
_Not yet started._

### Phase 6
_Not yet started._
