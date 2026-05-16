import { NextRequest, NextResponse } from "next/server";
import type { PlannedRoute } from "@/lib/routing";

const VALID_PROFILES = new Set<string>(["driving", "walking", "cycling"]);

interface MapboxDirectionsResponse {
  code: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: GeoJSON.LineString;
    legs: Array<{
      distance: number;
      duration: number;
      steps: Array<{
        maneuver: { instruction: string };
        distance: number;
        duration: number;
      }>;
    }>;
  }>;
}

export async function POST(req: NextRequest) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Routing service unavailable" },
      {
        status: 503,
        headers: { "X-Aurora-Warning": "NEXT_PUBLIC_MAPBOX_TOKEN not set" },
      },
    );
  }

  let body: { waypoints?: unknown; profile?: unknown };
  try {
    body = (await req.json()) as { waypoints?: unknown; profile?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { waypoints, profile } = body;

  if (
    !Array.isArray(waypoints) ||
    waypoints.length < 2 ||
    waypoints.length > 25
  ) {
    return NextResponse.json(
      { error: "waypoints must be an array of 2–25 [lng, lat] pairs" },
      { status: 400 },
    );
  }

  for (const wp of waypoints) {
    if (
      !Array.isArray(wp) ||
      wp.length !== 2 ||
      typeof wp[0] !== "number" ||
      typeof wp[1] !== "number"
    ) {
      return NextResponse.json(
        { error: "Each waypoint must be a [lng, lat] number pair" },
        { status: 400 },
      );
    }
  }

  if (typeof profile !== "string" || !VALID_PROFILES.has(profile)) {
    return NextResponse.json(
      {
        error:
          "profile must be one of: driving, walking, cycling, driving-traffic",
      },
      { status: 400 },
    );
  }

  const coords = (waypoints as [number, number][])
    .map(([lng, lat]) => `${lng},${lat}`)
    .join(";");

  const url =
    `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}` +
    `?geometries=geojson&steps=true&overview=full&access_token=${token}`;

  let mapboxRes: Response;
  try {
    mapboxRes = await fetch(url);
  } catch {
    return NextResponse.json(
      { error: "Failed to reach routing service" },
      { status: 502 },
    );
  }

  if (!mapboxRes.ok) {
    return NextResponse.json(
      { error: "Routing service returned an error" },
      { status: 502 },
    );
  }

  const data = (await mapboxRes.json()) as MapboxDirectionsResponse;

  if (!data.routes || data.routes.length === 0) {
    return NextResponse.json(
      { error: "No route found between the given waypoints" },
      { status: 404 },
    );
  }

  const route = data.routes[0];
  const planned: PlannedRoute = {
    geometry: route.geometry,
    total_distance_m: route.distance,
    total_duration_s: route.duration,
    legs: route.legs.map((leg) => ({
      distance_m: leg.distance,
      duration_s: leg.duration,
      steps: leg.steps.map((step) => ({
        instruction: step.maneuver.instruction,
        distance_m: step.distance,
        duration_s: step.duration,
      })),
    })),
  };

  return NextResponse.json(planned);
}
