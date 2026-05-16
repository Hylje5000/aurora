#!/usr/bin/env python3
"""
Ingest NLS Finland ASCII Grid height data into PostGIS.

Creates a `height_data` table with sampled elevation points (WGS84) so the
client can query the nearest elevation for any map click via:
  SELECT elevation_m FROM height_data
  ORDER BY geom <-> ST_SetSRID(ST_MakePoint(<lng>, <lat>), 4326)
  LIMIT 1;

Usage:
  pip install -r scripts/requirements.txt
  python scripts/ingest_height_data.py [options]

Options:
  --region   all | turku | lappi | karjala   (default: all)
  --stride   N     sample every Nth cell; N*10 = resolution in metres (default 5 → 50 m)
  --reset          drop table and clear progress, then re-ingest everything
  --no-drop        skip table creation (append to existing table)

Progress is saved to scripts/height_data_progress.json after every file so
you can safely Ctrl-C and resume — already-ingested files are skipped.
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

import numpy as np
import psycopg2
from psycopg2.extras import execute_values
from pyproj import Transformer
from dotenv import dotenv_values
from tqdm import tqdm

REGIONS = ["turku", "lappi", "karjala"]
DATA_DIR = Path(__file__).parent.parent / "data"
PROGRESS_FILE = Path(__file__).parent / "height_data_progress.json"

BATCH_SIZE = 4000       # rows per DB INSERT batch
DEFAULT_STRIDE = 5      # sample every 5th cell = 50 m resolution

# EPSG:3067 (ETRS-TM35FIN) → EPSG:4326 (WGS84), always_xy=True means (lon, lat) output
_TRANSFORMER = Transformer.from_crs("EPSG:3067", "EPSG:4326", always_xy=True)


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def get_db_url() -> str:
    env = dotenv_values(Path(__file__).parent.parent / ".env.local")
    url = env.get("DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("ERROR: DATABASE_URL not found in .env.local or environment.")
    return url


def connect(url: str):
    conn = psycopg2.connect(url)
    conn.autocommit = False
    return conn


def create_table(conn, drop: bool = False) -> None:
    with conn.cursor() as cur:
        if drop:
            cur.execute("DROP TABLE IF EXISTS height_data CASCADE;")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS height_data (
                id          BIGSERIAL PRIMARY KEY,
                aoi_id      TEXT    NOT NULL,
                grid_file   TEXT    NOT NULL,
                geom        GEOMETRY(Point, 4326) NOT NULL,
                elevation_m REAL    NOT NULL
            );
            CREATE INDEX IF NOT EXISTS height_data_geom_idx ON height_data USING GIST(geom);
            CREATE INDEX IF NOT EXISTS height_data_aoi_idx  ON height_data(aoi_id);
        """)
    conn.commit()


# ---------------------------------------------------------------------------
# Progress tracking
# ---------------------------------------------------------------------------

def load_progress() -> dict:
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {"completed": [], "failed": []}


def save_progress(progress: dict) -> None:
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, indent=2)


# ---------------------------------------------------------------------------
# ASC grid parsing
# ---------------------------------------------------------------------------

def _count_header_rows(path: Path) -> int:
    """Count lines that are keyword-value pairs (start with a letter)."""
    count = 0
    with open(path) as f:
        for line in f:
            stripped = line.strip()
            if stripped and stripped[0].isalpha():
                count += 1
            else:
                break
    return count


def parse_header(path: Path) -> dict:
    result: dict = {}
    with open(path) as f:
        for line in f:
            stripped = line.strip()
            if not stripped or not stripped[0].isalpha():
                break
            key, val = stripped.split(None, 1)
            result[key.lower()] = val.strip()
    return result


def load_grid(path: Path, n_header: int) -> np.ndarray:
    """Load data rows as a 2-D float32 array (row-major, top→bottom)."""
    return np.loadtxt(path, skiprows=n_header, dtype=np.float32)


# ---------------------------------------------------------------------------
# File ingestion
# ---------------------------------------------------------------------------

