import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export interface ElevationResponse {
  elevation_m: number | null;
  aoi_id?: string;
  grid_file?: string;
  dist_m?: number;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const lngRaw = params.get("lng");
  const latRaw = params.get("lat");

  const lng = Number(lngRaw);
  const lat = Number(latRaw);

  if (lngRaw === null || latRaw === null || !isFinite(lng) || !isFinite(lat)) {
    return NextResponse.json(
      { error: "lng and lat query params required" },
      { status: 400 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json<ElevationResponse>({ elevation_m: null });
  }

  try {
    const result = await query<{
      elevation_m: number;
      aoi_id: string;
      grid_file: string;
      dist_m: number;
    }>(
      `
      SELECT elevation_m, aoi_id, grid_file,
             ST_Distance(
               geom::geography,
               ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
             ) AS dist_m
      FROM height_data
      ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
      LIMIT 1
      `,
      [lng, lat],
    );

    if (result.rows.length === 0) {
      return NextResponse.json<ElevationResponse>({ elevation_m: null });
    }

    const row = result.rows[0];
    return NextResponse.json<ElevationResponse>({
      elevation_m: row.elevation_m,
      aoi_id: row.aoi_id,
      grid_file: row.grid_file,
      dist_m: row.dist_m,
    });
  } catch (err) {
    console.error("[/api/elevation]", err);
    return NextResponse.json(
      { error: "Database query failed" },
      { status: 500 },
    );
  }
}
