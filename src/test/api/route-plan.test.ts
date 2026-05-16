import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/route-plan/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/route-plan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const WAYPOINTS_2: [number, number][] = [
  [24.94, 60.17],
  [25.01, 60.23],
];

const MAPBOX_SUCCESS = {
  code: "Ok",
  routes: [
    {
      distance: 12400,
      duration: 910,
      geometry: {
        type: "LineString",
        coordinates: [
          [24.94, 60.17],
          [25.01, 60.23],
        ],
      },
      legs: [
        {
          distance: 12400,
          duration: 910,
          steps: [
            {
              maneuver: { instruction: "Head north" },
              distance: 340,
              duration: 42,
            },
          ],
        },
      ],
    },
  ],
};

describe("POST /api/route-plan", () => {
  const originalToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "test-token";
    global.fetch = vi.fn();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = originalToken;
    global.fetch = originalFetch;
  });

  it("returns 503 when token is missing", async () => {
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const res = await POST(
      makeRequest({ waypoints: WAYPOINTS_2, profile: "driving" }),
    );
    expect(res.status).toBe(503);
    expect(res.headers.get("X-Aurora-Warning")).toBeTruthy();
  });

  it("returns 400 when waypoints is missing", async () => {
    const res = await POST(makeRequest({ profile: "driving" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when fewer than 2 waypoints", async () => {
    const res = await POST(
      makeRequest({ waypoints: [[24.94, 60.17]], profile: "driving" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when more than 25 waypoints", async () => {
    const waypoints = Array.from(
      { length: 26 },
      (_, i) => [24 + i * 0.01, 60.0] as [number, number],
    );
    const res = await POST(makeRequest({ waypoints, profile: "driving" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when a waypoint is not a number pair", async () => {
    const res = await POST(
      makeRequest({
        waypoints: [
          ["a", "b"],
          [25.0, 60.0],
        ],
        profile: "driving",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when profile is unknown", async () => {
    const res = await POST(
      makeRequest({ waypoints: WAYPOINTS_2, profile: "flying" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when profile is missing", async () => {
    const res = await POST(makeRequest({ waypoints: WAYPOINTS_2 }));
    expect(res.status).toBe(400);
  });

  it("returns 502 when Mapbox fetch throws", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("network error"));
    const res = await POST(
      makeRequest({ waypoints: WAYPOINTS_2, profile: "driving" }),
    );
    expect(res.status).toBe(502);
  });

  it("returns 502 when Mapbox returns non-200", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ code: "ProfileNotFound" }), {
        status: 422,
      }),
    );
    const res = await POST(
      makeRequest({ waypoints: WAYPOINTS_2, profile: "driving" }),
    );
    expect(res.status).toBe(502);
  });

  it("returns 404 when Mapbox returns empty routes", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ code: "Ok", routes: [] }), { status: 200 }),
    );
    const res = await POST(
      makeRequest({ waypoints: WAYPOINTS_2, profile: "driving" }),
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 with PlannedRoute on success", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(MAPBOX_SUCCESS), { status: 200 }),
    );
    const res = await POST(
      makeRequest({ waypoints: WAYPOINTS_2, profile: "driving" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total_distance_m).toBe(12400);
    expect(body.total_duration_s).toBe(910);
    expect(body.geometry.type).toBe("LineString");
    expect(body.legs).toHaveLength(1);
    expect(body.legs[0].steps[0].instruction).toBe("Head north");
    expect(body.legs[0].steps[0].distance_m).toBe(340);
  });

  it("includes all three profiles in the Mapbox URL", async () => {
    for (const profile of ["driving", "walking", "cycling"]) {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(MAPBOX_SUCCESS), { status: 200 }),
      );
      const res = await POST(makeRequest({ waypoints: WAYPOINTS_2, profile }));
      expect(res.status).toBe(200);
      const call = vi.mocked(global.fetch).mock.calls.slice(-1)[0][0] as string;
      expect(call).toContain(`/mapbox/${profile}/`);
    }
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/route-plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
