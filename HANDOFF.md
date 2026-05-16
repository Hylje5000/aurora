# Aurora IPB — Infrastructure Layer Handoff

## What Was Built

Four new PostGIS-backed map overlay layers providing military-relevant infrastructure data for the three areas of interest (Turku archipelago, Lappi, North Karelia).

---

## Data Pipeline

### Ingestion Script

```bash
cd aurora
pip install -r scripts/requirements.txt
python3 scripts/ingest_geodata.py [--region all|turku|lappi|karjala] [--no-drop]
```

- Source data: `data/<region>/*.json` (Digiroad, Taitorakenteet, Ratatiedot, Paikkatiedot)
- Reprojects EPSG:3067 → EPSG:4326
- Uses `psycopg2.extras.execute_values` for fast bulk inserts (~1 s/batch of 500 rows)
- Commits after every batch — safe to interrupt and re-run with `--no-drop`
- Shows tqdm progress bars per table

### Current Row Counts

| Table | Rows |
|---|---|
| `roads` | 309,717 |
| `bridges` | 2,637 |
| `railways` | 383 |
| `municipalities` | 57 |

---

## Database Tables

### `roads`

Consolidated Digiroad road links aggregated by `link_id`. One row per unique road segment.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `link_id` | text | Digiroad UUID |
| `aoi_id` | text | `turku` / `lappi` / `karjala` |
| `geom` | geometry(LineString, 4326) | GIST indexed |
| `admin_class` | int | Administrative road class |
| `functional_class` | int | Functional class |
| `has_structure` | int | 0 = at grade, 1 = bridge/tunnel |
| `max_mass_kg` | int | Max vehicle mass (kg) |
| `max_height_cm` | int | Max height restriction (cm) |
| `max_bogie_mass_kg` | int | Max bogie mass (kg) |
| `max_axle_mass_kg` | int | Max axle mass (kg) |
| `width_cm` | int | Road width (cm) |
| `lane_count` | int | Number of lanes |
| `pavement_type` | int | 1=Asphalt, 2=Gravel, 3=Dirt |
| `has_damage` | bool | Seasonal damage flag |
| `damage_recurring` | bool | Recurring damage flag |
| `condition_class` | int | 1–5 (1=poor, 5=excellent) |
| `condition_text` | text | Finnish condition description |
| `rut_depth_mm` | float | Rut depth in mm |
| `ride_quality` | int | Ride quality score |

### `bridges`

Bridge structures with military load limits.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `bridge_src_id` | int | Source system ID |
| `oid` | text | OID string |
| `name` | text | Bridge name |
| `code` | text | Bridge code |
| `status` | text | `kaytossa` = active, else decommissioned |
| `aoi_id` | text | |
| `geom` | geometry(Point, 4326) | GIST indexed |
| `max_vehicle_mass_t` | float | Max single vehicle mass (tonnes) |
| `max_bogie_mass_t` | float | Max bogie mass (tonnes) |
| `max_combination_mass_t` | float | Max combination vehicle mass (tonnes) |
| `max_axle_mass_t` | float | Max axle mass (tonnes) |
| `height_restriction_m` | float | Clearance height (m) |
| `type_name` | text | Bridge type (e.g. Vesistösilta) |
| `owner` | text | Owner organisation |
| `municipalities` | text | Municipality names |
| `road_address` | text | Road address string |
| `network_type` | text | Network type |
| `updated_date` | text | Last update date |

### `railways`

Railway track segments.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `track_src_id` | int | Source system ID |
| `oid` | text | |
| `name` | text | Track name |
| `description` | text | |
| `track_type` | text | |
| `state` | text | |
| `aoi_id` | text | |
| `geom` | geometry(LineString, 4326) | GIST indexed |
| `route_name` | text | Railway route name |
| `length_m` | float | Track length (m) |
| `start_km` | int | Start km marker |
| `end_km` | int | End km marker |
| `maintenance_district` | text | |
| `operating_centre` | text | |

### `municipalities`

Municipality boundary polygons.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `nat_code` | text | National municipality code |
| `name_fi` | text | Finnish name |
| `name_sv` | text | Swedish name |
| `aoi_id` | text | |
| `geom` | geometry(MultiPolygon, 4326) | GIST indexed |

---

## API Routes

| Route | Query params | Notes |
|---|---|---|
| `GET /api/roads` | `bbox=minLng,minLat,maxLng,maxLat` | Returns up to 5000 road features |
| `GET /api/bridges` | `bbox=minLng,minLat,maxLng,maxLat` | All bridge features in bbox |
| `GET /api/railways` | `bbox=minLng,minLat,maxLng,maxLat` | All railway features in bbox |
| `GET /api/municipalities` | — | All 57 municipality polygons (no bbox) |

All routes return GeoJSON `FeatureCollection`. All degrade gracefully (empty collection + `X-Aurora-Warning` header) when `DATABASE_URL` is absent.

---

## Frontend Layers

New layers added to `MapView.tsx` and toggleable from `LayerPanel.tsx` under the **INFRASTRUCTURE** section:

| Layer key | Map layer ID(s) | Default | Visual |
|---|---|---|---|
| `roads` | `roads-line` | on | Lines coloured by condition class: red (1–2), yellow (3), green (4–5), grey (no data) |
| `bridges` | `bridges-symbol` | on | NATO milsymbol (SIDC `SFGPIBE--------`): yellow = active, grey = decommissioned |
| `railways` | `railways-line` | on | Purple dashed line |
| `municipalities` | `municipalities-fill`, `municipalities-outline` | off | Faint white fill + outline |

Clicking any feature opens a popup with all relevant attributes. Roads and bridges also update on every map `moveend` event.

---

## Road Condition Colour Coding

| `condition_class` | Colour | Meaning |
|---|---|---|
| 1–2 | Red `#ef4444` | Poor / very poor |
| 3 | Yellow `#eab308` | Moderate |
| 4–5 | Green `#22c55e` | Good / very good |
| null | Grey `#64748b` | No data |

---

## Remaining Work (Phase 6)

- [ ] Run `npm run test:coverage` and update coverage summary in `CLAUDE.md`
- [ ] Update `CLAUDE.md` with new tables, routes, layer keys, and file structure
- [ ] Update `README.md` with ingestion instructions
- [ ] Browser smoke test of all four new layers and popups

---

## Environment Variables

No new environment variables required. `DATABASE_URL` in `.env.local` must point to the Azure PostgreSQL instance where the ingestion was run.
