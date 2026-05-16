import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  GeoJSONFeature,
  GeoJSONFeatureCollection,
} from "@/app/api/features/route";

const EMPTY_COLLECTION: GeoJSONFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(EMPTY_COLLECTION, {
      headers: { "X-Aurora-Warning": "DATABASE_URL not configured" },
    });
  }

  try {
    const result = await query<{
      id: number;
      nat_code: string | null;
      name_fi: string | null;
      name_sv: string | null;
      aoi_id: string;
      geojson: string;
    }>(
      `
      SELECT id, nat_code, name_fi, name_sv, aoi_id,
             ST_AsGeoJSON(geom) AS geojson
      FROM municipalities
      `,
    );

    const features: GeoJSONFeature[] = result.rows.map((row) => ({
      type: "Feature",
      geometry: JSON.parse(row.geojson),
      properties: {
        id: row.id,
        nat_code: row.nat_code,
        name_fi: row.name_fi,
        name_sv: row.name_sv,
        aoi_id: row.aoi_id,
      },
    }));

    return NextResponse.json({ type: "FeatureCollection", features });
  } catch (err) {
    console.error("[/api/municipalities]", err);
    return NextResponse.json(
      { error: "Database query failed" },
      { status: 500 },
    );
  }
}
