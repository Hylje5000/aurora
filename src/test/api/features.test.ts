import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));

import { parseBbox, GET } from "@/app/api/features/route";
import { query } from "@/lib/db";

const mockQuery = vi.mocked(query);

describe("parseBbox", () => {
  it("returns null for missing input", () => {
    expect(parseBbox(null)).toBeNull();
  });

  it("returns null for wrong number of parts", () => {
    expect(parseBbox("1,2,3")).toBeNull();
    expect(parseBbox("1,2,3,4,5")).toBeNull();
  });

  it("returns null for non-numeric values", () => {
    expect(parseBbox("a,b,c,d")).toBeNull();
    expect(parseBbox("1,2,3,NaN")).toBeNull();
  });

  it("returns null when minLng >= maxLng", () => {
    expect(parseBbox("5,1,5,2")).toBeNull();
    expect(parseBbox("6,1,5,2")).toBeNull();
  });

  it("returns null when minLat >= maxLat", () => {
    expect(parseBbox("1,3,2,3")).toBeNull();
    expect(parseBbox("1,4,2,3")).toBeNull();
  });

  it("returns the correct 4-tuple for a valid bbox", () => {
    expect(parseBbox("20,59,22,61")).toEqual([20, 59, 22, 61]);
  });
});

function makeRequest(bbox?: string) {
  const url = bbox
    ? `http://localhost/api/features?bbox=${bbox}`
    : "http://localhost/api/features";
  return new NextRequest(url);
}

describe("GET /api/features", () => {
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

  it("returns empty FeatureCollection with warning header when DATABASE_URL is absent", async () => {
    const res = await GET(makeRequest("20,59,22,61"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Aurora-Warning")).toMatch(/DATABASE_URL/);
    const body = await res.json();
    expect(body).toEqual({ type: "FeatureCollection", features: [] });
  });

  it("returns FeatureCollection with features when DB returns rows", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          geojson: '{"type":"Point","coordinates":[21.5,60.2]}',
          props: '{"id":1,"name":"test"}',
        },
      ],
      rowCount: 1,
    } as never);

    const res = await GET(makeRequest("20,59,22,61"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("FeatureCollection");
    expect(body.features).toHaveLength(1);
    expect(body.features[0].type).toBe("Feature");
    expect(body.features[0].geometry).toEqual({
      type: "Point",
      coordinates: [21.5, 60.2],
    });
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
