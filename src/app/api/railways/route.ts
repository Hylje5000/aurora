import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  parseBbox,
  GeoJSONFeature,
  GeoJSONFeatureCollection,
} from "@/app/api/features/route";

const EMPTY_COLLECTION: GeoJSONFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export async function GET(req: NextRequest) {
  const bbox = parseBbox(req.nextUrl.searchParams.get("bbox"));

  if (!bbox) {
    return NextResponse.json(
      { error: "bbox query param required: minLng,minLat,maxLng,maxLat" },
      { status: 400 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(EMPTY_COLLECTION, {
      headers: { "X-Aurora-Warning": "DATABASE_URL not configured" },
    });
  }

  const [minLng, minLat, maxLng, maxLat] = bbox;

  try {
    const result = await query<{
      id: number;
      track_src_id: number | null;
      oid: string | null;
      name: string | null;
      description: string | null;
      track_type: string | null;
      state: string | null;
      aoi_id: string;
      route_name: string | null;
      length_m: number | null;
      start_km: number | null;
      end_km: number | null;
      maintenance_district: string | null;
      operating_centre: string | null;
      geojson: string;
    }>(
      `
      SELECT
        id, track_src_id, oid, name, description, track_type, state, aoi_id,
        route_name, length_m, start_km, end_km, maintenance_district, operating_centre,
        ST_AsGeoJSON(geom) AS geojson
      FROM railways
      WHERE ST_Intersects(
        geom,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)
      )
      `,
      [minLng, minLat, maxLng, maxLat],
    );

    const features: GeoJSONFeature[] = result.rows.map((row) => ({
      type: "Feature",
      geometry: JSON.parse(row.geojson),
      properties: {
        id: row.id,
        track_src_id: row.track_src_id,
        oid: row.oid,
        name: row.name,
        description: row.description,
        track_type: row.track_type,
        state: row.state,
        aoi_id: row.aoi_id,
        route_name: row.route_name,
        length_m: row.length_m,
        start_km: row.start_km,
        end_km: row.end_km,
        maintenance_district: row.maintenance_district,
        operating_centre: row.operating_centre,
      },
    }));

    return NextResponse.json({ type: "FeatureCollection", features });
  } catch (err) {
    console.error("[/api/railways]", err);
    return NextResponse.json(
      { error: "Database query failed" },
      { status: 500 },
    );
  }
}
