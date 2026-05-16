import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act, screen } from "@testing-library/react";

const {
  mockRemove,
  mockAddControl,
  mockOn,
  mockAddSource,
  mockAddLayer,
  mockAddImage,
  mockFitBounds,
  mockGetBounds,
  mockSetData,
  mockGetSource,
  mockGetCanvas,
  mockSetConfigProperty,
  mockSetLayoutProperty,
  mockSetTerrain,
  mockSetLngLat,
  mockSetHTML,
  mockAddTo,
  mockRemoveLayer,
  mockRemoveSource,
  mockSetStyle,
  mockSetPaintProperty,
  mockGetZoom,
  MockMap,
  MockNavigationControl,
  MockPopup,
} = vi.hoisted(() => {
  const mockRemove = vi.fn();
  const mockAddControl = vi.fn();
  const mockOn = vi.fn();
  const mockAddSource = vi.fn();
  const mockAddLayer = vi.fn();
  const mockAddImage = vi.fn();
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
  const mockSetConfigProperty = vi.fn();
  const mockSetLayoutProperty = vi.fn();
  const mockSetTerrain = vi.fn();
  const mockRemoveLayer = vi.fn();
  const mockRemoveSource = vi.fn();
  const mockGetStyle = vi.fn(() => ({
    url: "mapbox://styles/mapbox/standard",
    sprite: "standard",
  }));
  const mockSetStyle = vi.fn();
  const mockSetPaintProperty = vi.fn();
  const mockGetZoom = vi.fn(() => 15);

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
    addImage: mockAddImage,
    fitBounds: mockFitBounds,
    getBounds: mockGetBounds,
    getSource: mockGetSource,
    getCanvas: mockGetCanvas,
    setConfigProperty: mockSetConfigProperty,
    setLayoutProperty: mockSetLayoutProperty,
    setTerrain: mockSetTerrain,
    removeLayer: mockRemoveLayer,
    removeSource: mockRemoveSource,
    getStyle: mockGetStyle,
    setStyle: mockSetStyle,
    setPaintProperty: mockSetPaintProperty,
    getZoom: mockGetZoom,
  }));
  const MockNavigationControl = vi.fn();
  return {
    mockRemove,
    mockAddControl,
    mockOn,
    mockAddSource,
    mockAddLayer,
    mockAddImage,
    mockFitBounds,
    mockGetBounds,
    mockSetData,
    mockGetSource,
    mockGetCanvas,
    mockSetConfigProperty,
    mockSetLayoutProperty,
    mockSetTerrain,
    mockSetLngLat,
    mockSetHTML,
    mockAddTo,
    mockRemoveLayer,
    mockRemoveSource,
    mockGetStyle,
    mockSetStyle,
    mockSetPaintProperty,
    mockGetZoom,
    MockMap,
    MockNavigationControl,
    MockPopup,
  };
});

const { mockDrawChangeMode, mockDrawDelete, mockDrawTrash, MockMapboxDraw } =
  vi.hoisted(() => {
    const mockDrawChangeMode = vi.fn();
    const mockDrawDelete = vi.fn();
    const mockDrawTrash = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const MockMapboxDraw: any = vi.fn(() => ({
      changeMode: mockDrawChangeMode,
      delete: mockDrawDelete,
      trash: mockDrawTrash,
    }));
    MockMapboxDraw.modes = {
      DRAW_LINE_STRING: "draw_line_string",
      DRAW_POLYGON: "draw_polygon",
      DRAW_POINT: "draw_point",
      SIMPLE_SELECT: "simple_select",
      DIRECT_SELECT: "direct_select",
      STATIC: "static",
    };
    return {
      mockDrawChangeMode,
      mockDrawDelete,
      mockDrawTrash,
      MockMapboxDraw,
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

vi.mock("@mapbox/mapbox-gl-draw", () => ({ default: MockMapboxDraw }));
vi.mock("mapbox-gl-draw-rectangle-mode", () => ({ default: {} }));
vi.mock("@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css", () => ({}));

vi.mock("@/lib/milsymbol", () => ({
  createMilsymbolImage: vi.fn(() => Promise.resolve(new Image())),
  ensureMilsymbolImages: vi.fn(() => Promise.resolve()),
}));

import MapView from "@/components/MapView";
import type { CustomLayer } from "@/lib/customLayers";

const infraOn = {
  satellite: false,
  terrain3d: false,
  hillshade: true,
  contours: true,
  landcover: true,
  cellGSM: true,
  cellUMTS: true,
  cellLTE: true,
  cellCDMA: true,
  roads: true,
  bridges: true,
  railways: true,
  municipalities: false,
};

function mockFetchOk() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ type: "FeatureCollection", features: [] }),
  } as unknown as Response);
}

