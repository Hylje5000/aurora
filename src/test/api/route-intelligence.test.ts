import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/route-intelligence/route";
import { NextRequest } from "next/server";
import { query } from "@/lib/db";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));

const mockQuery = vi.mocked(query);

const ROUTE_GEOMETRY = {
  type: "LineString",
  coordinates: [
    [24.94, 60.17],
    [25.01, 60.23],
  ],
};

const INFANTRY = {
  label: "Infantry",
  mass_t: 0,
  axle_mass_t: 0,
  bogie_mass_t: 0,
  height_m: 2.0,
  width_m: 0.8,
};
const MBT = {
  label: "MBT (tank)",
  mass_t: 60,
  axle_mass_t: 0,
  bogie_mass_t: 15,
  height_m: 2.9,
  width_m: 3.6,
};
const WHEELED = {
  label: "Wheeled APC",
  mass_t: 18,
  axle_mass_t: 9,
  bogie_mass_t: 0,
  height_m: 2.7,
  width_m: 2.7,
};

const CLOSEST_PT = JSON.stringify({
  type: "Point",
  coordinates: [24.94, 60.17],
});
const BRIDGE_GEOJSON = JSON.stringify({
  type: "Point",
  coordinates: [24.95, 60.18],
});

const EMPTY_ROAD_ROW = {
  id: 1,
  link_id: "road-1",
  aoi_id: "turku",
  max_mass_kg: null,
  max_height_cm: null,
  max_bogie_mass_kg: null,
  max_axle_mass_kg: null,
  width_cm: null,
  pavement_type: null,
  has_damage: false,
  damage_recurring: false,
  condition_class: null,
  condition_text: null,
  rut_depth_mm: null,
  closest_pt: CLOSEST_PT,
};

const EMPTY_BRIDGE_ROW = {
  id: 10,
  name: "Test Bridge",
  code: "B-001",
  status: null,
  aoi_id: "turku",
  max_vehicle_mass_t: null,
  max_bogie_mass_t: null,
  max_combination_mass_t: null,
  max_axle_mass_t: null,
  height_restriction_m: null,
  type_name: "Beam bridge",
  geojson: BRIDGE_GEOJSON,
};

// Minimal coverage row — full coverage, no gaps
const FULL_COVERAGE_ROW = {
  gap_geojson: null,
  route_length_m: 9000,
  covered_length_m: 9000,
  uncovered_length_m: 0,
  gap_count: 0,
  longest_gap_m: 0,
};

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/route-intelligence", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

// mockResolvedValue (no Once) applies to all subsequent calls — handy for tests
// that only care about hazard logic, not coverage.
function emptyDb() {
  mockQuery.mockResolvedValue({ rows: [] } as never);
}

// Stubs roads + bridges + coverage in order.
function stubDb(roads: object[], bridges: object[], coverage: object[] = []) {
  mockQuery
    .mockResolvedValueOnce({ rows: roads } as never)
    .mockResolvedValueOnce({ rows: bridges } as never)
    .mockResolvedValueOnce({ rows: coverage } as never);
}

