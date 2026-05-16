import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { parseBbox } from "@/app/api/features/route";
import type { DrawingTool } from "@/lib/customLayers";
import { DEFAULT_LAYER_COLOUR } from "@/lib/customLayers";

const VALID_TYPES = new Set<DrawingTool>([
  "Point",
  "LineString",
  "Polygon",
  "Rectangle",
]);

function featureFromRow(row: {
  id: string;
  layer_id: string;
  name: string | null;
  description: string | null;
  feature_type: string;
  geojson: string;
  color: string;
  properties: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}) {
  return {
    type: "Feature" as const,
    id: row.id,
    geometry: JSON.parse(row.geojson),
    properties: {
      id: row.id,
      layer_id: row.layer_id,
      name: row.name,
      description: row.description,
      feature_type: row.feature_type,
      color: row.color,
      properties: row.properties,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { type: "FeatureCollection", features: [] },
      { headers: { "X-Aurora-Warning": "DATABASE_URL not configured" } },
    );
  }

  const { id } = await params;
  const bbox = parseBbox(req.nextUrl.searchParams.get("bbox"));

  if (!bbox) {
    return NextResponse.json(
      { error: "bbox query param required: minLng,minLat,maxLng,maxLat" },
      { status: 400 },
    );
  }

  const [minLng, minLat, maxLng, maxLat] = bbox;

  try {
    const result = await query<{
      id: string;
      layer_id: string;
      name: string | null;
      description: string | null;
      feature_type: string;
      geojson: string;
      color: string;
      properties: Record<string, unknown>;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT
         id, layer_id, name, description, feature_type,
         ST_AsGeoJSON(geom) AS geojson,
         color, properties, created_at, updated_at
       FROM custom_features
       WHERE layer_id = $1
         AND ST_Intersects(geom, ST_MakeEnvelope($2, $3, $4, $5, 4326))
       LIMIT 5000`,
      [id, minLng, minLat, maxLng, maxLat],
    );

    return NextResponse.json({
      type: "FeatureCollection",
      features: result.rows.map(featureFromRow),
    });
  } catch (err) {
    console.error("[/api/custom-layers/[id]/features GET]", err);
    return NextResponse.json(
      { error: "Database query failed" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL not configured" },
      { status: 503 },
    );
  }

  const { id } = await params;

  let body: {
    name?: string;
    description?: string;
    feature_type?: string;
    geometry?: unknown;
    color?: string;
    properties?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const featureType = body.feature_type as DrawingTool | undefined;
  if (!featureType || !VALID_TYPES.has(featureType)) {
    return NextResponse.json(
      {
        error:
          "feature_type must be one of: Point, LineString, Polygon, Rectangle",
      },
      { status: 400 },
    );
  }

  if (!body.geometry || typeof body.geometry !== "object") {
    return NextResponse.json(
      { error: "geometry (GeoJSON) is required" },
      { status: 400 },
    );
  }

  const color =
    typeof body.color === "string" && body.color.trim()
      ? body.color.trim()
      : DEFAULT_LAYER_COLOUR;

  try {
    const result = await query<{
      id: string;
      layer_id: string;
      name: string | null;
      description: string | null;
      feature_type: string;
      geojson: string;
      color: string;
      properties: Record<string, unknown>;
      created_at: string;
      updated_at: string;
    }>(
      `INSERT INTO custom_features
         (layer_id, name, description, feature_type, geom, color, properties)
       VALUES
         ($1, $2, $3, $4, ST_GeomFromGeoJSON($5), $6, $7)
       RETURNING
         id, layer_id, name, description, feature_type,
         ST_AsGeoJSON(geom) AS geojson,
         color, properties, created_at, updated_at`,
      [
        id,
        body.name ?? null,
        body.description ?? null,
        featureType,
        JSON.stringify(body.geometry),
        color,
        JSON.stringify(body.properties ?? {}),
      ],
    );

    return NextResponse.json(featureFromRow(result.rows[0]), { status: 201 });
  } catch (err) {
    console.error("[/api/custom-layers/[id]/features POST]", err);
    return NextResponse.json(
      { error: "Database query failed" },
      { status: 500 },
    );
  }
}