function mockFetchWithTowers(radios: string[]) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        type: "FeatureCollection",
        features: radios.map((radio) => ({
          type: "Feature",
          properties: { radio },
          geometry: { type: "Point", coordinates: [0, 0] },
        })),
      }),
  } as unknown as Response);
}

async function fireStyleLoad() {
  const call = mockOn.mock.calls.find(([event]) => event === "style.load");
  const cb = call![1] as () => Promise<void>;
  await act(async () => {
    await cb();
  });
}

const LAYER_A: CustomLayer = {
  id: "layer-a",
  name: "Alpha",
  color: "#ef4444",
  created_at: "2026-05-16T00:00:00Z",
  updated_at: "2026-05-16T00:00:00Z",
};

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
    mockSetConfigProperty.mockClear();
    mockSetLayoutProperty.mockClear();
    mockSetTerrain.mockClear();
    mockAddImage.mockClear();
    mockSetLngLat.mockClear();
    mockSetHTML.mockClear();
    mockAddTo.mockClear();
    mockSetPaintProperty.mockClear();
    mockGetZoom.mockClear();
    MockPopup.mockClear();
    mockRemoveLayer.mockClear();
    mockRemoveSource.mockClear();
    MockMapboxDraw.mockClear();
    mockDrawChangeMode.mockClear();
    mockDrawDelete.mockClear();
    mockDrawTrash.mockClear();
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

  it("adds NavigationControl and MapboxDraw on mount", () => {
    render(<MapView />);
    expect(MockMapboxDraw).toHaveBeenCalledTimes(1);
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

  it("sets lightPreset to night after style.load fires", async () => {
    render(<MapView />);
    await fireStyleLoad();

    expect(mockSetConfigProperty).toHaveBeenCalledWith(
      "basemap",
      "lightPreset",
      "night",
    );
  });

  it("adds aoi-source, fill, and multiple outline layers after style.load fires", async () => {
    render(<MapView />);
    await fireStyleLoad();

    expect(mockAddSource).toHaveBeenCalledWith(
      "aoi-source",
      expect.objectContaining({ type: "geojson" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "aoi-fill", type: "fill" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "aoi-outline-glow", type: "line" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "aoi-outline", type: "line" }),
    );
  });

  it("adds cell-towers-source with cluster:true after style.load", async () => {
    render(<MapView />);
    await fireStyleLoad();

    expect(mockAddSource).toHaveBeenCalledWith(
      "cell-towers-source",
      expect.objectContaining({ type: "geojson", cluster: true }),
    );
  });

  it("adds cluster and cluster-count layers after style.load", async () => {
    render(<MapView />);
    await fireStyleLoad();

    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "cell-towers-clusters", type: "circle" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "cell-towers-cluster-count",
        type: "symbol",
      }),
    );
  });

  it("cluster layers start visible when cell types are on (default)", async () => {
    render(<MapView />);
    await fireStyleLoad();

    const clusterLayer = mockAddLayer.mock.calls.find(
      ([l]) => l.id === "cell-towers-clusters",
    )?.[0];
    const countLayer = mockAddLayer.mock.calls.find(
      ([l]) => l.id === "cell-towers-cluster-count",
    )?.[0];
    expect(clusterLayer?.layout?.visibility).toBe("visible");
    expect(countLayer?.layout?.visibility).toBe("visible");
  });

  it("cluster layers start hidden when all cell types are off", async () => {
    render(
      <MapView
        layerVisibility={{
          ...infraOn,
          cellGSM: false,
          cellUMTS: false,
          cellLTE: false,
          cellCDMA: false,
        }}
      />,
    );
    await fireStyleLoad();

    const clusterLayer = mockAddLayer.mock.calls.find(
      ([l]) => l.id === "cell-towers-clusters",
    )?.[0];
    const countLayer = mockAddLayer.mock.calls.find(
      ([l]) => l.id === "cell-towers-cluster-count",
    )?.[0];
    expect(clusterLayer?.layout?.visibility).toBe("none");
    expect(countLayer?.layout?.visibility).toBe("none");
  });

  it("hides cluster layers when all cell types are toggled off", async () => {
    const { rerender } = render(<MapView />);
    await fireStyleLoad();
    mockSetLayoutProperty.mockClear();

    rerender(
      <MapView
        layerVisibility={{
          ...infraOn,
          cellGSM: false,
          cellUMTS: false,
          cellLTE: false,
          cellCDMA: false,
        }}
      />,
    );

    expect(mockSetLayoutProperty).toHaveBeenCalledWith(
      "cell-towers-clusters",
      "visibility",
      "none",
    );
    expect(mockSetLayoutProperty).toHaveBeenCalledWith(
      "cell-towers-cluster-count",
      "visibility",
      "none",
    );
  });

  it("filters source data by enabled types when a cell type is toggled off", async () => {
    mockFetchWithTowers(["GSM", "LTE", "LTE"]);
    const { rerender } = render(<MapView />);
    await fireStyleLoad();
    mockSetData.mockClear();

    rerender(
      <MapView
        layerVisibility={{
          ...infraOn,
          cellLTE: false,
        }}
      />,
    );

    const lastCall =
      mockSetData.mock.calls[mockSetData.mock.calls.length - 1][0];
    expect(lastCall.features).toHaveLength(1);
    expect(lastCall.features[0].properties.radio).toBe("GSM");
  });

  it("registers milsymbol images for cell tower types and bridge icons via map.addImage", async () => {
    render(<MapView />);
    await fireStyleLoad();

    // 4 cell tower icons + 2 bridge icons (active/inactive)
    expect(mockAddImage).toHaveBeenCalledTimes(6);
    for (const id of [
      "cell-towers-gsm-icon",
      "cell-towers-umts-icon",
      "cell-towers-lte-icon",
      "cell-towers-cdma-icon",
      "bridge-active",
      "bridge-inactive",
    ]) {
      expect(mockAddImage).toHaveBeenCalledWith(id, expect.any(Image));
    }
  });

  it("fetches cell towers and infrastructure immediately after style.load", async () => {
    render(<MapView />);
    await fireStyleLoad();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/cell-towers?bbox="),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/roads?bbox="),
    );
  });

  it("opens a Popup when a per-type tower is clicked", async () => {
    render(<MapView />);
    await fireStyleLoad();

    const clickCall = mockOn.mock.calls.find(
      ([event, layer]) => event === "click" && layer === "cell-towers-lte",
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
    rerender(<MapView selectedAreaId="karjala" />);
    expect(mockFitBounds).toHaveBeenCalledWith(
      [29.289551, 62.283256, 31.256104, 63.1047],
      expect.objectContaining({ padding: 60 }),
    );
  });

  // ── Infrastructure layer tests ──────────────────────────────────────────

  it("adds infrastructure sources and layers on style.load", async () => {
    render(<MapView />);
    await fireStyleLoad();

    for (const id of [
      "roads-source",
      "bridges-source",
      "railways-source",
      "municipalities-source",
      "municipality-highlight-source",
    ]) {
      expect(mockAddSource).toHaveBeenCalledWith(
        id,
        expect.objectContaining({ type: "geojson" }),
      );
    }
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "roads-line", type: "line", minzoom: 12 }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "bridges-symbol",
        type: "symbol",
        minzoom: 12,
      }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "railways-line", type: "line" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "municipalities-fill", type: "fill" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "municipalities-outline", type: "line" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "municipality-highlight-casing",
        type: "line",
      }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "municipality-highlight-line",
        type: "line",
      }),
    );
  });

  it("shows roads-line popup when roads-line layer is clicked", async () => {
    render(<MapView />);
    await fireStyleLoad();

    const clickHandler = mockOn.mock.calls.find(
      ([event, layer]) => event === "click" && layer === "roads-line",
    )?.[2] as ((e: Record<string, unknown>) => void) | undefined;

    act(() => {
      clickHandler?.({
        features: [
          {
            properties: {
              width_cm: 650,
              lane_count: 2,
            },
            geometry: { type: "LineString", coordinates: [[22.1, 60.2]] },
          },
        ],
        lngLat: { lng: 22.1, lat: 60.2 },
      });
    });

    expect(mockSetHTML).toHaveBeenCalledWith(
      expect.stringContaining("Road Segment"),
    );
  });

  it("calls onInfoPanel (not Popup) when municipalities-fill is clicked", async () => {
    const onInfoPanel = vi.fn();
    render(<MapView onInfoPanel={onInfoPanel} />);
    await fireStyleLoad();

    const clickHandler = mockOn.mock.calls.find(
      ([event, layer]) => event === "click" && layer === "municipalities-fill",
    )?.[2] as ((e: Record<string, unknown>) => void) | undefined;
    expect(clickHandler).toBeDefined();

    clickHandler?.({
      features: [
        {
          properties: {
            name_fi: "Rusko",
            name_sv: "Rusko",
            nat_code: "704",
            aoi_id: "turku",
          },
        },
      ],
      lngLat: { lng: 22.1, lat: 60.5 },
    });

    expect(onInfoPanel).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Rusko / Rusko" }),
    );
    expect(MockPopup).not.toHaveBeenCalled();
  });

  it("clicking municipalities-fill updates highlight source and starts animation", async () => {
    render(<MapView onInfoPanel={vi.fn()} />);
    await fireStyleLoad();
    mockSetData.mockClear();

    const clickHandler = mockOn.mock.calls.find(
      ([event, layer]) => event === "click" && layer === "municipalities-fill",
    )?.[2] as ((e: Record<string, unknown>) => void) | undefined;
    expect(clickHandler).toBeDefined();

    clickHandler?.({
      features: [
        {
          properties: {
            name_fi: "Rusko",
            name_sv: null,
            nat_code: "704",
            aoi_id: "turku",
          },
          geometry: { type: "Polygon", coordinates: [] },
        },
      ],
      lngLat: { lng: 22.1, lat: 60.5 },
    });

    expect(mockGetSource).toHaveBeenCalledWith("municipality-highlight-source");
    expect(mockSetData).toHaveBeenCalledWith(
      expect.objectContaining({ type: "FeatureCollection" }),
    );
  });

  it("clears highlight source when infoPanelOpen transitions to false", async () => {
    const { rerender } = render(<MapView infoPanelOpen={true} />);
    await fireStyleLoad();
    mockSetData.mockClear();

    rerender(<MapView infoPanelOpen={false} />);

    expect(mockGetSource).toHaveBeenCalledWith("municipality-highlight-source");
    expect(mockSetData).toHaveBeenCalledWith(
      expect.objectContaining({ type: "FeatureCollection", features: [] }),
    );
  });

  it("does not fetch roads or bridges on style.load when zoom < 12", async () => {
    mockGetZoom.mockReturnValue(7);
    render(<MapView />);
    await fireStyleLoad();

    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map(
      ([url]) => url as string,
    );
    expect(calls.some((u) => u.includes("/api/roads"))).toBe(false);
    expect(calls.some((u) => u.includes("/api/bridges"))).toBe(false);
    expect(calls.some((u) => u.includes("/api/railways"))).toBe(true);
  });

  it("fetches roads and bridges on style.load when zoom >= 12", async () => {
    mockGetZoom.mockReturnValue(14);
    render(<MapView />);
    await fireStyleLoad();

    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map(
      ([url]) => url as string,
    );
    expect(calls.some((u) => u.includes("/api/roads"))).toBe(true);
    expect(calls.some((u) => u.includes("/api/bridges"))).toBe(true);
  });

  it("shows bridges-symbol popup when bridges-symbol layer is clicked", async () => {
    render(<MapView />);
    await fireStyleLoad();

    const clickHandler = mockOn.mock.calls.find(
      ([event, layer]) => event === "click" && layer === "bridges-symbol",
    )?.[2] as ((e: Record<string, unknown>) => void) | undefined;

    act(() => {
      clickHandler?.({
        features: [
          {
            properties: {
              name: "Test Bridge",
              code: "B123",
              status: "kaytossa",
            },
            geometry: { type: "Point", coordinates: [22.1, 60.2] },
          },
        ],
        lngLat: { lng: 22.1, lat: 60.2 },
      });
    });

    expect(mockSetHTML).toHaveBeenCalledWith(
      expect.stringContaining("Test Bridge"),
    );
  });

  // ── Custom layer tests ────────────────────────────────────────────────

  it("adds source and layers for each customLayer passed at init time", async () => {
    render(<MapView customLayers={[LAYER_A]} />);
    await fireStyleLoad();

    expect(mockAddSource).toHaveBeenCalledWith(
      "custom-layer-layer-a",
      expect.objectContaining({ type: "geojson" }),
    );
  });

  it("opens FeatureDialog when draw.create fires with an active drawing layer", async () => {
    render(<MapView customLayers={[LAYER_A]} activeDrawingLayerId="layer-a" />);
    await fireStyleLoad();

    const drawCreateCb = mockOn.mock.calls.find(
      ([event]) => event === "draw.create",
    )![1] as (e: { features: GeoJSON.Feature[] }) => void;

    await act(async () =>
      drawCreateCb({
        features: [
          {
            type: "Feature",
            id: "temp-1",
            geometry: { type: "Polygon", coordinates: [[]] },
            properties: {},
          },
        ],
      }),
    );

    expect(screen.getByTestId("feature-dialog")).toBeTruthy();
  });

  it("calls setStyle when satellite visibility changes", async () => {
    const { rerender } = render(<MapView />);
    await fireStyleLoad();
    mockSetStyle.mockClear();

    rerender(
      <MapView
        layerVisibility={{
          ...infraOn,
          satellite: true,
        }}
      />,
    );

    expect(mockSetStyle).toHaveBeenCalledWith(
      "mapbox://styles/mapbox/satellite-streets-v12",
    );
  });
});