describe("POST /api/route-intelligence", () => {
  const origDb = process.env.DATABASE_URL;

  beforeEach(() => {
    process.env.DATABASE_URL = "postgres://test";
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.DATABASE_URL = origDb;
  });

  // --- Validation ---

  it("returns 400 when routeGeometry is missing", async () => {
    const res = await POST(makeReq({ vehicle: INFANTRY }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/routeGeometry/);
  });

  it("returns 400 when routeGeometry is not a LineString", async () => {
    const res = await POST(
      makeReq({
        routeGeometry: { type: "Point", coordinates: [0, 0] },
        vehicle: INFANTRY,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when routeGeometry has fewer than 2 coordinates", async () => {
    const res = await POST(
      makeReq({
        routeGeometry: { type: "LineString", coordinates: [[0, 0]] },
        vehicle: INFANTRY,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when vehicle is missing", async () => {
    const res = await POST(makeReq({ routeGeometry: ROUTE_GEOMETRY }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/vehicle/);
  });

  it("returns 400 when vehicle has negative mass", async () => {
    const res = await POST(
      makeReq({
        routeGeometry: ROUTE_GEOMETRY,
        vehicle: { ...INFANTRY, mass_t: -1 },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when vehicle height_m is 0", async () => {
    const res = await POST(
      makeReq({
        routeGeometry: ROUTE_GEOMETRY,
        vehicle: { ...INFANTRY, height_m: 0 },
      }),
    );
    expect(res.status).toBe(400);
  });

  // --- Missing DATABASE_URL ---

  it("returns 503 with empty hazards when DATABASE_URL is not set", async () => {
    delete process.env.DATABASE_URL;
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: INFANTRY }),
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.hazards).toHaveLength(0);
    expect(body.summary.passable).toBe(true);
    expect(res.headers.get("X-Aurora-Warning")).toBeTruthy();
  });

  // --- Empty results ---

  it("returns passable with no hazards when nothing is near the route", async () => {
    emptyDb();
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: MBT }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hazards).toHaveLength(0);
    expect(body.summary.passable).toBe(true);
  });

  // --- Road hazard rules ---

  it("generates WARNING for recurring road damage", async () => {
    stubDb(
      [{ ...EMPTY_ROAD_ROW, has_damage: true, damage_recurring: true }],
      [],
    );
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: INFANTRY }),
    );
    const body = await res.json();
    const h = body.hazards.find((h: { message: string }) =>
      h.message.includes("Recurring"),
    );
    expect(h).toBeDefined();
    expect(h.severity).toBe("warning");
  });

  it("generates INFO for one-off road damage", async () => {
    stubDb(
      [{ ...EMPTY_ROAD_ROW, has_damage: true, damage_recurring: false }],
      [],
    );
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: INFANTRY }),
    );
    const body = await res.json();
    const h = body.hazards.find((h: { message: string }) =>
      h.message.includes("Road damage reported"),
    );
    expect(h).toBeDefined();
    expect(h.severity).toBe("info");
  });

  it("generates WARNING for condition class 1 (erittäin huono — very bad)", async () => {
    stubDb(
      [
        {
          ...EMPTY_ROAD_ROW,
          condition_class: 1,
          condition_text: "erittäin huono",
        },
      ],
      [],
    );
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: INFANTRY }),
    );
    const body = await res.json();
    const h = body.hazards.find((h: { message: string }) =>
      h.message.includes("Very poor"),
    );
    expect(h).toBeDefined();
    expect(h.severity).toBe("warning");
    expect(h.message).toContain("erittäin huono");
  });

  it("generates INFO for condition class 2 (huono — bad)", async () => {
    stubDb(
      [{ ...EMPTY_ROAD_ROW, condition_class: 2, condition_text: "huono" }],
      [],
    );
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: INFANTRY }),
    );
    const body = await res.json();
    const h = body.hazards.find((h: { message: string }) =>
      h.message.includes("Poor road surface"),
    );
    expect(h).toBeDefined();
    expect(h.severity).toBe("info");
  });

  it("does not warn for condition class 4 or 5 (hyvä tai erittäin hyvä — good)", async () => {
    for (const cls of [4, 5]) {
      stubDb(
        [
          {
            ...EMPTY_ROAD_ROW,
            condition_class: cls,
            condition_text: "hyvä tai erittäin hyvä",
          },
        ],
        [],
      );
      const res = await POST(
        makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: MBT }),
      );
      const body = await res.json();
      const h = body.hazards.find(
        (h: { message: string }) =>
          h.message.toLowerCase().includes("condition") ||
          h.message.toLowerCase().includes("surface"),
      );
      expect(h).toBeUndefined();
    }
  });

  it("does not warn for condition class 3 (tyydyttävä — satisfactory)", async () => {
    stubDb(
      [{ ...EMPTY_ROAD_ROW, condition_class: 3, condition_text: "tyydyttävä" }],
      [],
    );
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: MBT }),
    );
    const body = await res.json();
    const h = body.hazards.find((h: { message: string }) =>
      h.message.toLowerCase().includes("surface"),
    );
    expect(h).toBeUndefined();
  });

  it("generates CRITICAL for road weight limit exceeded", async () => {
    stubDb([{ ...EMPTY_ROAD_ROW, max_mass_kg: 10000 }], []);
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: MBT }),
    );
    const body = await res.json();
    const h = body.hazards.find((h: { message: string }) =>
      h.message.includes("Road weight limit"),
    );
    expect(h).toBeDefined();
    expect(h.severity).toBe("critical");
    expect(h.message).toContain("10000 kg");
  });

  it("generates CRITICAL for road too narrow", async () => {
    stubDb([{ ...EMPTY_ROAD_ROW, width_cm: 200 }], []);
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: MBT }),
    );
    const body = await res.json();
    const h = body.hazards.find((h: { message: string }) =>
      h.message.includes("narrow"),
    );
    expect(h).toBeDefined();
    expect(h.severity).toBe("critical");
    expect(h.message).toContain("200 cm");
  });

  it("generates CRITICAL for road bogie limit exceeded", async () => {
    stubDb([{ ...EMPTY_ROAD_ROW, max_bogie_mass_kg: 5000 }], []);
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: MBT }),
    );
    const body = await res.json();
    const h = body.hazards.find((h: { message: string }) =>
      h.message.includes("bogie"),
    );
    expect(h).toBeDefined();
    expect(h.severity).toBe("critical");
  });

  it("generates CRITICAL for road axle limit exceeded (wheeled)", async () => {
    stubDb([{ ...EMPTY_ROAD_ROW, max_axle_mass_kg: 5000 }], []);
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: WHEELED }),
    );
    const body = await res.json();
    const h = body.hazards.find((h: { message: string }) =>
      h.message.includes("axle"),
    );
    expect(h).toBeDefined();
    expect(h.severity).toBe("critical");
  });

  it("generates INFO for unpaved surface", async () => {
    stubDb([{ ...EMPTY_ROAD_ROW, pavement_type: 2 }], []);
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: INFANTRY }),
    );
    const body = await res.json();
    const h = body.hazards.find((h: { message: string }) =>
      h.message.includes("Unpaved"),
    );
    expect(h).toBeDefined();
    expect(h.severity).toBe("info");
    expect(h.message).toContain("Gravel");
  });

  it("generates WARNING for significant rutting (>= 20 mm)", async () => {
    stubDb([{ ...EMPTY_ROAD_ROW, rut_depth_mm: 25 }], []);
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: INFANTRY }),
    );
    const body = await res.json();
    const h = body.hazards.find((h: { message: string }) =>
      h.message.includes("rutting"),
    );
    expect(h).toBeDefined();
    expect(h.severity).toBe("warning");
    expect(h.message).toContain("25 mm");
  });

  it("does not warn for rutting under 20 mm", async () => {
    stubDb([{ ...EMPTY_ROAD_ROW, rut_depth_mm: 15 }], []);
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: INFANTRY }),
    );
    const body = await res.json();
    const h = body.hazards.find((h: { message: string }) =>
      h.message.includes("rutting"),
    );
    expect(h).toBeUndefined();
  });

  // --- Infantry skips mass checks ---

  it("Infantry (mass_t=0) skips road weight-limit check", async () => {
    stubDb([{ ...EMPTY_ROAD_ROW, max_mass_kg: 1000 }], []);
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: INFANTRY }),
    );
    const body = await res.json();
    const h = body.hazards.find((h: { message: string }) =>
      h.message.includes("weight limit"),
    );
    expect(h).toBeUndefined();
  });

  it("Infantry skips bridge vehicle mass check", async () => {
    stubDb([], [{ ...EMPTY_BRIDGE_ROW, max_vehicle_mass_t: 1 }]);
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: INFANTRY }),
    );
    const body = await res.json();
    const h = body.hazards.find((h: { message: string }) =>
      h.message.includes("Bridge vehicle limit"),
    );
    expect(h).toBeUndefined();
  });

  // --- Bridge hazard rules ---

  it("generates CRITICAL for bridge vehicle mass exceeded", async () => {
    stubDb([], [{ ...EMPTY_BRIDGE_ROW, max_vehicle_mass_t: 16 }]);
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: MBT }),
    );
    const body = await res.json();
    const h = body.hazards.find((h: { message: string }) =>
      h.message.includes("Bridge vehicle limit"),
    );
    expect(h).toBeDefined();
    expect(h.severity).toBe("critical");
    expect(h.message).toContain("16 t");
  });

  it("generates CRITICAL for bridge height restriction", async () => {
    stubDb([], [{ ...EMPTY_BRIDGE_ROW, height_restriction_m: 2.5 }]);
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: MBT }),
    );
    const body = await res.json();
    const h = body.hazards.find((h: { message: string }) =>
      h.message.includes("Height restriction"),
    );
    expect(h).toBeDefined();
    expect(h.severity).toBe("critical");
    expect(h.message).toContain("2.5 m");
  });

  it("generates CRITICAL for bridge bogie limit exceeded", async () => {
    stubDb([], [{ ...EMPTY_BRIDGE_ROW, max_bogie_mass_t: 10 }]);
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: MBT }),
    );
    const body = await res.json();
    const h = body.hazards.find((h: { message: string }) =>
      h.message.includes("bogie limit"),
    );
    expect(h).toBeDefined();
    expect(h.severity).toBe("critical");
  });

  it("generates CRITICAL for bridge axle limit exceeded", async () => {
    stubDb([], [{ ...EMPTY_BRIDGE_ROW, max_axle_mass_t: 5 }]);
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: WHEELED }),
    );
    const body = await res.json();
    const h = body.hazards.find((h: { message: string }) =>
      h.message.includes("axle limit"),
    );
    expect(h).toBeDefined();
    expect(h.severity).toBe("critical");
  });

  it("generates WARNING for bad bridge status", async () => {
    stubDb([], [{ ...EMPTY_BRIDGE_ROW, status: "damaged" }]);
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: INFANTRY }),
    );
    const body = await res.json();
    const h = body.hazards.find((h: { message: string }) =>
      h.message.includes("Bridge condition"),
    );
    expect(h).toBeDefined();
    expect(h.severity).toBe("warning");
    expect(h.message).toContain("damaged");
  });

  it("does not warn for bridge status 'ok'", async () => {
    stubDb([], [{ ...EMPTY_BRIDGE_ROW, status: "ok" }]);
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: INFANTRY }),
    );
    const body = await res.json();
    const h = body.hazards.find((h: { message: string }) =>
      h.message.includes("Bridge condition"),
    );
    expect(h).toBeUndefined();
  });

  // --- Sorting ---

  it("sorts hazards CRITICAL before WARNING before INFO", async () => {
    stubDb(
      [
        {
          ...EMPTY_ROAD_ROW,
          id: 1,
          link_id: "r1",
          has_damage: true,
          damage_recurring: false,
          pavement_type: 2,
          max_mass_kg: 1000,
        },
      ],
      [{ ...EMPTY_BRIDGE_ROW, max_vehicle_mass_t: 16, status: "poor" }],
    );
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: MBT }),
    );
    const body = await res.json();
    const severities: string[] = body.hazards.map(
      (h: { severity: string }) => h.severity,
    );
    const order = { critical: 0, warning: 1, info: 2 };
    for (let i = 1; i < severities.length; i++) {
      expect(order[severities[i] as keyof typeof order]).toBeGreaterThanOrEqual(
        order[severities[i - 1] as keyof typeof order],
      );
    }
  });

  // --- Summary ---

  it("summary.passable is false when critical > 0", async () => {
    stubDb([], [{ ...EMPTY_BRIDGE_ROW, max_vehicle_mass_t: 16 }]);
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: MBT }),
    );
    const body = await res.json();
    expect(body.summary.passable).toBe(false);
    expect(body.summary.critical).toBeGreaterThan(0);
  });

  // --- DB error ---

  it("returns 500 on database error", async () => {
    mockQuery.mockRejectedValue(new Error("connection refused"));
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: INFANTRY }),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Database/);
  });

  // --- Coverage ---

  it("returns coverage with gap data when coverage query succeeds", async () => {
    const gapGeom = {
      type: "LineString",
      coordinates: [
        [24.96, 60.19],
        [24.98, 60.21],
      ],
    };
    stubDb(
      [],
      [],
      [
        {
          gap_geojson: JSON.stringify(gapGeom),
          route_length_m: 9000,
          covered_length_m: 6000,
          uncovered_length_m: 3000,
          gap_count: 1,
          longest_gap_m: 3000,
        },
      ],
    );
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: INFANTRY }),
    );
    const body = await res.json();
    expect(body.coverage).toBeDefined();
    expect(body.coverage.covered_pct).toBe(67);
    expect(body.coverage.gap_count).toBe(1);
    expect(body.coverage.longest_gap_m).toBe(3000);
    expect(body.coverage.gap_geometry).toEqual(gapGeom);
    expect(body.coverage.route_length_m).toBe(9000);
  });

  it("returns full coverage (covered_pct 100) when gap_geojson is null", async () => {
    stubDb([], [], [FULL_COVERAGE_ROW]);
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: INFANTRY }),
    );
    const body = await res.json();
    expect(body.coverage.covered_pct).toBe(100);
    expect(body.coverage.gap_count).toBe(0);
    expect(body.coverage.gap_geometry).toBeNull();
  });

  it("returns coverage null when coverage query returns no rows", async () => {
    stubDb([], [], []);
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: INFANTRY }),
    );
    const body = await res.json();
    expect(body.coverage).toBeNull();
  });

  it("returns hazards even when coverage query throws", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ ...EMPTY_ROAD_ROW, has_damage: true, damage_recurring: true }],
      } as never)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockRejectedValueOnce(new Error("coverage query failed"));
    const res = await POST(
      makeReq({ routeGeometry: ROUTE_GEOMETRY, vehicle: INFANTRY }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const h = body.hazards.find((h: { message: string }) =>
      h.message.includes("Recurring"),
    );
    expect(h).toBeDefined();
    expect(body.coverage).toBeNull();
  });
});
