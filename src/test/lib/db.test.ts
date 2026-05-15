import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPoolQuery = vi.fn();
const MockPool = vi.fn(() => ({ query: mockPoolQuery }));

vi.mock("pg", () => ({ Pool: MockPool }));

describe("db singleton", () => {
  beforeEach(() => {
    vi.resetModules();
    delete (globalThis as Record<string, unknown>)._pgPool;
    MockPool.mockClear();
  });

  it("creates a Pool with the DATABASE_URL connection string", async () => {
    process.env.DATABASE_URL = "postgres://test-host/testdb";
    await import("@/lib/db");
    expect(MockPool).toHaveBeenCalledWith({
      connectionString: "postgres://test-host/testdb",
    });
    delete process.env.DATABASE_URL;
  });

  it("reuses the same Pool instance on repeated imports (singleton guard)", async () => {
    await import("@/lib/db");
    await import("@/lib/db");
    expect(MockPool).toHaveBeenCalledTimes(1);
  });

  it("query delegates to pool.query with the correct arguments", async () => {
    const { query } = await import("@/lib/db");
    mockPoolQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await query("SELECT 1", [42]);

    expect(mockPoolQuery).toHaveBeenCalledWith("SELECT 1", [42]);
  });
});
