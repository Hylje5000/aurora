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
      radio: string;
      aoi_id: string;
      range_m: number | null;
      samples: number | null;
      avg_signal: number | null;
      geojson: string;
    }>(
      `
      SELECT
        id,
        radio,
        aoi_id,
        range_m,
        samples,
        avg_signal,
        ST_AsGeoJSON(geom) AS geojson
      FROM cell_towers
      WHERE ST_Intersects(
        geom,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)
      )
      LIMIT 2000
      `,
      [minLng, minLat, maxLng, maxLat],
    );

    const features: GeoJSONFeature[] = result.rows.map((row) => ({
      type: "Feature",
      geometry: JSON.parse(row.geojson),
      properties: {
        id: row.id,
        radio: row.radio,
        aoi_id: row.aoi_id,
        range_m: row.range_m,
        samples: row.samples,
        avg_signal: row.avg_signal,
      },
    }));

    return NextResponse.json({ type: "FeatureCollection", features });
  } catch (err) {
    console.error("[/api/cell-towers]", err);
    return NextResponse.json(
      { error: "Database query failed" },
      { status: 500 },
    );
  }
}
