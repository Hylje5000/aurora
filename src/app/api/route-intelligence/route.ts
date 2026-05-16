import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { RouteHazard, RouteIntelligence, VehicleProfile } from "@/lib/routing";

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 } as const;

interface RoadRow {
  id: number;
  link_id: string;
  aoi_id: string;
  max_mass_kg: number | null;
  max_height_cm: number | null;
  max_bogie_mass_kg: number | null;
  max_axle_mass_kg: number | null;
  width_cm: number | null;
  pavement_type: number | null;
  has_damage: boolean;
  damage_recurring: boolean;
  condition_class: number | null;
  condition_text: string | null;
  rut_depth_mm: number | null;
  closest_pt: string;
}

interface BridgeRow {
  id: number;
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
  geojson: string;
}

function pavementLabel(type: number | null): string {
  if (type === 2) return "Gravel";
  if (type === 3) return "Dirt/Other";
  return "unpaved";
}

function classifyRoadHazards(row: RoadRow, v: VehicleProfile): RouteHazard[] {
  const hazards: RouteHazard[] = [];
  const coords = (JSON.parse(row.closest_pt) as { coordinates: [number, number] }).coordinates;

  function add(severity: RouteHazard["severity"], message: string) {
    hazards.push({
      id: `road-${row.id}-${hazards.length}`,
      type: "road",
      severity,
      message,
      coordinates: coords,
      properties: {
        link_id: row.link_id,
        aoi_id: row.aoi_id,
        condition_class: row.condition_class,
        condition_text: row.condition_text,
        pavement_type: row.pavement_type,
        rut_depth_mm: row.rut_depth_mm,
        has_damage: row.has_damage,
        damage_recurring: row.damage_recurring,
        max_mass_kg: row.max_mass_kg,
        width_cm: row.width_cm,
        max_height_cm: row.max_height_cm,
      },
    });
  }

  // Damage checks (always fire regardless of vehicle mass)
  if (row.has_damage && row.damage_recurring) {
    add("warning", "Recurring road damage");
  } else if (row.has_damage) {
    add("info", "Road damage reported");
  }

  if (row.condition_class != null && row.condition_class >= 4) {
    add("warning", `Poor road condition (class ${row.condition_class})`);
  }

  if (row.rut_depth_mm != null && row.rut_depth_mm >= 30) {
    add("warning", `Heavy rutting (${row.rut_depth_mm} mm)`);
  }

  if (row.pavement_type != null && (row.pavement_type === 2 || row.pavement_type === 3)) {
    add("info", `Unpaved surface (${pavementLabel(row.pavement_type)})`);
  }

  // Vehicle mass checks (skip when vehicle mass is 0 — infantry)
  if (v.mass_t > 0 && row.max_mass_kg != null && row.max_mass_kg > 0 && v.mass_t * 1000 > row.max_mass_kg) {
    add("critical", `Road weight limit exceeded (${row.max_mass_kg} kg) — vehicle is ${v.mass_t * 1000} kg`);
  }

  if (v.bogie_mass_t > 0 && row.max_bogie_mass_kg != null && row.max_bogie_mass_kg > 0 && v.bogie_mass_t * 1000 > row.max_bogie_mass_kg) {
    add("critical", `Road bogie limit exceeded (${row.max_bogie_mass_kg} kg) — vehicle is ${v.bogie_mass_t * 1000} kg`);
  }

  if (v.axle_mass_t > 0 && row.max_axle_mass_kg != null && row.max_axle_mass_kg > 0 && v.axle_mass_t * 1000 > row.max_axle_mass_kg) {
    add("critical", `Road axle limit exceeded (${row.max_axle_mass_kg} kg) — vehicle is ${v.axle_mass_t * 1000} kg`);
  }

  if (row.width_cm != null && row.width_cm > 0 && v.width_m * 100 > row.width_cm) {
    add("critical", `Road too narrow for vehicle (${row.width_cm} cm) — vehicle is ${Math.round(v.width_m * 100)} cm`);
  }

  if (row.max_height_cm != null && row.max_height_cm > 0 && v.height_m * 100 > row.max_height_cm) {
    add("critical", `Height restriction on road (${row.max_height_cm} cm) — vehicle is ${Math.round(v.height_m * 100)} cm`);
  }

  return hazards;
}

function classifyBridgeHazards(row: BridgeRow, v: VehicleProfile): RouteHazard[] {
  const hazards: RouteHazard[] = [];
  const geom = JSON.parse(row.geojson) as { coordinates: [number, number] };
  const coords = geom.coordinates;

  function add(severity: RouteHazard["severity"], message: string) {
    hazards.push({
      id: `bridge-${row.id}-${hazards.length}`,
      type: "bridge",
      severity,
      message,
      coordinates: coords,
      properties: {
        name: row.name,
        code: row.code,
        status: row.status,
        aoi_id: row.aoi_id,
        type_name: row.type_name,
        max_vehicle_mass_t: row.max_vehicle_mass_t,
        max_bogie_mass_t: row.max_bogie_mass_t,
        max_combination_mass_t: row.max_combination_mass_t,
        max_axle_mass_t: row.max_axle_mass_t,
        height_restriction_m: row.height_restriction_m,
      },
    });
  }

  if (row.status != null && row.status.trim() !== "" && !/^ok$/i.test(row.status.trim())) {
    add("warning", `Bridge condition: ${row.status}`);
  }

  if (v.mass_t > 0 && row.max_vehicle_mass_t != null && row.max_vehicle_mass_t > 0 && v.mass_t > row.max_vehicle_mass_t) {
    add("critical", `Bridge vehicle limit exceeded (${row.max_vehicle_mass_t} t) — vehicle is ${v.mass_t} t`);
  }

  if (v.bogie_mass_t > 0 && row.max_bogie_mass_t != null && row.max_bogie_mass_t > 0 && v.bogie_mass_t > row.max_bogie_mass_t) {
    add("critical", `Bridge bogie limit exceeded (${row.max_bogie_mass_t} t) — vehicle is ${v.bogie_mass_t} t`);
  }

  if (v.axle_mass_t > 0 && row.max_axle_mass_t != null && row.max_axle_mass_t > 0 && v.axle_mass_t > row.max_axle_mass_t) {
    add("critical", `Bridge axle limit exceeded (${row.max_axle_mass_t} t) — vehicle is ${v.axle_mass_t} t`);
  }

  if (row.height_restriction_m != null && row.height_restriction_m > 0 && v.height_m > row.height_restriction_m) {
    add("critical", `Height restriction (${row.height_restriction_m} m) — vehicle is ${v.height_m} m`);
  }

  return hazards;
}

