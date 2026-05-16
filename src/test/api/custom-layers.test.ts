import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));

import { GET, POST } from "@/app/api/custom-layers/route";
import { query } from "@/lib/db";

const mockQuery = vi.mocked(query);

const LAYER_ROW = {
  id: "layer-1",
  name: "Sector Blue",
  description: null,
  color: "#3b82f6",
  created_at: "2026-05-16T00:00:00Z",
  updated_at: "2026-05-16T00:00:00Z",
};

describe("GET /api/custom-layers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.DATABASE_URL;
  });

  it("returns empty array with warning header when DATABASE_URL is absent", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Aurora-Warning")).toMatch(/DATABASE_URL/);
    expect(await res.json()).toEqual([]);
  });

  it("returns array of layers from DB", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({
      rows: [LAYER_ROW],
      rowCount: 1,
    } as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ id: "layer-1", name: "Sector Blue" });
  });

  it("returns 500 when DB throws", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockRejectedValueOnce(new Error("DB error"));

    const res = await GET();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/Database/);
  });
});

describe("POST /api/custom-layers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.DATABASE_URL;
  });

  function makeRequest(body: unknown) {
    return new NextRequest("http://localhost/api/custom-layers", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
  }

  it("returns 503 when DATABASE_URL is absent", async () => {
    const res = await POST(makeRequest({ name: "Alpha" }));
    expect(res.status).toBe(503);
  });

  it("returns 400 when name is missing", async () => {
    process.env.DATABASE_URL = "postgres://test";
    const res = await POST(makeRequest({ color: "#ef4444" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/name/);
  });

  it("returns 400 when name is empty string", async () => {
    process.env.DATABASE_URL = "postgres://test";
    const res = await POST(makeRequest({ name: "  " }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON", async () => {
    process.env.DATABASE_URL = "postgres://test";
    const res = await POST(
      new NextRequest("http://localhost/api/custom-layers", {
        method: "POST",
        body: "not-json",
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/JSON/);
  });

  it("creates a layer with default colour when color is omitted", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({
      rows: [LAYER_ROW],
      rowCount: 1,
    } as never);

    const res = await POST(makeRequest({ name: "Sector Blue" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("layer-1");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT"),
      expect.arrayContaining(["Sector Blue"]),
    );
  });

  it("uses provided color when valid", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...LAYER_ROW, color: "#22c55e" }],
      rowCount: 1,
    } as never);

    const res = await POST(
      makeRequest({ name: "Sector Green", color: "#22c55e" }),
    );
    expect(res.status).toBe(201);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT"),
      expect.arrayContaining(["#22c55e"]),
    );
  });

  it("returns 500 when DB throws", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockRejectedValueOnce(new Error("DB error"));

    const res = await POST(makeRequest({ name: "Alpha" }));
    expect(res.status).toBe(500);
  });
});
