import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));

import { DELETE } from "@/app/api/custom-layers/[id]/route";
import { query } from "@/lib/db";

const mockQuery = vi.mocked(query);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("DELETE /api/custom-layers/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.DATABASE_URL;
  });

  it("returns 503 when DATABASE_URL is absent", async () => {
    const res = await DELETE(
      new NextRequest("http://localhost/api/custom-layers/layer-1", {
        method: "DELETE",
      }),
      makeParams("layer-1"),
    );
    expect(res.status).toBe(503);
  });

  it("returns 204 when layer is deleted", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: "layer-1" }],
      rowCount: 1,
    } as never);

    const res = await DELETE(
      new NextRequest("http://localhost/api/custom-layers/layer-1", {
        method: "DELETE",
      }),
      makeParams("layer-1"),
    );
    expect(res.status).toBe(204);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("DELETE"), [
      "layer-1",
    ]);
  });

  it("returns 404 when layer does not exist", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const res = await DELETE(
      new NextRequest("http://localhost/api/custom-layers/nonexistent", {
        method: "DELETE",
      }),
      makeParams("nonexistent"),
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/not found/i);
  });

  it("returns 500 when DB throws", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockRejectedValueOnce(new Error("DB error"));

    const res = await DELETE(
      new NextRequest("http://localhost/api/custom-layers/layer-1", {
        method: "DELETE",
      }),
      makeParams("layer-1"),
    );
    expect(res.status).toBe(500);
  });
});
