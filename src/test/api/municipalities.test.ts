import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));

import { GET } from "@/app/api/municipalities/route";
import { query } from "@/lib/db";

const mockQuery = vi.mocked(query);

const BASE_ROW = {
  id: 1,
  nat_code: "445",
  name_fi: "Parainen",
  name_sv: "Pargas",
  aoi_id: "turku",
  geojson:
    '{"type":"MultiPolygon","coordinates":[[[[22.1,59.9],[22.2,59.9],[22.2,60.0],[22.1,60.0],[22.1,59.9]]]]}',
};

const DEMO_ROW = {
  til_vuosi: 2025,
  population: 15600,
  male: 7700,
  male_pct: 49.4,
  female: 7900,
  female_pct: 50.6,
  age_0_14: 2200,
  age_0_14_pct: 14.1,
  age_15_64: 9100,
  age_15_64_pct: 58.3,
  age_65plus: 4300,
  age_65plus_pct: 27.6,
};

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

  it("returns FeatureCollection with correct base feature shape", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...BASE_ROW, ...DEMO_ROW }],
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

  it("includes demographic fields in properties when LEFT JOIN matches", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...BASE_ROW, ...DEMO_ROW }],
      rowCount: 1,
    } as never);

    const res = await GET();
    const body = await res.json();
    const props = body.features[0].properties;

    expect(props.til_vuosi).toBe(2025);
    expect(props.population).toBe(15600);
    expect(props.male).toBe(7700);
    expect(props.male_pct).toBeCloseTo(49.4);
    expect(props.female).toBe(7900);
    expect(props.female_pct).toBeCloseTo(50.6);
    expect(props.age_0_14).toBe(2200);
    expect(props.age_0_14_pct).toBeCloseTo(14.1);
    expect(props.age_65plus).toBe(4300);
    expect(props.age_65plus_pct).toBeCloseTo(27.6);
  });

  it("demographic fields are null when LEFT JOIN finds no match", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          ...BASE_ROW,
          til_vuosi: null,
          population: null,
          male: null,
          male_pct: null,
          female: null,
          female_pct: null,
          age_0_14: null,
          age_0_14_pct: null,
          age_15_64: null,
          age_15_64_pct: null,
          age_65plus: null,
          age_65plus_pct: null,
        },
      ],
      rowCount: 1,
    } as never);

    const res = await GET();
    const body = await res.json();
    const props = body.features[0].properties;

    expect(props.population).toBeNull();
    expect(props.age_0_14).toBeNull();
    expect(props.age_65plus).toBeNull();
    // Base fields still present
    expect(props.nat_code).toBe("445");
    expect(props.aoi_id).toBe("turku");
  });

  it("SQL query uses LEFT JOIN with municipality_demographics", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    await GET();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("LEFT JOIN municipality_demographics"),
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
