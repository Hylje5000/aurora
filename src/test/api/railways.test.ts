import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));

import { GET } from "@/app/api/railways/route";
import { query } from "@/lib/db";

const mockQuery = vi.mocked(query);

function makeRequest(bbox?: string) {
  const url = bbox
    ? `http://localhost/api/railways?bbox=${bbox}`
    : "http://localhost/api/railways";
  return new NextRequest(url);
}

describe("GET /api/railways", () => {
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
    const res = await GET(makeRequest("a,b,c,d"));
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
          id: 5,
          track_src_id: 1,
          oid: "1.2.246.578.3.10002.189411",
          name: "PO V003-P",
          description: "Paimio raide: V003-P V003 - Puskin",
          track_type: "turvaraide",
          state: "IN USE",
          aoi_id: "turku",
          route_name: "001",
          length_m: 71.4,
          start_km: 170,
          end_km: 171,
          maintenance_district: "Etelä-Suomi",
          operating_centre: "Helsinki",
          geojson:
            '{"type":"LineString","coordinates":[[22.1,60.4],[22.2,60.5]]}',
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
      id: 5,
      name: "PO V003-P",
      track_type: "turvaraide",
      state: "IN USE",
      aoi_id: "turku",
      route_name: "001",
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
