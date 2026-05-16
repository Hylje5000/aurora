import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));

import { GET } from "@/app/api/municipalities/route";
import { query } from "@/lib/db";

const mockQuery = vi.mocked(query);

describe("GET /api/municipalities", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.DATABASE_URL;
  });

  it("returns empty FeatureCollection with warning header when DATABASE_URL is absent", async () => {
    const res = await GET();
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
          nat_code: "445",
          name_fi: "Parainen",
          name_sv: "Pargas",
          aoi_id: "turku",
          geojson:
            '{"type":"MultiPolygon","coordinates":[[[[22.1,59.9],[22.2,59.9],[22.2,60.0],[22.1,60.0],[22.1,59.9]]]]}',
        },
      ],
      rowCount: 1,
    } as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("FeatureCollection");
    expect(body.features).toHaveLength(1);

    const f = body.features[0];
    expect(f.type).toBe("Feature");
    expect(f.geometry.type).toBe("MultiPolygon");
    expect(f.properties).toMatchObject({
      id: 1,
      nat_code: "445",
      name_fi: "Parainen",
      name_sv: "Pargas",
      aoi_id: "turku",
    });
  });

  it("does not require bbox parameter", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("FROM municipalities"),
    );
  });

  it("returns 500 when DB throws", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockRejectedValueOnce(new Error("connection refused"));

    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Database/);
  });
});
