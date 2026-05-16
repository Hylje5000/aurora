import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));

import { GET } from "@/app/api/roads/route";
import { query } from "@/lib/db";

const mockQuery = vi.mocked(query);

function makeRequest(bbox?: string) {
  const url = bbox
    ? `http://localhost/api/roads?bbox=${bbox}`
    : "http://localhost/api/roads";
  return new NextRequest(url);
}

describe("GET /api/roads", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.DATABASE_URL;
  });

  it("returns 400 when bbox param is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/bbox/);
  });

  it("returns 400 when bbox is malformed", async () => {
    const res = await GET(makeRequest("not,valid"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when bbox has inverted coordinates", async () => {
    const res = await GET(makeRequest("22,61,20,59"));
    expect(res.status).toBe(400);
  });

  it("returns empty FeatureCollection with warning header when DATABASE_URL is absent", async () => {
    const res = await GET(makeRequest("20,59,22,61"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Aurora-Warning")).toMatch(/DATABASE_URL/);
    const body = await res.json();
    expect(body).toEqual({ type: "FeatureCollection", features: [] });
  });

  it("returns FeatureCollection with correct feature shape when DB returns rows", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          link_id: "abc-123",
          aoi_id: "turku",
          admin_class: 1,
          functional_class: 2,
          has_structure: 0,
          max_mass_kg: 8000,
          max_height_cm: 420,
          max_bogie_mass_kg: null,
          max_axle_mass_kg: null,
          width_cm: 650,
          lane_count: 2,
          pavement_type: 1,
          has_damage: false,
          damage_recurring: false,
          condition_class: 4,
          condition_text: "hyvä tai erittäin hyvä",
          rut_depth_mm: 5.2,
          ride_quality: 4,
          geojson:
            '{"type":"LineString","coordinates":[[22.1,60.2],[22.2,60.3]]}',
        },
      ],
      rowCount: 1,
    } as never);

    const res = await GET(makeRequest("20,59,22,61"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("FeatureCollection");
    expect(body.features).toHaveLength(1);

    const f = body.features[0];
    expect(f.type).toBe("Feature");
    expect(f.geometry.type).toBe("LineString");
    expect(f.properties).toMatchObject({
      id: 1,
      link_id: "abc-123",
      aoi_id: "turku",
      max_mass_kg: 8000,
      width_cm: 650,
      lane_count: 2,
      has_damage: false,
      condition_class: 4,
    });
  });

  it("passes bbox values to query in correct order", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    await GET(makeRequest("20,59,22,61"));
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("ST_MakeEnvelope"),
      [20, 59, 22, 61],
    );
  });

  it("returns 500 when DB throws", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockRejectedValueOnce(new Error("connection refused"));

    const res = await GET(makeRequest("20,59,22,61"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Database/);
  });
});
