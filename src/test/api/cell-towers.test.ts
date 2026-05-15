import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));

import { GET } from "@/app/api/cell-towers/route";
import { query } from "@/lib/db";

const mockQuery = vi.mocked(query);

function makeRequest(bbox?: string) {
  const url = bbox
    ? `http://localhost/api/cell-towers?bbox=${bbox}`
    : "http://localhost/api/cell-towers";
  return new NextRequest(url);
}

describe("GET /api/cell-towers", () => {
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
    const res = await GET(makeRequest("not,a,valid,bbox"));
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
          id: 42,
          radio: "LTE",
          aoi_id: "turku",
          range_m: 1500,
          samples: 10,
          avg_signal: -80,
          geojson: '{"type":"Point","coordinates":[22.1,60.2]}',
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
    expect(f.geometry).toEqual({ type: "Point", coordinates: [22.1, 60.2] });
    expect(f.properties).toMatchObject({
      id: 42,
      radio: "LTE",
      aoi_id: "turku",
      range_m: 1500,
      samples: 10,
      avg_signal: -80,
    });
  });

  it("passes bbox values as query parameters in the correct order", async () => {
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
