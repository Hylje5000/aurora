#!/usr/bin/env python3
"""
Ingest regional GeoJSON infrastructure data into PostGIS.

Tables created:
  roads          — consolidated Digiroad road links with aggregated attributes
  bridges        — bridge structures with weight/height restrictions
  railways       — railway track segments
  municipalities — municipality boundary polygons

Usage:
  pip install -r scripts/requirements.txt
  python scripts/ingest_geodata.py [--region all|turku|lappi|karjala] [--no-drop]
"""

import argparse
import os
import re
import sys
from pathlib import Path

import geopandas as gpd
import pandas as pd
import psycopg2
from dotenv import dotenv_values
from shapely.geometry import mapping
from tqdm import tqdm

REGIONS = ["turku", "lappi", "karjala"]
DATA_DIR = Path(__file__).parent.parent / "data"


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def get_db_url() -> str:
    env = dotenv_values(Path(__file__).parent.parent / ".env.local")
    url = env.get("DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("DATABASE_URL not found in .env.local or environment")
    return url


def connect(url: str):
    conn = psycopg2.connect(url)
    conn.autocommit = False
    return conn


def create_tables(conn, drop: bool) -> None:
    with conn.cursor() as cur:
        if drop:
            cur.execute("""
                DROP TABLE IF EXISTS roads CASCADE;
                DROP TABLE IF EXISTS bridges CASCADE;
                DROP TABLE IF EXISTS railways CASCADE;
                DROP TABLE IF EXISTS municipalities CASCADE;
            """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS roads (
                id                SERIAL PRIMARY KEY,
                link_id           TEXT NOT NULL,
                aoi_id            TEXT NOT NULL,
                geom              GEOMETRY(LINESTRING, 4326) NOT NULL,
                admin_class       INTEGER,
                functional_class  INTEGER,
                has_structure     INTEGER,
                max_mass_kg       INTEGER,
                max_height_cm     INTEGER,
                max_bogie_mass_kg INTEGER,
                max_axle_mass_kg  INTEGER,
                width_cm          INTEGER,
                lane_count        INTEGER,
                pavement_type     INTEGER,
                has_damage        BOOLEAN DEFAULT FALSE,
                damage_recurring  BOOLEAN DEFAULT FALSE,
                condition_class   INTEGER,
                condition_text    TEXT,
                rut_depth_mm      NUMERIC,
                ride_quality      INTEGER
            );
            CREATE INDEX IF NOT EXISTS roads_geom_idx ON roads USING GIST(geom);
            CREATE INDEX IF NOT EXISTS roads_aoi_idx  ON roads (aoi_id);

            CREATE TABLE IF NOT EXISTS bridges (
                id                      SERIAL PRIMARY KEY,
                bridge_src_id           INTEGER,
                oid                     TEXT,
                name                    TEXT,
                code                    TEXT,
                status                  TEXT,
                aoi_id                  TEXT NOT NULL,
                geom                    GEOMETRY(POINT, 4326) NOT NULL,
                max_vehicle_mass_t      NUMERIC,
                max_bogie_mass_t        NUMERIC,
                max_combination_mass_t  NUMERIC,
                max_axle_mass_t         NUMERIC,
                height_restriction_m    NUMERIC,
                type_name               TEXT,
                owner                   TEXT,
                municipalities          TEXT,
                road_address            TEXT,
                network_type            TEXT,
                updated_date            DATE
            );
            CREATE INDEX IF NOT EXISTS bridges_geom_idx ON bridges USING GIST(geom);

            CREATE TABLE IF NOT EXISTS railways (
                id                   SERIAL PRIMARY KEY,
                track_src_id         INTEGER,
                oid                  TEXT,
                name                 TEXT,
                description          TEXT,
                track_type           TEXT,
                state                TEXT,
                aoi_id               TEXT NOT NULL,
                geom                 GEOMETRY(LINESTRING, 4326) NOT NULL,
                route_name           TEXT,
                length_m             NUMERIC,
                start_km             INTEGER,
                end_km               INTEGER,
                maintenance_district TEXT,
                operating_centre     TEXT
            );
            CREATE INDEX IF NOT EXISTS railways_geom_idx ON railways USING GIST(geom);

            CREATE TABLE IF NOT EXISTS municipalities (
                id       SERIAL PRIMARY KEY,
                nat_code TEXT,
                name_fi  TEXT,
                name_sv  TEXT,
                aoi_id   TEXT NOT NULL,
                geom     GEOMETRY(MULTIPOLYGON, 4326) NOT NULL
            );
            CREATE INDEX IF NOT EXISTS municipalities_geom_idx ON municipalities USING GIST(geom);
        """)
    conn.commit()
    print("Tables ready.")


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

def to_wkt_2d(geom):
    """Return 2D WKT, stripping Z values that PostGIS can choke on."""
    from shapely.geometry import LineString, MultiLineString, Point, MultiPolygon
    from shapely.ops import transform

    def drop_z(x, y, z=None):
        return (x, y)

    return transform(drop_z, geom).wkt


def load_gdf(path: Path) -> gpd.GeoDataFrame:
    """Read a GeoJSON file and reproject to EPSG:4326."""
    gdf = gpd.read_file(path)
    if gdf.crs is None:
        gdf = gdf.set_crs(epsg=3067)
    elif gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs(epsg=4326)
    return gdf


# ---------------------------------------------------------------------------
# Roads ingestion
# ---------------------------------------------------------------------------

def _load_attr(path: Path, value_col: str, agg: str = "min", src_col: str = "arvo") -> pd.Series:
    """Load a Digiroad attribute file and aggregate by link_id."""
    if not path.exists():
        return pd.Series(dtype="float64")
    gdf = gpd.read_file(path)
    if src_col not in gdf.columns:
        return pd.Series(dtype="float64")
    gdf["_val"] = pd.to_numeric(gdf[src_col], errors="coerce")
    if agg == "min":
        return gdf.groupby("link_id")["_val"].min().rename(value_col)
    elif agg == "first":
        return gdf.groupby("link_id")["_val"].first().rename(value_col)
    elif agg == "any":
        return (gdf.groupby("link_id")["_val"].count() > 0).rename(value_col)
    return pd.Series(dtype="float64")


def _load_telimassa(path: Path) -> pd.Series:
    """Load dr_max_telimassa: min of m_2akseli and m_3akseli per link_id."""
    if not path.exists():
        return pd.Series(dtype="float64")
    gdf = gpd.read_file(path)
    gdf["_2a"] = pd.to_numeric(gdf.get("m_2akseli"), errors="coerce")
    gdf["_3a"] = pd.to_numeric(gdf.get("m_3akseli"), errors="coerce")
    gdf["_min"] = gdf[["_2a", "_3a"]].min(axis=1)
    return gdf.groupby("link_id")["_min"].min().rename("max_bogie_mass_kg")


def ingest_roads(conn, region: str, data_dir: Path) -> int:
    rdir = data_dir / region
    print(f"  [{region}] Loading road geometry base (dr_leveys)…")
    gdf_base = load_gdf(rdir / "digiroad_dr_leveys.json")

    # One geometry per link_id (first occurrence), MIN width
    geom_per_link = (
        gdf_base.sort_values("link_id")
        .drop_duplicates("link_id")
        .set_index("link_id")["geometry"]
    )
    width_per_link = (
        gdf_base.groupby("link_id")["arvo"]
        .apply(lambda s: pd.to_numeric(s, errors="coerce").min())
        .rename("width_cm")
    )

    base = pd.DataFrame({"geometry": geom_per_link, "width_cm": width_per_link})

    # Attribute joins by link_id
    print(f"  [{region}] Joining road attributes…")
    attrs = [
        _load_attr(rdir / "digiroad_dr_kaistojen_lukumaara.json", "lane_count", "min"),
        _load_attr(rdir / "digiroad_dr_max_massa.json",           "max_mass_kg", "min"),
        _load_attr(rdir / "digiroad_dr_max_korkeus.json",         "max_height_cm", "min"),
        _load_telimassa(rdir / "digiroad_dr_max_telimassa.json"),
    ]
    if (rdir / "digiroad_dr_max_akselimassa.json").exists():
        attrs.append(_load_attr(rdir / "digiroad_dr_max_akselimassa.json", "max_axle_mass_kg", "min"))
    for s in attrs:
        if not s.empty:
            base = base.join(s, how="left")

    # Pavement type (first per link)
    if (rdir / "digiroad_dr_paallystetty_tie.json").exists():
        pave = _load_attr(rdir / "digiroad_dr_paallystetty_tie.json", "pavement_type", "first")
        if not pave.empty:
            base = base.join(pave, how="left")

    # Damage flag from kelirikko
    if (rdir / "digiroad_dr_kelirikko.json").exists():
        gdf_dmg = gpd.read_file(rdir / "digiroad_dr_kelirikko.json")
        has_dmg = (gdf_dmg.groupby("link_id").size() > 0).rename("has_damage")
        recurring = (
            gdf_dmg[gdf_dmg["toistuva"].isin(["1", 1])]
            .groupby("link_id").size() > 0
        ).rename("damage_recurring")
        base = base.join(has_dmg, how="left").join(recurring, how="left")
        base["has_damage"] = base["has_damage"].fillna(False)
        base["damage_recurring"] = base["damage_recurring"].fillna(False)

    # Admin/functional class + structure flag from tielinkki (Lappi, Karjala)
    tielinkki_path = rdir / "digiroad_dr_tielinkki_silta_alikulku_tunneli.json"
    if tielinkki_path.exists():
        gdf_link = gpd.read_file(tielinkki_path)
        link_attrs = (
            gdf_link.groupby("link_id")
            .first()[["hallinn_lk", "toiminn_lk", "silta_alik"]]
            .rename(columns={
                "hallinn_lk": "admin_class",
                "toiminn_lk": "functional_class",
                "silta_alik": "has_structure",
            })
        )
        base = base.join(link_attrs, how="left")

    # Pavement condition — spatial join with tiestotiedot_paallysteiden_kunto
    condition_path = rdir / "tiestotiedot_paallysteiden_kunto.json"
    if condition_path.exists():
        print(f"  [{region}] Spatial-joining pavement condition (may take a moment)…")
        gdf_cond = load_gdf(condition_path)
        # Explode MultiLineString → LineString for join
        gdf_cond = gdf_cond.explode(index_parts=False).reset_index(drop=True)
        gdf_cond = gdf_cond[["geometry", "kunto_lk_nro", "kunto_lk", "ura", "ride_lk"]].copy()
        gdf_cond = gdf_cond.rename(columns={
            "kunto_lk_nro": "condition_class",
            "kunto_lk": "condition_text",
            "ura": "rut_depth_mm",
            "ride_lk": "ride_quality",
        })
        roads_gdf = gpd.GeoDataFrame(base.reset_index(), geometry="geometry", crs="EPSG:4326")
        joined = gpd.sjoin(roads_gdf, gdf_cond, how="left", predicate="intersects")
        # If multiple condition matches, take the worst (lowest condition_class)
        joined = (
            joined.sort_values("condition_class")
            .groupby("link_id", as_index=False)
            .first()
            .set_index("link_id")
        )
        for col in ["condition_class", "condition_text", "rut_depth_mm", "ride_quality"]:
            if col in joined.columns:
                base[col] = joined[col]

    base = base.reset_index()  # link_id becomes a column

    # Ensure required columns exist
    for col in ["admin_class", "functional_class", "has_structure",
                "max_mass_kg", "max_height_cm", "max_bogie_mass_kg", "max_axle_mass_kg",
                "lane_count", "pavement_type",
                "condition_class", "condition_text", "rut_depth_mm", "ride_quality"]:
        if col not in base.columns:
            base[col] = None
    if "has_damage" not in base.columns:
        base["has_damage"] = False
    if "damage_recurring" not in base.columns:
        base["damage_recurring"] = False

    with conn.cursor() as cur:
        cur.execute("DELETE FROM roads WHERE aoi_id = %s", (region,))
    conn.commit()

    print(f"  [{region}] Inserting {len(base)} road segments…")
    rows = []
    for _, row in base.iterrows():
        if row["geometry"] is None:
            continue
        rows.append((
            row["link_id"],
            region,
            to_wkt_2d(row["geometry"]),
            _safe_int(row.get("admin_class")),
            _safe_int(row.get("functional_class")),
            _safe_int(row.get("has_structure")),
            _safe_int(row.get("max_mass_kg")),
            _safe_int(row.get("max_height_cm")),
            _safe_int(row.get("max_bogie_mass_kg")),
            _safe_int(row.get("max_axle_mass_kg")),
            _safe_int(row.get("width_cm")),
            _safe_int(row.get("lane_count")),
            _safe_int(row.get("pavement_type")),
            bool(row.get("has_damage", False)),
            bool(row.get("damage_recurring", False)),
            _safe_int(row.get("condition_class")),
            _safe_str(row.get("condition_text")),
            _safe_float(row.get("rut_depth_mm")),
            _safe_int(row.get("ride_quality")),
        ))

    sql = """
        INSERT INTO roads (
            link_id, aoi_id, geom,
            admin_class, functional_class, has_structure,
            max_mass_kg, max_height_cm, max_bogie_mass_kg, max_axle_mass_kg,
            width_cm, lane_count, pavement_type,
            has_damage, damage_recurring,
            condition_class, condition_text, rut_depth_mm, ride_quality
        ) VALUES %s
    """
    tmpl = "(%s, %s, ST_GeomFromText(%s, 4326), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    _batch_insert(conn, sql, rows, template=tmpl)
    return len(rows)


# ---------------------------------------------------------------------------
# Bridges ingestion
# ---------------------------------------------------------------------------

def _parse_height(raw):
    if not raw or str(raw).strip() == "":
        return None
    m = re.search(r"[\d.]+", str(raw))
    return float(m.group()) if m else None


def ingest_bridges(conn, region: str, data_dir: Path) -> int:
    path = data_dir / region / "taitorakenteet_silta.json"
    if not path.exists():
        return 0
    with conn.cursor() as cur:
        cur.execute("DELETE FROM bridges WHERE aoi_id = %s", (region,))
    conn.commit()

    print(f"  [{region}] Loading bridges…")
    gdf = load_gdf(path)

    rows = []
    for _, row in gdf.iterrows():
        p = row
        if row.geometry is None:
            continue
        # Parse kayttotarkoitukset → type_name e.g. "tunnus:11,nimi:Vesistösilta,..."
        type_name = None
        raw_kt = str(p.get("kayttotarkoitukset", "") or "")
        m = re.search(r"nimi:([^,]+)", raw_kt)
        if m:
            type_name = m.group(1).strip()

        updated_raw = p.get("paivitetty")
        updated_date = str(updated_raw)[:10] if updated_raw else None

        rows.append((
            _safe_int(p.get("id")),
            _safe_str(p.get("oid")),
            _safe_str(p.get("nimi")),
            _safe_str(p.get("tunnus")),
            _safe_str(p.get("tila")),
            region,
            to_wkt_2d(row.geometry),
            _safe_float(p.get("ajoneuvon_suurin_sallittu_massa")),
            _safe_float(p.get("ajoneuvon_suurin_sallittu_telille_kohdistuva_massa")),
            _safe_float(p.get("ajoneuvoyhdistelman_suurin_sallittu_massa")),
            _safe_float(p.get("ajoneuvon_suurin_sallittu_akselille_kohdistuva_massa")),
            _parse_height(p.get("korkeusrajoitus")),
            type_name,
            _safe_str(p.get("nykyinen_omistaja")),
            _safe_str(p.get("sijaintikunnat")),
            _safe_str(p.get("tieosoitteet")),
            _safe_str(p.get("vaylanpito")),
            updated_date,
        ))

    sql = """
        INSERT INTO bridges (
            bridge_src_id, oid, name, code, status, aoi_id, geom,
            max_vehicle_mass_t, max_bogie_mass_t, max_combination_mass_t, max_axle_mass_t,
            height_restriction_m, type_name, owner, municipalities, road_address,
            network_type, updated_date
        ) VALUES %s
    """
    tmpl = "(%s, %s, %s, %s, %s, %s, ST_GeomFromText(%s, 4326), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    _batch_insert(conn, sql, rows, template=tmpl)
    return len(rows)


# ---------------------------------------------------------------------------
# Railways ingestion
# ---------------------------------------------------------------------------

def ingest_railways(conn, region: str, data_dir: Path) -> int:
    path = data_dir / region / "ratatiedot_locationtracks.json"
    if not path.exists():
        return 0
    with conn.cursor() as cur:
        cur.execute("DELETE FROM railways WHERE aoi_id = %s", (region,))
    conn.commit()

    print(f"  [{region}] Loading railways…")
    gdf = load_gdf(path)

    rows = []
    for _, row in gdf.iterrows():
        p = row
        if row.geometry is None:
            continue
        rows.append((
            _safe_int(p.get("internal_id")),
            _safe_str(p.get("oid")),
            _safe_str(p.get("name")),
            _safe_str(p.get("description")),
            _safe_str(p.get("type")),
            _safe_str(p.get("state")),
            region,
            to_wkt_2d(row.geometry),
            _safe_str(p.get("route_name")),
            _safe_float(p.get("length")),
            _safe_int(p.get("start_km")),
            _safe_int(p.get("end_km")),
            _safe_str(p.get("maintenance_district")),
            _safe_str(p.get("operating_centre_district")),
        ))

    sql = """
        INSERT INTO railways (
            track_src_id, oid, name, description, track_type, state, aoi_id, geom,
            route_name, length_m, start_km, end_km, maintenance_district, operating_centre
        ) VALUES %s
    """
    tmpl = "(%s, %s, %s, %s, %s, %s, %s, ST_GeomFromText(%s, 4326), %s, %s, %s, %s, %s, %s)"
    _batch_insert(conn, sql, rows, template=tmpl)
    return len(rows)


# ---------------------------------------------------------------------------
# Municipalities ingestion
# ---------------------------------------------------------------------------

def ingest_municipalities(conn, region: str, data_dir: Path) -> int:
    path = data_dir / region / "paikkatiedot_kuntarajat_10k.json"
    if not path.exists():
        return 0
    with conn.cursor() as cur:
        cur.execute("DELETE FROM municipalities WHERE aoi_id = %s", (region,))
    conn.commit()

    print(f"  [{region}] Loading municipalities…")
    gdf = load_gdf(path)

    rows = []
    for _, row in gdf.iterrows():
        p = row
        if row.geometry is None:
            continue
        # Force MultiPolygon
        from shapely.geometry import MultiPolygon, Polygon
        geom = row.geometry
        if isinstance(geom, Polygon):
            geom = MultiPolygon([geom])
        rows.append((
            _safe_str(p.get("natcode")),
            _safe_str(p.get("namefin")),
            _safe_str(p.get("nameswe")),
            region,
            to_wkt_2d(geom),
        ))

    sql = "INSERT INTO municipalities (nat_code, name_fi, name_sv, aoi_id, geom) VALUES %s"
    tmpl = "(%s, %s, %s, %s, ST_GeomFromText(%s, 4326))"
    _batch_insert(conn, sql, rows, template=tmpl)
    return len(rows)


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def _safe_int(v):
    try:
        if v is None or (isinstance(v, float) and pd.isna(v)):
            return None
        return int(v)
    except (TypeError, ValueError):
        return None


def _safe_float(v):
    try:
        if v is None or (isinstance(v, float) and pd.isna(v)):
            return None
        return float(v)
    except (TypeError, ValueError):
        return None


def _safe_str(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = str(v).strip()
    return s if s else None


def _batch_insert(
    conn, sql_head: str, rows: list, template: str, batch_size: int = 500
) -> None:
    from psycopg2.extras import execute_values

    batches = list(range(0, len(rows), batch_size))
    with conn.cursor() as cur:
        for i in tqdm(batches, unit="batch", leave=False):
            execute_values(cur, sql_head, rows[i : i + batch_size], template=template)
            conn.commit()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Ingest GeoJSON data into PostGIS")
    parser.add_argument(
        "--region",
        choices=["all"] + REGIONS,
        default="all",
        help="Which region(s) to ingest (default: all)",
    )
    parser.add_argument(
        "--no-drop",
        action="store_true",
        help="Skip DROP TABLE (append to existing tables instead)",
    )
    args = parser.parse_args()

    regions = REGIONS if args.region == "all" else [args.region]

    print("Connecting to database…")
    conn = connect(get_db_url())

    print("Creating tables…")
    create_tables(conn, drop=not args.no_drop)

    totals = {"roads": 0, "bridges": 0, "railways": 0, "municipalities": 0}

    for region in regions:
        print(f"\n=== Region: {region} ===")
        totals["roads"]          += ingest_roads(conn, region, DATA_DIR)
        totals["bridges"]        += ingest_bridges(conn, region, DATA_DIR)
        totals["railways"]       += ingest_railways(conn, region, DATA_DIR)
        totals["municipalities"] += ingest_municipalities(conn, region, DATA_DIR)

    conn.close()

    print("\n=== Summary ===")
    for table, count in totals.items():
        print(f"  {table:20s} {count:>7,} rows")


if __name__ == "__main__":
    main()
