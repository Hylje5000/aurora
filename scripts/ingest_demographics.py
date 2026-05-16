#!/usr/bin/env python3
"""
Ingest municipality demographic data from Statistics Finland GeoJSON into PostgreSQL.

Table created:
  municipality_demographics — population and age structure per municipality (2025)

Usage:
  pip install -r scripts/requirements.txt
  python scripts/ingest_demographics.py [--no-drop]
"""

import argparse
import json
import os
import sys
from pathlib import Path

import psycopg2
from dotenv import dotenv_values
from tqdm import tqdm

DATA_FILE = Path(__file__).parent.parent / "data" / "demographic_data.json"
BATCH_SIZE = 500


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


def create_table(conn, drop: bool) -> None:
    with conn.cursor() as cur:
        if drop:
            cur.execute("DROP TABLE IF EXISTS municipality_demographics CASCADE;")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS municipality_demographics (
                nat_code        TEXT     PRIMARY KEY,
                til_vuosi       SMALLINT NOT NULL,
                population      INTEGER  NOT NULL,
                male            INTEGER  NOT NULL,
                male_pct        REAL     NOT NULL,
                female          INTEGER  NOT NULL,
                female_pct      REAL     NOT NULL,
                age_0_14        INTEGER  NOT NULL,
                age_0_14_pct    REAL     NOT NULL,
                age_15_64       INTEGER  NOT NULL,
                age_15_64_pct   REAL     NOT NULL,
                age_65plus      INTEGER  NOT NULL,
                age_65plus_pct  REAL     NOT NULL
            );
        """)
    conn.commit()
    print("Table ready.")


def ingest(conn) -> int:
    print(f"Reading {DATA_FILE}…")
    with open(DATA_FILE, encoding="utf-8") as f:
        data = json.load(f)

    rows = []
    for feature in data["features"]:
        p = feature["properties"]
        rows.append((
            str(p["kunta"]),
            int(p["til_vuosi"]),
            int(p["vaesto"]),
            int(p["miehet"]),
            float(p["miehet_p"]),
            int(p["naiset"]),
            float(p["naiset_p"]),
            int(p["ika_0_14"]),
            float(p["ika_0_14p"]),
            int(p["ika_15_64"]),
            float(p["ika_15_64p"]),
            int(p["ika_65_"]),
            float(p["ika_65_p"]),
        ))

    from psycopg2.extras import execute_values

    sql = """
        INSERT INTO municipality_demographics (
            nat_code, til_vuosi,
            population, male, male_pct, female, female_pct,
            age_0_14, age_0_14_pct, age_15_64, age_15_64_pct,
            age_65plus, age_65plus_pct
        ) VALUES %s
        ON CONFLICT (nat_code) DO UPDATE SET
            til_vuosi      = EXCLUDED.til_vuosi,
            population     = EXCLUDED.population,
            male           = EXCLUDED.male,
            male_pct       = EXCLUDED.male_pct,
            female         = EXCLUDED.female,
            female_pct     = EXCLUDED.female_pct,
            age_0_14       = EXCLUDED.age_0_14,
            age_0_14_pct   = EXCLUDED.age_0_14_pct,
            age_15_64      = EXCLUDED.age_15_64,
            age_15_64_pct  = EXCLUDED.age_15_64_pct,
            age_65plus     = EXCLUDED.age_65plus,
            age_65plus_pct = EXCLUDED.age_65plus_pct
    """

    batches = range(0, len(rows), BATCH_SIZE)
    print(f"Inserting {len(rows)} rows…")
    with conn.cursor() as cur:
        for i in tqdm(batches, unit="batch", leave=False):
            execute_values(cur, sql, rows[i : i + BATCH_SIZE])
            conn.commit()

    return len(rows)


def main():
    parser = argparse.ArgumentParser(
        description="Ingest municipality demographics into PostgreSQL"
    )
    parser.add_argument(
        "--no-drop",
        action="store_true",
        help="Skip DROP TABLE (upsert instead)",
    )
    args = parser.parse_args()

    print("Connecting to database…")
    conn = connect(get_db_url())

    print("Creating table…")
    create_table(conn, drop=not args.no_drop)

    total = ingest(conn)
    conn.close()

    print(f"\n=== Summary ===")
    print(f"  municipality_demographics  {total:>5,} rows")


if __name__ == "__main__":
    main()
