import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));

import { PUT, DELETE } from "@/app/api/custom-layers/[id]/features/[fid]/route";
import { query } from "@/lib/db";

const mockQuery = vi.mocked(query);

function makeParams(id: string, fid: string) {
  return { params: Promise.resolve({ id, fid }) };
}

function makePutRequest(id: string, fid: string, body: unknown) {
  return new NextRequest(
    `http://localhost/api/custom-layers/${id}/features/${fid}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    },
  );
}

function makeDeleteRequest(id: string, fid: string) {
  return new NextRequest(
    `http://localhost/api/custom-layers/${id}/features/${fid}`,
    { method: "DELETE" },
  );
}

describe("PUT /api/custom-layers/[id]/features/[fid]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.DATABASE_URL;
  });

  it("returns 503 when DATABASE_URL absent", async () => {
    const res = await PUT(
      makePutRequest("l1", "f1", { name: "New name" }),
      makeParams("l1", "f1"),
    );
    expect(res.status).toBe(503);
  });

  it("returns 400 on invalid JSON", async () => {
    process.env.DATABASE_URL = "postgres://test";
    const res = await PUT(
      new NextRequest("http://localhost/api/custom-layers/l1/features/f1", {
        method: "PUT",
        body: "not-json",
        headers: { "content-type": "application/json" },
      }),
      makeParams("l1", "f1"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when body has nothing to update", async () => {
    process.env.DATABASE_URL = "postgres://test";
    const res = await PUT(
      makePutRequest("l1", "f1", {}),
      makeParams("l1", "f1"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Nothing/);
  });

  it("updates name and returns 200 with id", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: "f1" }],
      rowCount: 1,
    } as never);

    const res = await PUT(
      makePutRequest("l1", "f1", { name: "Updated name" }),
      makeParams("l1", "f1"),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe("f1");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE"),
      expect.arrayContaining(["Updated name"]),
    );
  });

  it("updates color correctly", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: "f1" }],
      rowCount: 1,
    } as never);

    await PUT(
      makePutRequest("l1", "f1", { color: "#22c55e" }),
      makeParams("l1", "f1"),
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("color"),
      expect.arrayContaining(["#22c55e"]),
    );
  });

  it("returns 404 when feature not found", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const res = await PUT(
      makePutRequest("l1", "nonexistent", { name: "X" }),
      makeParams("l1", "nonexistent"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 500 when DB throws", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockRejectedValueOnce(new Error("DB error"));

    const res = await PUT(
      makePutRequest("l1", "f1", { name: "X" }),
      makeParams("l1", "f1"),
    );
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/custom-layers/[id]/features/[fid]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.DATABASE_URL;
  });

  it("returns 503 when DATABASE_URL absent", async () => {
    const res = await DELETE(
      makeDeleteRequest("l1", "f1"),
      makeParams("l1", "f1"),
    );
    expect(res.status).toBe(503);
  });

  it("returns 204 when feature deleted", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: "f1" }],
      rowCount: 1,
    } as never);

    const res = await DELETE(
      makeDeleteRequest("l1", "f1"),
      makeParams("l1", "f1"),
    );
    expect(res.status).toBe(204);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("DELETE"), [
      "f1",
      "l1",
    ]);
  });

  it("returns 404 when feature not found", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const res = await DELETE(
      makeDeleteRequest("l1", "nonexistent"),
      makeParams("l1", "nonexistent"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 500 when DB throws", async () => {
    process.env.DATABASE_URL = "postgres://test";
    mockQuery.mockRejectedValueOnce(new Error("DB error"));

    const res = await DELETE(
      makeDeleteRequest("l1", "f1"),
      makeParams("l1", "f1"),
    );
    expect(res.status).toBe(500);
  });
});
