#!/usr/bin/env python3
"""
Ingest historical FMI weather CSV data into PostgreSQL.

Table created:
  weather_observations — daily temperature and precipitation readings per region

Usage:
  pip install -r scripts/requirements.txt
  python scripts/ingest_weather.py [--no-drop]
"""

import argparse
import csv
import os
import sys
from pathlib import Path

import psycopg2
from dotenv import dotenv_values
from tqdm import tqdm

REGIONS = ["turku", "karjala", "lappi"]
DATA_DIR = Path(__file__).parent.parent / "data" / "weather"
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


def create_tables(conn, drop: bool) -> None:
    with conn.cursor() as cur:
        if drop:
            cur.execute("DROP TABLE IF EXISTS weather_observations CASCADE;")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS weather_observations (
                id         SERIAL PRIMARY KEY,
                region_id  TEXT     NOT NULL,
                year       SMALLINT NOT NULL,
                month      SMALLINT NOT NULL,
                day        SMALLINT NOT NULL,
                precip_mm  REAL,
                mean_temp  REAL     NOT NULL,
                max_temp   REAL     NOT NULL,
                min_temp   REAL     NOT NULL
            );
            CREATE INDEX IF NOT EXISTS weather_region_month_day
                ON weather_observations (region_id, month, day);
        """)
    conn.commit()
    print("Table ready.")


def _parse_float(s: str):
    """Return float or None for missing-value markers ('-', '-1' for precip handled separately)."""
    v = s.strip()
    if v == "-":
        return None
    return float(v)


def parse_csv(path: Path, region_id: str) -> list:
    rows = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        next(reader)  # skip header
        for line in reader:
            if len(line) < 9:
                continue
            # Columns: station(skip), year, month, day, time(skip),
            #          precip_mm, mean_temp, max_temp, min_temp
            year  = int(line[1])
            month = int(line[2])
            day   = int(line[3])

            raw_precip = line[5].strip()
            mean_temp  = _parse_float(line[6])
            max_temp   = _parse_float(line[7])
            min_temp   = _parse_float(line[8])

            # Skip rows where any temperature is missing (NOT NULL columns)
            if mean_temp is None or max_temp is None or min_temp is None:
                continue

            # '-1' or '-' in precipitation means no rain → store as NULL
            precip_mm = None if raw_precip in ("-1", "-") else float(raw_precip)

            rows.append((region_id, year, month, day, precip_mm, mean_temp, max_temp, min_temp))
    return rows


def ingest_region(conn, region: str) -> int:
    path = DATA_DIR / f"{region}_weather.csv"
    if not path.exists():
        print(f"  [{region}] File not found: {path}")
        return 0

    print(f"  [{region}] Parsing {path.name}…")
    rows = parse_csv(path, region)

    with conn.cursor() as cur:
        cur.execute("DELETE FROM weather_observations WHERE region_id = %s", (region,))
    conn.commit()

    from psycopg2.extras import execute_values

    sql = """
        INSERT INTO weather_observations
            (region_id, year, month, day, precip_mm, mean_temp, max_temp, min_temp)
        VALUES %s
    """
    batches = range(0, len(rows), BATCH_SIZE)
    print(f"  [{region}] Inserting {len(rows)} rows…")
    with conn.cursor() as cur:
        for i in tqdm(batches, unit="batch", leave=False):
            execute_values(cur, sql, rows[i : i + BATCH_SIZE])
            conn.commit()

    return len(rows)


def main():
    parser = argparse.ArgumentParser(description="Ingest FMI weather CSV data into PostgreSQL")
    parser.add_argument(
        "--no-drop",
        action="store_true",
        help="Skip DROP TABLE (append/replace per-region instead)",
    )
    args = parser.parse_args()

    print("Connecting to database…")
    conn = connect(get_db_url())

    print("Creating table…")
    create_tables(conn, drop=not args.no_drop)

    total = 0
    for region in REGIONS:
        print(f"\n=== Region: {region} ===")
        total += ingest_region(conn, region)

    conn.close()

    print(f"\n=== Summary ===")
    print(f"  weather_observations  {total:>7,} rows")


if __name__ == "__main__":
    main()
