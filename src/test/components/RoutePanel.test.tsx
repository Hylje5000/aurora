import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { createRef } from "react";
import { RoutePanel, type RoutePanelHandle } from "@/components/RoutePanel";
import type { PlannedRoute } from "@/lib/routing";

const MOCK_ROUTE: PlannedRoute = {
  geometry: {
    type: "LineString",
    coordinates: [
      [24.94, 60.17],
      [25.01, 60.23],
    ],
  },
  total_distance_m: 12400,
  total_duration_s: 910,
  legs: [
    {
      distance_m: 12400,
      duration_s: 910,
      steps: [
        { instruction: "Head north", distance_m: 340, duration_s: 42 },
        { instruction: "Turn right", distance_m: 200, duration_s: 30 },
      ],
    },
  ],
};

function makeProps(overrides = {}) {
  return {
    onAddingWaypointChange: vi.fn(),
    onRouteChange: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

describe("RoutePanel", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
  });

  it("renders without crashing", () => {
    render(<RoutePanel {...makeProps()} />);
    expect(screen.getByTestId("route-panel")).toBeInTheDocument();
  });

  it("shows the Add Stop button", () => {
    render(<RoutePanel {...makeProps()} />);
    expect(screen.getByTestId("add-stop-btn")).toBeInTheDocument();
  });

  it("calls onAddingWaypointChange(true) when Add Stop is clicked", () => {
    const onAddingWaypointChange = vi.fn();
    render(<RoutePanel {...makeProps({ onAddingWaypointChange })} />);
    fireEvent.click(screen.getByTestId("add-stop-btn"));
    expect(onAddingWaypointChange).toHaveBeenCalledWith(true);
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<RoutePanel {...makeProps({ onClose })} />);
    fireEvent.click(screen.getByLabelText("Close route panel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("adds a waypoint via the imperative ref", async () => {
    const ref = createRef<RoutePanelHandle>();
    render(<RoutePanel ref={ref} {...makeProps()} />);

    act(() => {
      ref.current?.addWaypoint([24.94, 60.17]);
    });

    expect(screen.getByTestId("waypoint-row-0")).toBeInTheDocument();
    expect(screen.getByText("Start")).toBeInTheDocument();
  });

  it("labels waypoints correctly (Start, Stop N, Destination)", async () => {
    const ref = createRef<RoutePanelHandle>();
    render(<RoutePanel ref={ref} {...makeProps()} />);

    act(() => {
      ref.current?.addWaypoint([24.94, 60.17]);
      ref.current?.addWaypoint([24.95, 60.18]);
      ref.current?.addWaypoint([24.96, 60.19]);
    });

    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.getByText("Stop 1")).toBeInTheDocument();
    expect(screen.getByText("Destination")).toBeInTheDocument();
  });

  it("removes a waypoint when × is clicked", async () => {
    const ref = createRef<RoutePanelHandle>();
    render(<RoutePanel ref={ref} {...makeProps()} />);

    act(() => {
      ref.current?.addWaypoint([24.94, 60.17]);
      ref.current?.addWaypoint([24.95, 60.18]);
    });

    fireEvent.click(screen.getByLabelText("Remove Start"));
    expect(screen.queryByTestId("waypoint-row-1")).not.toBeInTheDocument();
  });

  it("moves a waypoint up", async () => {
    const ref = createRef<RoutePanelHandle>();
    render(<RoutePanel ref={ref} {...makeProps()} />);

    act(() => {
      ref.current?.addWaypoint([24.94, 60.17]);
      ref.current?.addWaypoint([24.95, 60.18]);
    });

    // Before: row 0 = Start, row 1 = Destination
    fireEvent.click(screen.getByLabelText("Move Destination up"));
    // After: row 0 = Start (was Destination), row 1 = Destination (was Start)
    const rows = screen.getAllByTestId(/waypoint-row-/);
    expect(rows).toHaveLength(2);
  });

  it("clears all waypoints when Clear is clicked", async () => {
    const ref = createRef<RoutePanelHandle>();
    const onRouteChange = vi.fn();
    render(<RoutePanel ref={ref} {...makeProps({ onRouteChange })} />);

    act(() => {
      ref.current?.addWaypoint([24.94, 60.17]);
      ref.current?.addWaypoint([24.95, 60.18]);
    });

    fireEvent.click(screen.getByLabelText("Clear all waypoints"));
    expect(screen.queryByTestId("waypoint-row-0")).not.toBeInTheDocument();
    expect(onRouteChange).toHaveBeenCalledWith(null, "driving", []);
  });

  it("changes profile when a profile button is clicked", () => {
    render(<RoutePanel {...makeProps()} />);
    fireEvent.click(screen.getByLabelText("Walking"));
    expect(screen.getByLabelText("Walking")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("Driving")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("fetches route when 2+ waypoints are added (after debounce)", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_ROUTE), { status: 200 }),
    );

    const ref = createRef<RoutePanelHandle>();
    const onRouteChange = vi.fn();
    render(<RoutePanel ref={ref} {...makeProps({ onRouteChange })} />);

    act(() => {
      ref.current?.addWaypoint([24.94, 60.17]);
      ref.current?.addWaypoint([25.01, 60.23]);
    });

    // Advance debounce timer and flush microtasks
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/route-plan",
      expect.objectContaining({ method: "POST" }),
    );
    expect(onRouteChange).toHaveBeenCalledWith(
      expect.objectContaining({ total_distance_m: 12400 }),
      "driving",
      expect.any(Array),
    );
  });

  it("shows loading state during fetch", async () => {
    let resolveFetch!: (v: Response) => void;
    vi.mocked(global.fetch).mockReturnValueOnce(
      new Promise<Response>((r) => {
        resolveFetch = r;
      }),
    );

    const ref = createRef<RoutePanelHandle>();
    render(<RoutePanel ref={ref} {...makeProps()} />);

    act(() => {
      ref.current?.addWaypoint([24.94, 60.17]);
      ref.current?.addWaypoint([25.01, 60.23]);
    });

    // Advance debounce — fetch is now in-flight (pending)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(screen.getByTestId("route-loading")).toBeInTheDocument();

    // Resolve the fetch
    await act(async () => {
      resolveFetch(new Response(JSON.stringify(MOCK_ROUTE), { status: 200 }));
    });

    expect(screen.queryByTestId("route-loading")).not.toBeInTheDocument();
  });

  it("shows error state on failed fetch", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "No route found" }), {
        status: 404,
      }),
    );

    const ref = createRef<RoutePanelHandle>();
    render(<RoutePanel ref={ref} {...makeProps()} />);

    act(() => {
      ref.current?.addWaypoint([24.94, 60.17]);
      ref.current?.addWaypoint([25.01, 60.23]);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(screen.getByTestId("route-error")).toBeInTheDocument();
    expect(screen.getByTestId("route-error")).toHaveTextContent(
      "No route found",
    );
  });

  it("shows route summary after successful fetch", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_ROUTE), { status: 200 }),
    );

    const ref = createRef<RoutePanelHandle>();
    render(<RoutePanel ref={ref} {...makeProps()} />);

    act(() => {
      ref.current?.addWaypoint([24.94, 60.17]);
      ref.current?.addWaypoint([25.01, 60.23]);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(screen.getByTestId("route-summary")).toBeInTheDocument();
    expect(screen.getByTestId("route-summary")).toHaveTextContent("12.4 km");
  });

  it("expands and collapses a leg accordion", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_ROUTE), { status: 200 }),
    );

    const ref = createRef<RoutePanelHandle>();
    render(<RoutePanel ref={ref} {...makeProps()} />);

    act(() => {
      ref.current?.addWaypoint([24.94, 60.17]);
      ref.current?.addWaypoint([25.01, 60.23]);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(screen.getByTestId("leg-toggle-0")).toBeInTheDocument();

    // Expand
    fireEvent.click(screen.getByTestId("leg-toggle-0"));
    expect(screen.getByTestId("leg-steps-0")).toBeInTheDocument();
    expect(screen.getByText(/Head north/)).toBeInTheDocument();

    // Collapse
    fireEvent.click(screen.getByTestId("leg-toggle-0"));
    expect(screen.queryByTestId("leg-steps-0")).not.toBeInTheDocument();
  });

  it("does not fetch when fewer than 2 waypoints", async () => {
    const ref = createRef<RoutePanelHandle>();
    render(<RoutePanel ref={ref} {...makeProps()} />);

    act(() => {
      ref.current?.addWaypoint([24.94, 60.17]);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("disables Add Stop when 25 waypoints are present", async () => {
    const ref = createRef<RoutePanelHandle>();
    render(<RoutePanel ref={ref} {...makeProps()} />);

    act(() => {
      for (let i = 0; i < 25; i++) {
        ref.current?.addWaypoint([24 + i * 0.01, 60.0]);
      }
    });

    expect(screen.getByTestId("add-stop-btn")).toBeDisabled();
  });
});