def ingest_file(conn, asc_path: Path, aoi_id: str, stride: int) -> int:
    """
    Parse one ASC file and insert sampled elevation points.
    Deletes any existing rows for this (aoi_id, grid_file) first so that
    interrupted files are safe to re-run.
    Returns the number of rows inserted.
    """
    n_header = _count_header_rows(asc_path)
    hdr = parse_header(asc_path)

    ncols = int(hdr["ncols"])
    nrows = int(hdr["nrows"])
    xll = float(hdr["xllcorner"])
    yll = float(hdr["yllcorner"])
    cell = float(hdr["cellsize"])
    nodata = float(hdr.get("nodata_value", -9999.0))
    grid_name = asc_path.stem

    # Remove any partial data from a previous interrupted run
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM height_data WHERE aoi_id = %s AND grid_file = %s",
            (aoi_id, grid_name),
        )
    conn.commit()

    grid = load_grid(asc_path, n_header)  # shape (nrows, ncols)

    # Build sampled row/col index arrays
    rows_idx = np.arange(0, nrows, stride)
    cols_idx = np.arange(0, ncols, stride)
    row_grid, col_grid = np.meshgrid(rows_idx, cols_idx, indexing="ij")

    elevations = grid[row_grid, col_grid]

    # Mask out NODATA (typically ocean / outside measurement area)
    valid = elevations != nodata
    row_sel = row_grid[valid]
    col_sel = col_grid[valid]
    elev_sel = elevations[valid]

    if elev_sel.size == 0:
        return 0

    # Cell centres in ETRS-TM35FIN (EPSG:3067)
    x3067 = xll + (col_sel + 0.5) * cell
    y3067 = yll + (nrows - row_sel - 0.5) * cell

    # Batch-transform to WGS84 (pyproj accepts numpy arrays natively)
    lngs, lats = _TRANSFORMER.transform(x3067, y3067)

    # Insert in batches
    insert_sql = "INSERT INTO height_data (aoi_id, grid_file, geom, elevation_m) VALUES %s"
    tmpl = "(%s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s)"
    n = elev_sel.size
    total_inserted = 0

    for start in range(0, n, BATCH_SIZE):
        end = min(start + BATCH_SIZE, n)
        batch = [
            (aoi_id, grid_name, float(lngs[i]), float(lats[i]), float(elev_sel[i]))
            for i in range(start, end)
        ]
        with conn.cursor() as cur:
            execute_values(cur, insert_sql, batch, template=tmpl)
        conn.commit()
        total_inserted += len(batch)

    return total_inserted


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Ingest NLS Finland ASCII Grid height data into PostGIS",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--region", choices=["all"] + REGIONS, default="all",
        help="Region to ingest (default: all)",
    )
    parser.add_argument(
        "--stride", type=int, default=DEFAULT_STRIDE, metavar="N",
        help=f"Sample every Nth grid cell; resolution = N×10 m (default {DEFAULT_STRIDE} → 50 m)",
    )
    parser.add_argument(
        "--reset", action="store_true",
        help="Drop and recreate table, clear progress file, then ingest from scratch",
    )
    parser.add_argument(
        "--no-drop", action="store_true",
        help="Skip table creation (assume table already exists; implies --reset is ignored)",
    )
    args = parser.parse_args()

    regions = REGIONS if args.region == "all" else [args.region]

    print("Connecting to database...")
    conn = connect(get_db_url())

    if not args.no_drop:
        action = "Dropping and recreating" if args.reset else "Creating (if not exists)"
        print(f"{action} height_data table...")
        create_table(conn, drop=args.reset)
    else:
        print("Skipping table creation (--no-drop).")

    progress = load_progress()
    if args.reset:
        progress = {"completed": [], "failed": []}
        save_progress(progress)
        print("Progress file reset.")

    # Collect all .asc files for the selected regions
    all_files: list[tuple[str, Path, str]] = []
    for region in regions:
        height_dir = DATA_DIR / region / "heights"
        if not height_dir.exists():
            print(f"WARNING: heights directory not found — {height_dir}")
            continue
        for asc in sorted(height_dir.glob("*.asc")):
            key = f"{region}/{asc.name}"
            all_files.append((region, asc, key))

    completed_set = set(progress["completed"])
    todo = [(r, f, k) for r, f, k in all_files if k not in completed_set]

    total_files = len(all_files)
    done_count = len(completed_set & {k for _, _, k in all_files})
    remaining = len(todo)

    print(f"\n{'─'*55}")
    print(f"  Total files  : {total_files}")
    print(f"  Already done : {done_count}")
    print(f"  Remaining    : {remaining}")
    print(f"  Stride       : {args.stride} ({args.stride * 10} m resolution)")
    print(f"{'─'*55}\n")

    if not todo:
        print("Nothing to do — all files already ingested.")
        conn.close()
        return

    session_rows = 0
    session_files = 0
    t_start = time.time()

    file_bar = tqdm(todo, unit="file", ncols=80, desc="Overall")
    for region, asc_path, key in file_bar:
        file_bar.set_description(f"{region}/{asc_path.name}")
        try:
            count = ingest_file(conn, asc_path, region, args.stride)
            progress["completed"].append(key)
            # Remove from failed list if it was there
            if key in progress["failed"]:
                progress["failed"].remove(key)
            save_progress(progress)
            session_rows += count
            session_files += 1
            elapsed = time.time() - t_start
            rate = session_rows / elapsed if elapsed > 0 else 0
            file_bar.set_postfix(
                rows=f"{session_rows:,}",
                rate=f"{rate/1000:.1f}k/s",
                elapsed=f"{elapsed:.0f}s",
            )
        except KeyboardInterrupt:
            print("\n\nInterrupted — progress saved. Resume with the same command.")
            break
        except Exception as exc:
            tqdm.write(f"ERROR [{key}]: {exc}")
            conn.rollback()
            if key not in progress["failed"]:
                progress["failed"].append(key)
            save_progress(progress)

    conn.close()

    elapsed = time.time() - t_start
    remaining_after = len([k for _, _, k in all_files if k not in set(progress["completed"])])

    print(f"\n{'─'*55}")
    print(f"  Inserted this session : {session_rows:,} rows ({session_files} files)")
    print(f"  Time elapsed          : {elapsed:.1f} s")
    print(f"  Files remaining       : {remaining_after}")
    if progress["failed"]:
        print(f"  Failed files          : {len(progress['failed'])}")
        for f in progress["failed"]:
            print(f"    - {f}")
    print(f"  Progress file         : {PROGRESS_FILE}")
    print(f"{'─'*55}")


if __name__ == "__main__":
    main()
