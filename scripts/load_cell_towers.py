from typing import Optional
#!/usr/bin/env python3
"""
Load OpenCelliD cell tower data from 244.csv into PostgreSQL/PostGIS.

Only keeps towers within the Areas of Interest defined in src/lib/areas.ts:
  - lappi   [20.500488, 68.114293, 23.708496, 69.388049]
  - karjala [29.289551, 62.283256, 31.256104, 63.1047]
  - turku   [21.09375,  59.76746,  23.115234, 60.565379]

Usage:
    # With DATABASE_URL in the environment:
    DATABASE_URL="postgresql://..." python scripts/load_cell_towers.py

    # Or let the script pick it up from .env.local automatically:
    python scripts/load_cell_towers.py

Dependencies: psycopg2-binary
    pip install psycopg2-binary
"""

import csv
import os
import re
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values

# ── Areas of Interest ────────────────────────────────────────────────────────
# Mirror of src/lib/areas.ts  (minLng, minLat, maxLng, maxLat)
AREAS_OF_INTEREST = [
    {"id": "lappi",   "bbox": (20.500488, 68.114293, 23.708496, 69.388049)},
    {"id": "karjala", "bbox": (29.289551, 62.283256, 31.256104, 63.1047)},
    {"id": "turku",   "bbox": (21.09375,  59.76746,  23.115234, 60.565379)},
]

REPO_ROOT = Path(__file__).resolve().parent.parent
CSV_PATH  = REPO_ROOT / "data" / "finland_cell_towers.csv"
ENV_PATH  = REPO_ROOT / ".env.local"


# ── Helpers ───────────────────────────────────────────────────────────────────

def load_database_url() -> str:
    """Return DATABASE_URL from the environment or .env.local, in that order."""
    url = os.environ.get("DATABASE_URL")
    if url:
        return url.strip()

    if ENV_PATH.exists():
        for line in ENV_PATH.read_text().splitlines():
            line = line.strip()
            if line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            if key.strip() == "DATABASE_URL":
                # Strip surrounding quotes if present
                val = val.strip().strip('"').strip("'")
                if val:
                    return val

    print(
        "ERROR: DATABASE_URL not found in environment or .env.local",
        file=sys.stderr,
    )
    sys.exit(1)


def classify_aoi(lon: float, lat: float) -> Optional[str]:
    """Return the AOI id if (lon, lat) falls inside any bounding box, else None."""
    for area in AREAS_OF_INTEREST:
        min_lng, min_lat, max_lng, max_lat = area["bbox"]
        if min_lng <= lon <= max_lng and min_lat <= lat <= max_lat:
            return area["id"]
    return None


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    db_url = load_database_url()

    if not CSV_PATH.exists():
        print(f"ERROR: CSV not found at {CSV_PATH}", file=sys.stderr)
        sys.exit(1)

    # ── Parse & filter CSV ───────────────────────────────────────────────────
    rows: list[tuple] = []
    total = filtered_out = 0

    with open(CSV_PATH, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for raw in reader:
            total += 1
            try:
                lon = float(raw["lon"])
                lat = float(raw["lat"])
            except ValueError:
                filtered_out += 1
                continue

            aoi_id = classify_aoi(lon, lat)
            if aoi_id is None:
                filtered_out += 1
                continue

            rows.append((
                raw["radio"],
                int(raw["mcc"]),
                int(raw["net"]),
                int(raw["area"]),
                int(raw["cell"]),
                int(raw["unit"]),
                lon,
                lat,
                int(raw["range"]),
                int(raw["samples"]),
                int(raw["changeable"]),
                int(raw["created"]),
                int(raw["updated"]),
                int(raw["averageSignal"]),
                aoi_id,
            ))

    print(f"CSV rows total : {total}")
    print(f"Filtered out   : {filtered_out}")
    print(f"Rows in AOI    : {len(rows)}")

    if not rows:
        print("No rows matched the AOI bounding boxes — nothing to insert.")
        return

    # ── Database ─────────────────────────────────────────────────────────────
    conn = psycopg2.connect(db_url)
    try:
        with conn:
            with conn.cursor() as cur:

                # Ensure PostGIS is available
                cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")

                # Create table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS cell_towers (
                        id          SERIAL PRIMARY KEY,
                        radio       VARCHAR(10)       NOT NULL,
                        mcc         SMALLINT          NOT NULL,
                        net         INTEGER           NOT NULL,
                        area        INTEGER           NOT NULL,
                        cell        BIGINT            NOT NULL,
                        unit        INTEGER           NOT NULL,
                        lon         DOUBLE PRECISION  NOT NULL,
                        lat         DOUBLE PRECISION  NOT NULL,
                        range_m     INTEGER,
                        samples     INTEGER,
                        changeable  SMALLINT,
                        created_at  BIGINT,
                        updated_at  BIGINT,
                        avg_signal  SMALLINT,
                        aoi_id      VARCHAR(20)       NOT NULL,
                        geom        GEOMETRY(Point, 4326)
                    );
                """)

                cur.execute("""
                    CREATE INDEX IF NOT EXISTS cell_towers_geom_idx
                        ON cell_towers USING GIST (geom);
                """)

                cur.execute("""
                    CREATE INDEX IF NOT EXISTS cell_towers_aoi_idx
                        ON cell_towers (aoi_id);
                """)

                # Wipe before reload so the script is idempotent
                cur.execute("TRUNCATE cell_towers RESTART IDENTITY;")

                execute_values(
                    cur,
                    """
                    INSERT INTO cell_towers
                        (radio, mcc, net, area, cell, unit,
                         lon, lat, range_m, samples, changeable,
                         created_at, updated_at, avg_signal, aoi_id, geom)
                    VALUES %s
                    """,
                    [
                        (
                            r[0], r[1], r[2], r[3], r[4], r[5],
                            r[6], r[7], r[8], r[9], r[10],
                            r[11], r[12], r[13], r[14],
                            f"SRID=4326;POINT({r[6]} {r[7]})",
                        )
                        for r in rows
                    ],
                    template=(
                        "(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,"
                        "ST_GeomFromEWKT(%s))"
                    ),
                )

                print(f"Inserted {len(rows)} rows into cell_towers.")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
