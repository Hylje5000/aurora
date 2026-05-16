import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));

import { GET } from "@/app/api/elevation/route";
import { query } from "@/lib/db";

const mockQuery = vi.mocked(query);

function makeRequest(lng?: string, lat?: string) {
  const params = new URLSearchParams();
  if (lng !== undefined) params.set("lng", lng);
  if (lat !== undefined) params.set("lat", lat);
  const qs = params.toString();
  return new NextRequest(`http://localhost/api/elevation${qs ? `?${qs}` : ""}`);
}

describe("GET /api/elevation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.DATABASE_URL;
  });

  it("returns 400 when both params are missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/lng and lat/);
  });

  it("returns 400 when lng is missing", async () => {
    const res = await GET(makeRequest(undefined, "60.45"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when lat is missing", async () => {
    const res = await GET(makeRequest("22.27", undefined));
    expect(res.status).toBe(400);
  });

  it("returns 400 when lng is non-numeric", async () => {
    const res = await GET(makeRequest("abc", "60.45"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when lat is non-numeric", async () => {
    const res = await GET(makeRequest("22.27", "xyz"));
    expect(res.status).toBe(400);
  });

  it("returns { elevation_m: null } when DATABASE_URL is absent", async () => {
    const res = await GET(makeRequest("22.27", "60.45"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ elevation_m: null });
  });

  it("returns elevation data when DB returns a row", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          elevation_m: 6.65,
          aoi_id: "turku",
          grid_file: "L3323",
          dist_m: 12.4,
        },
      ],
      rowCount: 1,
    } as never);

    const res = await GET(makeRequest("22.27", "60.45"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      elevation_m: 6.65,
      aoi_id: "turku",
      grid_file: "L3323",
      dist_m: 12.4,
    });
  });

  it("passes lng and lat as query parameters", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    await GET(makeRequest("22.27", "60.45"));
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("height_data"),
      [22.27, 60.45],
    );
  });

  it("returns { elevation_m: null } when DB returns no rows (outside AOI)", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const res = await GET(makeRequest("10.0", "50.0"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ elevation_m: null });
  });

  it("returns 500 when DB throws", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockRejectedValueOnce(new Error("connection refused"));

    const res = await GET(makeRequest("22.27", "60.45"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Database/);
  });
});
