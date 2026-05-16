import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { createRef } from "react";
import { RoutePanel, type RoutePanelHandle } from "@/components/RoutePanel";
import type { PlannedRoute, RouteIntelligence } from "@/lib/routing";

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

const MOCK_INTELLIGENCE: RouteIntelligence = {
  hazards: [
    {
      id: "bridge-1-0",
      type: "bridge",
      severity: "critical",
      message: "Bridge vehicle limit exceeded (16 t) — vehicle is 60 t",
      coordinates: [24.95, 60.18],
      properties: { name: "Test Bridge", max_vehicle_mass_t: 16 },
    },
    {
      id: "road-2-0",
      type: "road",
      severity: "warning",
      message: "Recurring road damage",
      coordinates: [24.94, 60.17],
      properties: {},
    },
  ],
  summary: { critical: 1, warning: 1, info: 0, passable: false },
};

const MOCK_INTELLIGENCE_PASSABLE: RouteIntelligence = {
  hazards: [],
  summary: { critical: 0, warning: 0, info: 0, passable: true },
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

  it("reorders waypoints via drag and drop", async () => {
    const ref = createRef<RoutePanelHandle>();
    render(<RoutePanel ref={ref} {...makeProps()} />);

    act(() => {
      ref.current?.addWaypoint([24.94, 60.17]);
      ref.current?.addWaypoint([24.95, 60.18]);
      ref.current?.addWaypoint([24.96, 60.19]);
    });

    // Drag row 0 (Start) to row 2 (Destination position)
    const row0 = screen.getByTestId("waypoint-row-0");
    const row2 = screen.getByTestId("waypoint-row-2");

    fireEvent.dragStart(row0, {
      dataTransfer: { effectAllowed: "", setData: vi.fn() },
    });
    fireEvent.dragOver(row2, {
      dataTransfer: { dropEffect: "" },
    });
    fireEvent.drop(row2, {
      dataTransfer: { dropEffect: "" },
    });
    fireEvent.dragEnd(row0);

    // After drop: original row 1 becomes Start, original row 2 becomes Stop 1, original row 0 becomes Destination
    expect(screen.getByTestId("waypoint-row-0")).toBeInTheDocument();
    expect(screen.getByTestId("waypoint-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("waypoint-row-2")).toBeInTheDocument();
    // Labels relabelled: 3 rows still present
    expect(screen.getAllByTestId(/waypoint-row-/).length).toBe(3);
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

  // --- Vehicle selector ---

  it("renders vehicle preset selector with 5 options", () => {
    render(<RoutePanel {...makeProps()} />);
    const select = screen.getByTestId("vehicle-preset-select");
    expect(select).toBeInTheDocument();
    expect(select.querySelectorAll("option")).toHaveLength(5);
  });

  it("auto-fills fields when MBT preset is selected", () => {
    render(<RoutePanel {...makeProps()} />);
    const select = screen.getByTestId("vehicle-preset-select");
    // MBT is index 3
    fireEvent.change(select, { target: { value: "3" } });
    // mass field should show 60
    const massInput = screen.getAllByRole("spinbutton")[0];
    expect(massInput).toHaveValue(60);
  });

  it("switches to Custom preset label when a field is edited", () => {
    render(<RoutePanel {...makeProps()} />);
    const select = screen.getByTestId(
      "vehicle-preset-select",
    ) as HTMLSelectElement;
    const massInput = screen.getAllByRole("spinbutton")[0];
    fireEvent.change(massInput, { target: { value: "99" } });
    // presetIndex should now be 4 (Custom)
    expect(select.value).toBe("4");
  });

  // --- Intelligence fetch ---

  it("fetches route-intelligence after route is calculated (debounced 600ms)", async () => {
    // First call: route-plan; second call: route-intelligence
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_ROUTE), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_INTELLIGENCE), { status: 200 }),
      );

    const ref = createRef<RoutePanelHandle>();
    const onHazardsChange = vi.fn();
    render(<RoutePanel ref={ref} {...makeProps({ onHazardsChange })} />);

    act(() => {
      ref.current?.addWaypoint([24.94, 60.17]);
      ref.current?.addWaypoint([25.01, 60.23]);
    });

    // Advance route debounce
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    // Advance intelligence debounce
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/route-intelligence",
      expect.objectContaining({ method: "POST" }),
    );
    expect(onHazardsChange).toHaveBeenCalledWith(
      expect.objectContaining({ hazards: expect.any(Array) }),
    );
  });

  it("renders hazard list with CRITICAL and WARNING rows after intelligence loads", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_ROUTE), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_INTELLIGENCE), { status: 200 }),
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
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(screen.getByTestId("hazard-list")).toBeInTheDocument();
    expect(
      screen.getByText(/Bridge vehicle limit exceeded/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Recurring road damage/)).toBeInTheDocument();
  });

  it("shows impassable summary when critical hazards exist", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_ROUTE), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_INTELLIGENCE), { status: 200 }),
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
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(screen.getByTestId("assessment-impassable")).toBeInTheDocument();
    expect(screen.getByTestId("assessment-impassable")).toHaveTextContent(
      "IMPASSABLE",
    );
  });

  it("shows passable summary when no critical hazards", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_ROUTE), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_INTELLIGENCE_PASSABLE), {
          status: 200,
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
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(screen.getByTestId("assessment-passable")).toBeInTheDocument();
    expect(screen.getByTestId("assessment-passable")).toHaveTextContent(
      "passable",
    );
  });

  it("calls onHazardFocus when a hazard row is clicked", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_ROUTE), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_INTELLIGENCE), { status: 200 }),
      );

    const ref = createRef<RoutePanelHandle>();
    const onHazardFocus = vi.fn();
    render(<RoutePanel ref={ref} {...makeProps({ onHazardFocus })} />);

    act(() => {
      ref.current?.addWaypoint([24.94, 60.17]);
      ref.current?.addWaypoint([25.01, 60.23]);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    fireEvent.click(screen.getByTestId("hazard-row-bridge-1-0"));
    expect(onHazardFocus).toHaveBeenCalledWith(
      expect.objectContaining({ id: "bridge-1-0", severity: "critical" }),
    );
  });

  it("clears intelligence when route is cleared", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_ROUTE), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_INTELLIGENCE), { status: 200 }),
      );

    const ref = createRef<RoutePanelHandle>();
    const onHazardsChange = vi.fn();
    render(<RoutePanel ref={ref} {...makeProps({ onHazardsChange })} />);

    act(() => {
      ref.current?.addWaypoint([24.94, 60.17]);
      ref.current?.addWaypoint([25.01, 60.23]);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    // Clear waypoints
    fireEvent.click(screen.getByLabelText("Clear all waypoints"));

    expect(onHazardsChange).toHaveBeenLastCalledWith(null);
    expect(screen.queryByTestId("route-assessment")).not.toBeInTheDocument();
  });

  // --- COMMS Coverage ---

  it("shows full-coverage message when covered_pct is 100", async () => {
    const intel: RouteIntelligence = {
      ...MOCK_INTELLIGENCE_PASSABLE,
      coverage: {
        route_length_m: 9000,
        covered_pct: 100,
        gap_count: 0,
        longest_gap_m: 0,
        gap_geometry: null,
      },
    };

    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_ROUTE), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(intel), { status: 200 }),
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
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(screen.getByTestId("coverage-section")).toBeInTheDocument();
    expect(screen.getByTestId("coverage-full")).toBeInTheDocument();
    expect(screen.getByTestId("coverage-full")).toHaveTextContent(
      "Full cellular coverage",
    );
  });

  it("shows coverage bar and gap info when route has gaps", async () => {
    const intel: RouteIntelligence = {
      ...MOCK_INTELLIGENCE_PASSABLE,
      coverage: {
        route_length_m: 9000,
        covered_pct: 67,
        gap_count: 2,
        longest_gap_m: 3200,
        gap_geometry: { type: "MultiLineString", coordinates: [] },
      },
    };

    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_ROUTE), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(intel), { status: 200 }),
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
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(screen.getByTestId("coverage-bar")).toHaveTextContent("67%");
    expect(screen.getByTestId("coverage-gaps")).toHaveTextContent("2 gaps");
    expect(screen.getByTestId("coverage-gaps")).toHaveTextContent("3.2 km");
  });

  it("shows 'No coverage data' when coverage is null", async () => {
    const intel: RouteIntelligence = {
      ...MOCK_INTELLIGENCE_PASSABLE,
      coverage: null,
    };

    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_ROUTE), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(intel), { status: 200 }),
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
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(screen.getByTestId("coverage-unavailable")).toBeInTheDocument();
    expect(screen.getByTestId("coverage-unavailable")).toHaveTextContent(
      "No coverage data",
    );
  });
});
