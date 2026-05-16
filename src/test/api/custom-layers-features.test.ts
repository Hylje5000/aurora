import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));

import { GET, POST } from "@/app/api/custom-layers/[id]/features/route";
import { query } from "@/lib/db";

const mockQuery = vi.mocked(query);

const FEATURE_ROW = {
  id: "feat-1",
  layer_id: "layer-1",
  name: "Obs Post Alpha",
  description: null,
  feature_type: "Point",
  geojson: '{"type":"Point","coordinates":[22.1,60.2]}',
  color: "#ef4444",
  properties: {},
  created_at: "2026-05-16T00:00:00Z",
  updated_at: "2026-05-16T00:00:00Z",
};

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeGetRequest(id: string, bbox?: string) {
  const url = bbox
    ? `http://localhost/api/custom-layers/${id}/features?bbox=${bbox}`
    : `http://localhost/api/custom-layers/${id}/features`;
  return new NextRequest(url);
}

function makePostRequest(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/custom-layers/${id}/features`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("GET /api/custom-layers/[id]/features", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.DATABASE_URL;
  });

  it("returns empty FeatureCollection with warning when DATABASE_URL absent", async () => {
    const res = await GET(
      makeGetRequest("layer-1", "20,59,22,61"),
      makeParams("layer-1"),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Aurora-Warning")).toMatch(/DATABASE_URL/);
    const body = await res.json();
    expect(body).toEqual({ type: "FeatureCollection", features: [] });
  });

  it("returns 400 when bbox is missing", async () => {
    process.env.DATABASE_URL = "postgres://test";
    const res = await GET(makeGetRequest("layer-1"), makeParams("layer-1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/bbox/);
  });

  it("returns 400 when bbox is malformed", async () => {
    process.env.DATABASE_URL = "postgres://test";
    const res = await GET(
      makeGetRequest("layer-1", "bad"),
      makeParams("layer-1"),
    );
    expect(res.status).toBe(400);
  });

  it("returns FeatureCollection with correct shape", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({
      rows: [FEATURE_ROW],
      rowCount: 1,
    } as never);

    const res = await GET(
      makeGetRequest("layer-1", "20,59,22,61"),
      makeParams("layer-1"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("FeatureCollection");
    expect(body.features).toHaveLength(1);
    const f = body.features[0];
    expect(f.type).toBe("Feature");
    expect(f.id).toBe("feat-1");
    expect(f.geometry).toEqual({ type: "Point", coordinates: [22.1, 60.2] });
    expect(f.properties.name).toBe("Obs Post Alpha");
    expect(f.properties.color).toBe("#ef4444");
  });

  it("passes layer_id and bbox to query", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    await GET(makeGetRequest("layer-1", "20,59,22,61"), makeParams("layer-1"));
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("ST_MakeEnvelope"),
      ["layer-1", 20, 59, 22, 61],
    );
  });

  it("returns 500 when DB throws", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockRejectedValueOnce(new Error("DB error"));

    const res = await GET(
      makeGetRequest("layer-1", "20,59,22,61"),
      makeParams("layer-1"),
    );
    expect(res.status).toBe(500);
  });
});

describe("POST /api/custom-layers/[id]/features", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.DATABASE_URL;
  });

  const VALID_BODY = {
    name: "Obs Post Alpha",
    feature_type: "Point",
    geometry: { type: "Point", coordinates: [22.1, 60.2] },
    color: "#ef4444",
  };

  it("returns 503 when DATABASE_URL absent", async () => {
    const res = await POST(
      makePostRequest("layer-1", VALID_BODY),
      makeParams("layer-1"),
    );
    expect(res.status).toBe(503);
  });

  it("returns 400 on invalid JSON", async () => {
    process.env.DATABASE_URL = "postgres://test";
    const res = await POST(
      new NextRequest("http://localhost/api/custom-layers/layer-1/features", {
        method: "POST",
        body: "not-json",
        headers: { "content-type": "application/json" },
      }),
      makeParams("layer-1"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when feature_type is invalid", async () => {
    process.env.DATABASE_URL = "postgres://test";
    const res = await POST(
      makePostRequest("layer-1", { ...VALID_BODY, feature_type: "Circle" }),
      makeParams("layer-1"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/feature_type/);
  });

  it("returns 400 when geometry is missing", async () => {
    process.env.DATABASE_URL = "postgres://test";
    const res = await POST(
      makePostRequest("layer-1", { feature_type: "Point" }),
      makeParams("layer-1"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/geometry/);
  });

  it("creates a feature and returns 201 with GeoJSON Feature", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({
      rows: [FEATURE_ROW],
      rowCount: 1,
    } as never);

    const res = await POST(
      makePostRequest("layer-1", VALID_BODY),
      makeParams("layer-1"),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.type).toBe("Feature");
    expect(body.id).toBe("feat-1");
    expect(body.geometry.type).toBe("Point");
  });

  it("uses default colour when color is omitted", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({
      rows: [FEATURE_ROW],
      rowCount: 1,
    } as never);

    await POST(
      makePostRequest("layer-1", {
        name: VALID_BODY.name,
        feature_type: VALID_BODY.feature_type,
        geometry: VALID_BODY.geometry,
      }),
      makeParams("layer-1"),
    );

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT"),
      expect.arrayContaining(["#ef4444"]),
    );
  });

  it("returns 500 when DB throws", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockRejectedValueOnce(new Error("DB error"));

    const res = await POST(
      makePostRequest("layer-1", VALID_BODY),
      makeParams("layer-1"),
    );
    expect(res.status).toBe(500);
  });
});
