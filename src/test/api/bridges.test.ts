import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));

import { GET } from "@/app/api/bridges/route";
import { query } from "@/lib/db";

const mockQuery = vi.mocked(query);

function makeRequest(bbox?: string) {
  const url = bbox
    ? `http://localhost/api/bridges?bbox=${bbox}`
    : "http://localhost/api/bridges";
  return new NextRequest(url);
}

describe("GET /api/bridges", () => {
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
    const res = await GET(makeRequest("1,2,3"));
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
          id: 10,
          bridge_src_id: 587,
          oid: "1.2.246.578.1.15.201380",
          name: "Alhon silta",
          code: "T-1380",
          status: "kaytossa",
          aoi_id: "turku",
          max_vehicle_mass_t: 35,
          max_bogie_mass_t: 18,
          max_combination_mass_t: 60,
          max_axle_mass_t: null,
          height_restriction_m: null,
          type_name: "Vesistösilta",
          owner: "Väylävirasto",
          municipalities: "nimi:Laitila",
          road_address: "tienumero:12499",
          network_type: "Tieverkko",
          updated_date: "2026-05-06",
          geojson: '{"type":"Point","coordinates":[21.64,60.87]}',
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
    expect(f.geometry).toEqual({ type: "Point", coordinates: [21.64, 60.87] });
    expect(f.properties).toMatchObject({
      id: 10,
      name: "Alhon silta",
      code: "T-1380",
      status: "kaytossa",
      max_vehicle_mass_t: 35,
      max_combination_mass_t: 60,
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
