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
      til_vuosi: number | null;
      population: number | null;
      male: number | null;
      male_pct: number | null;
      female: number | null;
      female_pct: number | null;
      age_0_14: number | null;
      age_0_14_pct: number | null;
      age_15_64: number | null;
      age_15_64_pct: number | null;
      age_65plus: number | null;
      age_65plus_pct: number | null;
      election_data: string | null;
    }>(
      `
      SELECT
        m.id, m.nat_code, m.name_fi, m.name_sv, m.aoi_id,
        ST_AsGeoJSON(m.geom) AS geojson,
        d.til_vuosi,
        d.population,
        d.male,          d.male_pct,
        d.female,        d.female_pct,
        d.age_0_14,      d.age_0_14_pct,
        d.age_15_64,     d.age_15_64_pct,
        d.age_65plus,    d.age_65plus_pct,
        e.parties::text  AS election_data
      FROM municipalities m
      LEFT JOIN municipality_demographics d ON d.nat_code = m.nat_code
      LEFT JOIN municipality_election_summary e ON e.nat_code = m.nat_code
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
        til_vuosi: row.til_vuosi,
        population: row.population,
        male: row.male,
        male_pct: row.male_pct,
        female: row.female,
        female_pct: row.female_pct,
        age_0_14: row.age_0_14,
        age_0_14_pct: row.age_0_14_pct,
        age_15_64: row.age_15_64,
        age_15_64_pct: row.age_15_64_pct,
        age_65plus: row.age_65plus,
        age_65plus_pct: row.age_65plus_pct,
        election_data: row.election_data ?? null,
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
