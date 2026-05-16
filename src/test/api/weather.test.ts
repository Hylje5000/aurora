import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));

import { GET } from "@/app/api/weather/route";
import { query } from "@/lib/db";

const mockQuery = vi.mocked(query);

function makeRequest(params?: Record<string, string>) {
  const url = new URL("http://localhost/api/weather");
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return new NextRequest(url.toString());
}

const VALID_PARAMS = { region: "turku", month: "5", day: "16" };

const MOCK_ROW = {
  sample_size: "10",
  avg_temp: "12.5",
  min_temp: "7.2",
  max_temp: "18.1",
  temp_spread: "5.45",
  rain_probability: "40",
  avg_rain_mm: "3.2",
};

describe("GET /api/weather", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.DATABASE_URL;
  });

  it("returns 400 when region param is missing", async () => {
    const res = await GET(makeRequest({ month: "5", day: "16" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/region/);
  });

  it("returns 400 when region is invalid", async () => {
    const res = await GET(
      makeRequest({ region: "espoo", month: "5", day: "16" }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/region/);
  });

  it("returns 400 when month param is missing", async () => {
    const res = await GET(makeRequest({ region: "turku", day: "16" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/month/);
  });

  it("returns 400 when month is out of range", async () => {
    const res = await GET(
      makeRequest({ region: "turku", month: "13", day: "16" }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/month/);
  });

  it("returns 400 when day param is missing", async () => {
    const res = await GET(makeRequest({ region: "turku", month: "5" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/day/);
  });

  it("returns 400 when day is out of range", async () => {
    const res = await GET(
      makeRequest({ region: "turku", month: "5", day: "32" }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/day/);
  });

  it("returns zeroed stats with warning header when DATABASE_URL is absent", async () => {
    const res = await GET(makeRequest(VALID_PARAMS));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Aurora-Warning")).toMatch(/DATABASE_URL/);
    const body = await res.json();
    expect(body.sampleSize).toBe(0);
    expect(body.region).toBe("turku");
    expect(body.month).toBe(5);
    expect(body.day).toBe(16);
  });

  it("returns correct aggregated stats on a valid request", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_ROW], rowCount: 1 } as never);

    const res = await GET(makeRequest(VALID_PARAMS));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.region).toBe("turku");
    expect(body.month).toBe(5);
    expect(body.day).toBe(16);
    expect(body.sampleSize).toBe(10);
    expect(body.avgTemp).toBeCloseTo(12.5);
    expect(body.minTemp).toBeCloseTo(7.2);
    expect(body.maxTemp).toBeCloseTo(18.1);
    expect(body.tempSpread).toBeCloseTo(5.45);
    expect(body.rainProbability).toBeCloseTo(40);
    expect(body.avgRainMm).toBeCloseTo(3.2);
  });

  it("passes correct SQL params to query helper", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_ROW], rowCount: 1 } as never);

    await GET(makeRequest(VALID_PARAMS));
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      "turku",
      5,
      16,
    ]);
  });

  it("returns zeroed stats when sample_size is 0", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          sample_size: "0",
          avg_temp: null,
          min_temp: null,
          max_temp: null,
          temp_spread: null,
          rain_probability: null,
          avg_rain_mm: null,
        },
      ],
      rowCount: 1,
    } as never);

    const res = await GET(makeRequest(VALID_PARAMS));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sampleSize).toBe(0);
    expect(body.avgTemp).toBe(0);
    expect(body.rainProbability).toBe(0);
  });

  it("returns zeroed stats (not 500) when DB throws", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockRejectedValueOnce(new Error("connection refused"));

    const res = await GET(makeRequest(VALID_PARAMS));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Aurora-Warning")).toMatch(/Database/);
    const body = await res.json();
    expect(body.sampleSize).toBe(0);
  });

  it("NULL precip rows are excluded from rain probability by SQL COUNT(precip_mm)", async () => {
    process.env.DATABASE_URL = "postgres://test";
    // 5 total rows, 2 rainy (non-NULL precip) → 40% probability
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          sample_size: "5",
          avg_temp: "10.0",
          min_temp: "5.0",
          max_temp: "15.0",
          temp_spread: "5.0",
          rain_probability: "40",
          avg_rain_mm: "2.5",
        },
      ],
      rowCount: 1,
    } as never);

    const res = await GET(makeRequest(VALID_PARAMS));
    const body = await res.json();
    expect(body.rainProbability).toBeCloseTo(40);
    expect(body.avgRainMm).toBeCloseTo(2.5);
  });
});
