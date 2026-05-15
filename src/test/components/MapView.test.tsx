import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";

const {
  mockRemove,
  mockAddControl,
  mockOn,
  mockAddSource,
  mockAddLayer,
  mockFitBounds,
  mockGetBounds,
  mockSetData,
  mockGetSource,
  mockGetCanvas,
  mockSetLngLat,
  mockSetHTML,
  mockAddTo,
  MockMap,
  MockNavigationControl,
  MockPopup,
} = vi.hoisted(() => {
  const mockRemove = vi.fn();
  const mockAddControl = vi.fn();
  const mockOn = vi.fn();
  const mockAddSource = vi.fn();
  const mockAddLayer = vi.fn();
  const mockFitBounds = vi.fn();
  const mockGetBounds = vi.fn(() => ({
    getWest: () => 20,
    getSouth: () => 59,
    getEast: () => 22,
    getNorth: () => 61,
  }));
  const mockSetData = vi.fn();
  const mockGetSource = vi.fn(() => ({ setData: mockSetData }));
  const mockGetCanvas = vi.fn(() => ({ style: { cursor: "" } }));

  const mockSetLngLat = vi.fn();
  const mockSetHTML = vi.fn();
  const mockAddTo = vi.fn();
  const MockPopup = vi.fn(() => ({
    setLngLat: mockSetLngLat.mockReturnThis(),
    setHTML: mockSetHTML.mockReturnThis(),
    addTo: mockAddTo.mockReturnThis(),
  }));

  const MockMap = vi.fn(() => ({
    addControl: mockAddControl,
    remove: mockRemove,
    on: mockOn,
    addSource: mockAddSource,
    addLayer: mockAddLayer,
    fitBounds: mockFitBounds,
    getBounds: mockGetBounds,
    getSource: mockGetSource,
    getCanvas: mockGetCanvas,
  }));
  const MockNavigationControl = vi.fn();
  return {
    mockRemove,
    mockAddControl,
    mockOn,
    mockAddSource,
    mockAddLayer,
    mockFitBounds,
    mockGetBounds,
    mockSetData,
    mockGetSource,
    mockGetCanvas,
    mockSetLngLat,
    mockSetHTML,
    mockAddTo,
    MockMap,
    MockNavigationControl,
    MockPopup,
  };
});

vi.mock("mapbox-gl", () => ({
  default: {
    Map: MockMap,
    NavigationControl: MockNavigationControl,
    Popup: MockPopup,
    accessToken: "",
  },
}));

import MapView from "@/components/MapView";

function mockFetchOk() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ type: "FeatureCollection", features: [] }),
  } as unknown as Response);
}

function fireStyleLoad() {
  const call = mockOn.mock.calls.find(([event]) => event === "style.load");
  const cb = call![1] as () => void;
  act(() => cb());
}

