#!/usr/bin/env python3
"""
Ingest 2023 Finnish parliamentary election data from CSV into PostgreSQL.

Tables created:
  municipality_elections         — per-party vote shares (nat_code, party, vote_share)
  municipality_election_summary  — JSONB snapshot per municipality for fast API joins

Usage:
  pip install -r scripts/requirements.txt
  python scripts/ingest_elections.py [--no-drop]
"""

import argparse
import csv
import io
import os
import re
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values
from dotenv import dotenv_values
from tqdm import tqdm

DATA_FILE = Path(__file__).parent.parent / "data" / "election_data.csv"
BATCH_SIZE = 500

# Parties to exclude regardless of year-suffix filter.
# "Puolueiden äänet yhteensä" contains replacement chars (U+FFFD) in the source file
# so match by prefix rather than exact string.
EXCLUDE_PARTY_PREFIXES = ("Puolueiden",)
EXCLUDE_PARTIES_EXACT = {"Muut"}

# Regex: current municipality column (KU + digits + space + name, no trailing " -YY")
CURRENT_MUNI_RE = re.compile(r"KU(\d+) [^-]+$")
# Regex: historical party name contains "(YYYY)"
HIST_PARTY_RE = re.compile(r"\(\d{4}\)")


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
            cur.execute("DROP TABLE IF EXISTS municipality_elections CASCADE;")
            cur.execute(
                "DROP TABLE IF EXISTS municipality_election_summary CASCADE;"
            )

        cur.execute("""
            CREATE TABLE IF NOT EXISTS municipality_elections (
                nat_code   TEXT  NOT NULL,
                party      TEXT  NOT NULL,
                vote_share REAL  NOT NULL,
                PRIMARY KEY (nat_code, party)
            );
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS municipality_elections_nat_code_idx
            ON municipality_elections (nat_code);
        """)
    conn.commit()
    print("Tables ready.")


def ingest(conn) -> int:
    print(f"Reading {DATA_FILE} …")
    with open(DATA_FILE, encoding="utf-8") as f:
        content = f.read().replace("\r\n", "\n").replace("\r", "\n")

    reader = csv.reader(io.StringIO(content))
    all_rows = list(reader)
    header = all_rows[0]

    # Build index of current municipality columns: col_index → nat_code (zero-padded 3 digits)
    muni_cols: list[tuple[int, str]] = []
    for i, col in enumerate(header):
        m = CURRENT_MUNI_RE.search(col)
        if m:
            nat_code = str(int(m.group(1))).zfill(3)
            muni_cols.append((i, nat_code))

    print(f"  Current municipality columns: {len(muni_cols)}")

    rows: list[tuple[str, str, float]] = []
    parties_seen: set[str] = set()

    for row in all_rows[1:]:
        party = row[2]
        if party in EXCLUDE_PARTIES_EXACT:
            continue
        if any(party.startswith(p) for p in EXCLUDE_PARTY_PREFIXES):
            continue
        if HIST_PARTY_RE.search(party):
            continue

        parties_seen.add(party)
        for col_idx, nat_code in muni_cols:
            val = row[col_idx] if col_idx < len(row) else "."
            if val == ".":
                continue
            try:
                rows.append((nat_code, party, float(val)))
            except ValueError:
                pass

    print(f"  Parties ingested: {len(parties_seen)}")
    print(f"  Total (nat_code, party) rows: {len(rows)}")

    with conn.cursor() as cur:
        for i in tqdm(range(0, len(rows), BATCH_SIZE), unit="batch", leave=False):
            execute_values(
                cur,
                """
                INSERT INTO municipality_elections (nat_code, party, vote_share)
                VALUES %s
                ON CONFLICT (nat_code, party) DO UPDATE
                    SET vote_share = EXCLUDED.vote_share
                """,
                rows[i : i + BATCH_SIZE],
            )
            conn.commit()

    return len(rows)


def rebuild_summary(conn) -> int:
    print("Rebuilding municipality_election_summary …")
    with conn.cursor() as cur:
        cur.execute("DROP TABLE IF EXISTS municipality_election_summary CASCADE;")
        cur.execute("""
            CREATE TABLE municipality_election_summary AS
            SELECT nat_code,
                   json_object_agg(party, vote_share) AS parties
            FROM municipality_elections
            GROUP BY nat_code;
        """)
        cur.execute(
            "ALTER TABLE municipality_election_summary ADD PRIMARY KEY (nat_code);"
        )
        cur.execute("SELECT COUNT(*) FROM municipality_election_summary;")
        count = cur.fetchone()[0]
    conn.commit()
    return count


def main():
    parser = argparse.ArgumentParser(
        description="Ingest 2023 election data into PostgreSQL"
    )
    parser.add_argument(
        "--no-drop",
        action="store_true",
        help="Skip DROP TABLE (upsert instead)",
    )
    args = parser.parse_args()

    print("Connecting to database …")
    conn = connect(get_db_url())

    print("Creating tables …")
    create_tables(conn, drop=not args.no_drop)

    total = ingest(conn)
    summary_count = rebuild_summary(conn)
    conn.close()

    print(f"\n=== Summary ===")
    print(f"  municipality_elections         {total:>6,} rows")
    print(f"  municipality_election_summary  {summary_count:>6,} rows")


if __name__ == "__main__":
    main()
