import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

const VALID_REGIONS = new Set(["turku", "karjala", "lappi"]);

export interface WeatherStats {
  region: string;
  month: number;
  day: number;
  avgTemp: number;
  minTemp: number;
  maxTemp: number;
  tempSpread: number;
  rainProbability: number;
  avgRainMm: number;
  sampleSize: number;
}

function zeroedStats(region: string, month: number, day: number): WeatherStats {
  return {
    region,
    month,
    day,
    avgTemp: 0,
    minTemp: 0,
    maxTemp: 0,
    tempSpread: 0,
    rainProbability: 0,
    avgRainMm: 0,
    sampleSize: 0,
  };
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const regionParam = params.get("region") ?? "";
  const monthParam = params.get("month") ?? "";
  const dayParam = params.get("day") ?? "";

  if (!VALID_REGIONS.has(regionParam)) {
    return NextResponse.json(
      { error: "region must be one of: turku, karjala, lappi" },
      { status: 400 },
    );
  }

  const month = parseInt(monthParam, 10);
  const day = parseInt(dayParam, 10);

  if (isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "month must be an integer between 1 and 12" },
      { status: 400 },
    );
  }

  if (isNaN(day) || day < 1 || day > 31) {
    return NextResponse.json(
      { error: "day must be an integer between 1 and 31" },
      { status: 400 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(zeroedStats(regionParam, month, day), {
      headers: { "X-Aurora-Warning": "DATABASE_URL not configured" },
    });
  }

  try {
    const result = await query<{
      sample_size: string;
      avg_temp: string | null;
      min_temp: string | null;
      max_temp: string | null;
      temp_spread: string | null;
      rain_probability: string | null;
      avg_rain_mm: string | null;
    }>(
      `SELECT
         COUNT(*)                                         AS sample_size,
         AVG(mean_temp)                                   AS avg_temp,
         AVG(min_temp)                                    AS min_temp,
         AVG(max_temp)                                    AS max_temp,
         AVG((max_temp - min_temp) / 2.0)                AS temp_spread,
         100.0 * COUNT(precip_mm) / COUNT(*)             AS rain_probability,
         COALESCE(AVG(precip_mm), 0)                     AS avg_rain_mm
       FROM weather_observations
       WHERE region_id = $1
         AND month     = $2
         AND day       = $3`,
      [regionParam, month, day],
    );

    const row = result.rows[0];
    const sampleSize = parseInt(row.sample_size, 10);

    if (sampleSize === 0) {
      return NextResponse.json(zeroedStats(regionParam, month, day));
    }

    const stats: WeatherStats = {
      region: regionParam,
      month,
      day,
      avgTemp: parseFloat(row.avg_temp ?? "0"),
      minTemp: parseFloat(row.min_temp ?? "0"),
      maxTemp: parseFloat(row.max_temp ?? "0"),
      tempSpread: parseFloat(row.temp_spread ?? "0"),
      rainProbability: parseFloat(row.rain_probability ?? "0"),
      avgRainMm: parseFloat(row.avg_rain_mm ?? "0"),
      sampleSize,
    };

    return NextResponse.json(stats);
  } catch (err) {
    console.error("[/api/weather]", err);
    return NextResponse.json(zeroedStats(regionParam, month, day), {
      headers: { "X-Aurora-Warning": "Database query failed" },
    });
  }
}