describe("MapView", () => {
  beforeEach(() => {
    MockMap.mockClear();
    mockAddControl.mockClear();
    mockRemove.mockClear();
    mockOn.mockClear();
    mockAddSource.mockClear();
    mockAddLayer.mockClear();
    mockFitBounds.mockClear();
    mockGetBounds.mockClear();
    mockSetData.mockClear();
    mockGetSource.mockClear();
    mockGetCanvas.mockClear();
    mockSetLngLat.mockClear();
    mockSetHTML.mockClear();
    mockAddTo.mockClear();
    MockPopup.mockClear();
    mockFetchOk();
  });

  it("renders a container div", () => {
    const { container } = render(<MapView />);
    const div = container.querySelector("div");
    expect(div).not.toBeNull();
    expect(div?.className).toContain("w-full");
    expect(div?.className).toContain("h-full");
  });

  it("initialises mapboxgl.Map once on mount", () => {
    render(<MapView center={[21.5, 60.2]} zoom={7} />);
    expect(MockMap).toHaveBeenCalledTimes(1);
    expect(MockMap).toHaveBeenCalledWith(
      expect.objectContaining({ center: [21.5, 60.2], zoom: 7 }),
    );
  });

  it("adds a NavigationControl on mount", () => {
    render(<MapView />);
    expect(mockAddControl).toHaveBeenCalledTimes(1);
    expect(mockAddControl).toHaveBeenCalledWith(
      expect.any(MockNavigationControl),
    );
  });

  it("calls map.remove() on unmount", () => {
    const { unmount } = render(<MapView />);
    act(() => unmount());
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });

  it("registers a style.load listener on mount", () => {
    render(<MapView />);
    const styleLoadCall = mockOn.mock.calls.find(
      ([event]) => event === "style.load",
    );
    expect(styleLoadCall).toBeDefined();
  });

  it("adds aoi-source, aoi-fill, and aoi-outline after style.load fires", async () => {
    render(<MapView />);
    await act(async () => fireStyleLoad());

    expect(mockAddSource).toHaveBeenCalledWith(
      "aoi-source",
      expect.objectContaining({ type: "geojson" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "aoi-fill", type: "fill" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "aoi-outline", type: "line" }),
    );
  });

  it("adds cell-towers-source with cluster:true after style.load", async () => {
    render(<MapView />);
    await act(async () => fireStyleLoad());

    expect(mockAddSource).toHaveBeenCalledWith(
      "cell-towers-source",
      expect.objectContaining({ type: "geojson", cluster: true }),
    );
  });

  it("adds cluster, cluster-count, and unclustered layers after style.load", async () => {
    render(<MapView />);
    await act(async () => fireStyleLoad());

    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "cell-towers-clusters", type: "circle" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "cell-towers-cluster-count",
        type: "symbol",
      }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "cell-towers-unclustered",
        type: "circle",
      }),
    );
  });

  it("registers a moveend listener after style.load", async () => {
    render(<MapView />);
    await act(async () => fireStyleLoad());

    const moveendCall = mockOn.mock.calls.find(
      ([event]) => event === "moveend",
    );
    expect(moveendCall).toBeDefined();
  });

  it("fetches cell towers immediately after style.load", async () => {
    render(<MapView />);
    await act(async () => fireStyleLoad());

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/cell-towers?bbox="),
    );
  });

  it("calls setData on the cell-towers source after a successful fetch", async () => {
    render(<MapView />);
    await act(async () => fireStyleLoad());

    expect(mockGetSource).toHaveBeenCalledWith("cell-towers-source");
    expect(mockSetData).toHaveBeenCalledWith(
      expect.objectContaining({ type: "FeatureCollection" }),
    );
  });

  it("fetches cell towers again when moveend fires", async () => {
    render(<MapView />);
    await act(async () => fireStyleLoad());

    const fetchCallsBefore = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls.length;

    const moveendCb = mockOn.mock.calls.find(
      ([event]) => event === "moveend",
    )![1] as () => void;
    await act(async () => moveendCb());

    expect(
      (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBeGreaterThan(fetchCallsBefore);
  });

  it("registers click, mouseenter, and mouseleave handlers for unclustered towers", async () => {
    render(<MapView />);
    await act(async () => fireStyleLoad());

    const eventNames = mockOn.mock.calls.map(([event]) => event);
    expect(eventNames).toContain("click");
    expect(eventNames).toContain("mouseenter");
    expect(eventNames).toContain("mouseleave");
  });

  it("opens a Popup when an unclustered tower is clicked", async () => {
    render(<MapView />);
    await act(async () => fireStyleLoad());

    const clickCall = mockOn.mock.calls.find(
      ([event, layer]) =>
        event === "click" && layer === "cell-towers-unclustered",
    );
    expect(clickCall).toBeDefined();

    const clickHandler = clickCall![2] as (e: unknown) => void;
    act(() =>
      clickHandler({
        features: [
          {
            properties: {
              radio: "LTE",
              aoi_id: "turku",
              range_m: 1500,
              avg_signal: -80,
            },
            geometry: { type: "Point", coordinates: [22.1, 60.2] },
          },
        ],
      }),
    );

    expect(MockPopup).toHaveBeenCalledTimes(1);
    expect(mockSetLngLat).toHaveBeenCalledWith([22.1, 60.2]);
    expect(mockSetHTML).toHaveBeenCalledWith(expect.stringContaining("LTE"));
    expect(mockAddTo).toHaveBeenCalled();
  });

  it("calls fitBounds with the correct bbox when selectedAreaId is set", () => {
    const { rerender } = render(<MapView selectedAreaId={null} />);
    expect(mockFitBounds).not.toHaveBeenCalled();

    rerender(<MapView selectedAreaId="karjala" />);
    expect(mockFitBounds).toHaveBeenCalledWith(
      [29.289551, 62.283256, 31.256104, 63.1047],
      expect.objectContaining({ padding: 60 }),
    );
  });

  it("does not call fitBounds when selectedAreaId is null", () => {
    render(<MapView selectedAreaId={null} />);
    expect(mockFitBounds).not.toHaveBeenCalled();
  });

  it("does not fetch when fetch returns a non-ok response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
    } as unknown as Response);

    render(<MapView />);
    await act(async () => fireStyleLoad());

    expect(mockSetData).not.toHaveBeenCalled();
  });

  it("does not throw when fetch rejects", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error("network error")) as typeof fetch;

    render(<MapView />);
    await expect(act(async () => fireStyleLoad())).resolves.not.toThrow();
  });

  it("bbox string uses map bounds in correct order", async () => {
    render(<MapView />);
    await act(async () => fireStyleLoad());

    const url = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(url).toContain("bbox=20,59,22,61");
  });
});
