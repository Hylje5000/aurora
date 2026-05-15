import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export interface GeoJSONFeature {
  type: "Feature";
  geometry: unknown;
  properties: Record<string, unknown>;
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

const EMPTY_COLLECTION: GeoJSONFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function parseBbox(
  raw: string | null,
): [number, number, number, number] | null {
  if (!raw) return null;
  const parts = raw.split(",").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return null;
  const [minLng, minLat, maxLng, maxLat] = parts;
  if (minLng >= maxLng || minLat >= maxLat) return null;
  return [minLng, minLat, maxLng, maxLat];
}

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
    // Query all POI tables that intersect the viewport.
    // Replace this stub with real table/column names as data is ingested.
    const result = await query<{ id: number; geojson: string; props: string }>(
      `
      SELECT
        id,
        ST_AsGeoJSON(geom)           AS geojson,
        row_to_json(t)::text         AS props
      FROM (SELECT * FROM poi LIMIT 1) t
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
      properties: JSON.parse(row.props),
    }));

    return NextResponse.json({ type: "FeatureCollection", features });
  } catch (err) {
    console.error("[/api/features]", err);
    return NextResponse.json(
      { error: "Database query failed" },
      { status: 500 },
    );
  }
}