function isValidLineString(geom: unknown): geom is { type: "LineString"; coordinates: [number, number][] } {
  if (!geom || typeof geom !== "object") return false;
  const g = geom as Record<string, unknown>;
  return (
    g.type === "LineString" &&
    Array.isArray(g.coordinates) &&
    (g.coordinates as unknown[]).length >= 2
  );
}

function isValidVehicle(v: unknown): v is VehicleProfile {
  if (!v || typeof v !== "object") return false;
  const veh = v as Record<string, unknown>;
  return (
    typeof veh.label === "string" &&
    typeof veh.mass_t === "number" && veh.mass_t >= 0 &&
    typeof veh.axle_mass_t === "number" && veh.axle_mass_t >= 0 &&
    typeof veh.bogie_mass_t === "number" && veh.bogie_mass_t >= 0 &&
    typeof veh.height_m === "number" && veh.height_m > 0 &&
    typeof veh.width_m === "number" && veh.width_m > 0
  );
}

const EMPTY_INTELLIGENCE: RouteIntelligence = {
  hazards: [],
  summary: { critical: 0, warning: 0, info: 0, passable: true },
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { routeGeometry, vehicle } = (body ?? {}) as Record<string, unknown>;

  if (!isValidLineString(routeGeometry)) {
    return NextResponse.json(
      { error: "routeGeometry must be a GeoJSON LineString with at least 2 coordinates" },
      { status: 400 },
    );
  }

  if (!isValidVehicle(vehicle)) {
    return NextResponse.json(
      { error: "vehicle must include label, mass_t, axle_mass_t, bogie_mass_t, height_m (>0), width_m (>0)" },
      { status: 400 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(EMPTY_INTELLIGENCE, {
      headers: { "X-Aurora-Warning": "DATABASE_URL not configured" },
      status: 503,
    });
  }

  const routeGeoJSON = JSON.stringify(routeGeometry);

  try {
    // Distance constants in degrees (at ~60°N, 1 deg lon ≈ 55.7 km, 1 deg lat ≈ 111.3 km).
    // We use the more restrictive longitude conversion and add a margin so the geometry
    // DWithin hits the GiST index instead of the expensive geography cast.
    // Roads: 20 m target → 0.0004 deg;  Bridges: 50 m target → 0.0010 deg.
    const [roadsResult, bridgesResult] = await Promise.all([
      query<RoadRow>(
        `
        SELECT DISTINCT ON (link_id)
          id, link_id, aoi_id,
          max_mass_kg, max_height_cm, max_bogie_mass_kg, max_axle_mass_kg,
          width_cm, pavement_type, has_damage, damage_recurring,
          condition_class, condition_text, rut_depth_mm,
          ST_AsGeoJSON(ST_Centroid(geom)) AS closest_pt
        FROM roads, ST_GeomFromGeoJSON($1) AS route_geom
        WHERE ST_DWithin(geom, route_geom, 0.0004)
        ORDER BY link_id
        LIMIT 500
        `,
        [routeGeoJSON],
      ),
      query<BridgeRow>(
        `
        SELECT
          id, name, code, status, aoi_id,
          max_vehicle_mass_t, max_bogie_mass_t, max_combination_mass_t,
          max_axle_mass_t, height_restriction_m, type_name,
          ST_AsGeoJSON(geom) AS geojson
        FROM bridges, ST_GeomFromGeoJSON($1) AS route_geom
        WHERE ST_DWithin(geom, route_geom, 0.0010)
        `,
        [routeGeoJSON],
      ),
    ]);

    const hazards: RouteHazard[] = [];

    for (const row of roadsResult.rows) {
      hazards.push(...classifyRoadHazards(row, vehicle));
    }
    for (const row of bridgesResult.rows) {
      hazards.push(...classifyBridgeHazards(row, vehicle));
    }

    hazards.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

    const critical = hazards.filter((h) => h.severity === "critical").length;
    const warning = hazards.filter((h) => h.severity === "warning").length;
    const info = hazards.filter((h) => h.severity === "info").length;

    const intelligence: RouteIntelligence = {
      hazards,
      summary: { critical, warning, info, passable: critical === 0 },
    };

    return NextResponse.json(intelligence);
  } catch (err) {
    console.error("[/api/route-intelligence]", err);
    return NextResponse.json({ error: "Database query failed" }, { status: 500 });
  }
}
