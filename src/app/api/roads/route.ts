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
      link_id: string;
      aoi_id: string;
      admin_class: number | null;
      functional_class: number | null;
      has_structure: number | null;
      max_mass_kg: number | null;
      max_height_cm: number | null;
      max_bogie_mass_kg: number | null;
      max_axle_mass_kg: number | null;
      width_cm: number | null;
      lane_count: number | null;
      pavement_type: number | null;
      has_damage: boolean;
      damage_recurring: boolean;
      condition_class: number | null;
      condition_text: string | null;
      rut_depth_mm: number | null;
      ride_quality: number | null;
      geojson: string;
    }>(
      `
      SELECT
        id, link_id, aoi_id,
        admin_class, functional_class, has_structure,
        max_mass_kg, max_height_cm, max_bogie_mass_kg, max_axle_mass_kg,
        width_cm, lane_count, pavement_type,
        has_damage, damage_recurring,
        condition_class, condition_text, rut_depth_mm, ride_quality,
        ST_AsGeoJSON(geom) AS geojson
      FROM roads
      WHERE ST_Intersects(
        geom,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)
      )
      LIMIT 5000
      `,
      [minLng, minLat, maxLng, maxLat],
    );

    const features: GeoJSONFeature[] = result.rows.map((row) => ({
      type: "Feature",
      geometry: JSON.parse(row.geojson),
      properties: {
        id: row.id,
        link_id: row.link_id,
        aoi_id: row.aoi_id,
        admin_class: row.admin_class,
        functional_class: row.functional_class,
        has_structure: row.has_structure,
        max_mass_kg: row.max_mass_kg,
        max_height_cm: row.max_height_cm,
        max_bogie_mass_kg: row.max_bogie_mass_kg,
        max_axle_mass_kg: row.max_axle_mass_kg,
        width_cm: row.width_cm,
        lane_count: row.lane_count,
        pavement_type: row.pavement_type,
        has_damage: row.has_damage,
        damage_recurring: row.damage_recurring,
        condition_class: row.condition_class,
        condition_text: row.condition_text,
        rut_depth_mm: row.rut_depth_mm,
        ride_quality: row.ride_quality,
      },
    }));

    return NextResponse.json({ type: "FeatureCollection", features });
  } catch (err) {
    console.error("[/api/roads]", err);
    return NextResponse.json(
      { error: "Database query failed" },
      { status: 500 },
    );
  }
}
