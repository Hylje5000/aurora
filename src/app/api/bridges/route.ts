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
      bridge_src_id: number | null;
      oid: string | null;
      name: string | null;
      code: string | null;
      status: string | null;
      aoi_id: string;
      max_vehicle_mass_t: number | null;
      max_bogie_mass_t: number | null;
      max_combination_mass_t: number | null;
      max_axle_mass_t: number | null;
      height_restriction_m: number | null;
      type_name: string | null;
      owner: string | null;
      municipalities: string | null;
      road_address: string | null;
      network_type: string | null;
      updated_date: string | null;
      geojson: string;
    }>(
      `
      SELECT
        id, bridge_src_id, oid, name, code, status, aoi_id,
        max_vehicle_mass_t, max_bogie_mass_t, max_combination_mass_t, max_axle_mass_t,
        height_restriction_m, type_name, owner, municipalities, road_address,
        network_type, updated_date::text,
        ST_AsGeoJSON(geom) AS geojson
      FROM bridges
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
        bridge_src_id: row.bridge_src_id,
        oid: row.oid,
        name: row.name,
        code: row.code,
        status: row.status,
        aoi_id: row.aoi_id,
        max_vehicle_mass_t: row.max_vehicle_mass_t,
        max_bogie_mass_t: row.max_bogie_mass_t,
        max_combination_mass_t: row.max_combination_mass_t,
        max_axle_mass_t: row.max_axle_mass_t,
        height_restriction_m: row.height_restriction_m,
        type_name: row.type_name,
        owner: row.owner,
        municipalities: row.municipalities,
        road_address: row.road_address,
        network_type: row.network_type,
        updated_date: row.updated_date,
      },
    }));

    return NextResponse.json({ type: "FeatureCollection", features });
  } catch (err) {
    console.error("[/api/bridges]", err);
    return NextResponse.json(
      { error: "Database query failed" },
      { status: 500 },
    );
  }
}
