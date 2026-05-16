import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act, screen } from "@testing-library/react";

const {
  mockQueryRenderedFeatures,
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
  mockDragPanDisable,
  mockDragPanEnable,
  mockFlyTo,
  MockMap,
  MockNavigationControl,
  MockPopup,
  mockPopupRemove,
  mockMarkerRemove,
  mockMarkerSetLngLat,
  mockMarkerAddTo,
  MockMarker,
} = vi.hoisted(() => {
  const mockQueryRenderedFeatures = vi.fn(() => [] as unknown[]);
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
  const mockDragPanDisable = vi.fn();
  const mockDragPanEnable = vi.fn();
  const mockFlyTo = vi.fn();

  const mockSetLngLat = vi.fn();
  const mockSetHTML = vi.fn();
  const mockAddTo = vi.fn();
  const mockPopupRemove = vi.fn();
  const MockPopup = vi.fn(() => ({
    setLngLat: mockSetLngLat.mockReturnThis(),
    setHTML: mockSetHTML.mockReturnThis(),
    addTo: mockAddTo.mockReturnThis(),
    remove: mockPopupRemove,
  }));

  const mockMarkerRemove = vi.fn();
  const mockMarkerSetLngLat = vi.fn();
  const mockMarkerAddTo = vi.fn();
  const MockMarker = vi.fn(() => ({
    setLngLat: mockMarkerSetLngLat.mockReturnThis(),
    addTo: mockMarkerAddTo.mockReturnThis(),
    remove: mockMarkerRemove,
  }));

  const MockMap = vi.fn(() => ({
    addControl: mockAddControl,
    remove: mockRemove,
    on: mockOn,
    queryRenderedFeatures: mockQueryRenderedFeatures,
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
    dragPan: { disable: mockDragPanDisable, enable: mockDragPanEnable },
    flyTo: mockFlyTo,
  }));
  const MockNavigationControl = vi.fn();
  return {
    mockQueryRenderedFeatures,
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
    mockDragPanDisable,
    mockDragPanEnable,
    mockFlyTo,
    MockMap,
    MockNavigationControl,
    MockPopup,
    mockPopupRemove,
    mockMarkerRemove,
    mockMarkerSetLngLat,
    mockMarkerAddTo,
    MockMarker,
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
    Marker: MockMarker,
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

vi.mock("@/components/ElectionPieChart", () => ({
  default: () => <div data-testid="election-pie-chart" />,
}));

import MapView from "@/components/MapView";
import type { CustomLayer } from "@/lib/customLayers";
import type { PlannedRoute, RouteHazard, Waypoint } from "@/lib/routing";

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
    mockQueryRenderedFeatures.mockReturnValue([]);
    mockPopupRemove.mockClear();
    MockMarker.mockClear();
    mockMarkerRemove.mockClear();
    mockMarkerSetLngLat.mockClear();
    mockMarkerAddTo.mockClear();
    mockDragPanDisable.mockClear();
    mockDragPanEnable.mockClear();
    mockFlyTo.mockClear();
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
    mockGetSource.mockClear();

    rerender(
      <MapView
        layerVisibility={{
          ...infraOn,
          cellLTE: false,
        }}
      />,
    );

    // Find the setData call that was made for the cell-towers-source
    const sourceCalls = mockGetSource.mock.calls as unknown as string[][];
    const towerSourceCallIndex = sourceCalls.findIndex(
      (c) => c[0] === "cell-towers-source",
    );
    expect(towerSourceCallIndex).toBeGreaterThanOrEqual(0);
    const setDataCalls = mockSetData.mock.calls as unknown as {
      features: { properties: { radio: string } }[];
    }[][];
    const towerSetDataCall = setDataCalls[towerSourceCallIndex];
    expect(towerSetDataCall[0].features).toHaveLength(1);
    expect(towerSetDataCall[0].features[0].properties.radio).toBe("GSM");
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
        id: "municipality-highlight-line",
        type: "line",
        slot: "top",
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

  it("includes demographic rows in InfoPanel when population data is present", async () => {
    const onInfoPanel = vi.fn();
    render(<MapView onInfoPanel={onInfoPanel} />);
    await fireStyleLoad();

    const clickHandler = mockOn.mock.calls.find(
      ([event, layer]) => event === "click" && layer === "municipalities-fill",
    )?.[2] as ((e: Record<string, unknown>) => void) | undefined;

    clickHandler?.({
      features: [
        {
          properties: {
            name_fi: "Parainen",
            name_sv: "Pargas",
            nat_code: "445",
            aoi_id: "turku",
            population: 15600,
            male: 7700,
            male_pct: 49.4,
            female: 7900,
            female_pct: 50.6,
            age_0_14: 2200,
            age_0_14_pct: 14.1,
            age_15_64: 9100,
            age_15_64_pct: 58.3,
            age_65plus: 4300,
            age_65plus_pct: 27.6,
            til_vuosi: 2025,
          },
        },
      ],
      lngLat: { lng: 22.1, lat: 60.5 },
    });

    const call = onInfoPanel.mock.calls[0][0] as {
      title: string;
      rows: [string, string][];
    };
    const rowLabels = call.rows.map(([label]) => label);
    expect(rowLabels).toContain("Population");
    expect(rowLabels).toContain("Male");
    expect(rowLabels).toContain("Female");
    expect(rowLabels).toContain("Under 15");
    expect(rowLabels).toContain("Over 65");
    expect(rowLabels).toContain("Data year");

    const dataYearRow = call.rows.find(([label]) => label === "Data year");
    expect(dataYearRow?.[1]).toBe("2025");
  });

  it("omits demographic rows when population is null (LEFT JOIN miss)", async () => {
    const onInfoPanel = vi.fn();
    render(<MapView onInfoPanel={onInfoPanel} />);
    await fireStyleLoad();

    const clickHandler = mockOn.mock.calls.find(
      ([event, layer]) => event === "click" && layer === "municipalities-fill",
    )?.[2] as ((e: Record<string, unknown>) => void) | undefined;

    clickHandler?.({
      features: [
        {
          properties: {
            name_fi: "TestKunta",
            name_sv: null,
            nat_code: "999",
            aoi_id: "lappi",
            population: null,
            male: null,
            female: null,
            age_0_14: null,
            age_65plus: null,
            til_vuosi: null,
          },
        },
      ],
      lngLat: { lng: 25.0, lat: 68.0 },
    });

    const call = onInfoPanel.mock.calls[0][0] as {
      rows: [string, string][];
    };
    const rowLabels = call.rows.map(([label]) => label);
    expect(rowLabels).toContain("Code");
    expect(rowLabels).toContain("Region");
    expect(rowLabels).not.toContain("Population");
    expect(rowLabels).not.toContain("Under 15");
    expect(rowLabels).not.toContain("Over 65");
  });

  it("passes ElectionPieChart as component when election_data is present", async () => {
    const onInfoPanel = vi.fn();
    render(<MapView onInfoPanel={onInfoPanel} />);
    await fireStyleLoad();

    const clickHandler = mockOn.mock.calls.find(
      ([event, layer]) => event === "click" && layer === "municipalities-fill",
    )?.[2] as ((e: Record<string, unknown>) => void) | undefined;

    clickHandler?.({
      features: [
        {
          properties: {
            name_fi: "Helsinki",
            name_sv: "Helsingfors",
            nat_code: "091",
            aoi_id: "turku",
            election_data: '{"KOK":26.4,"PS":18.2,"SDP":15.1}',
          },
        },
      ],
      lngLat: { lng: 25.0, lat: 60.2 },
    });

    const call = onInfoPanel.mock.calls[0][0] as { component: unknown };
    expect(call.component).not.toBeNull();
  });

  it("passes null component when election_data is absent", async () => {
    const onInfoPanel = vi.fn();
    render(<MapView onInfoPanel={onInfoPanel} />);
    await fireStyleLoad();

    const clickHandler = mockOn.mock.calls.find(
      ([event, layer]) => event === "click" && layer === "municipalities-fill",
    )?.[2] as ((e: Record<string, unknown>) => void) | undefined;

    clickHandler?.({
      features: [
        {
          properties: {
            name_fi: "TestKunta",
            name_sv: null,
            nat_code: "999",
            aoi_id: "lappi",
            election_data: null,
          },
        },
      ],
      lngLat: { lng: 25.0, lat: 68.0 },
    });

    const call = onInfoPanel.mock.calls[0][0] as { component: unknown };
    expect(call.component).toBeNull();
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

  // ── Elevation click tests ─────────────────────────────────────────────

  function findGeneralClickHandler() {
    // General map.on("click", handler) has 2 args; layer-specific have 3
    const call = mockOn.mock.calls.find(
      ([event, second]) => event === "click" && typeof second === "function",
    );
    return call?.[1] as ((e: unknown) => Promise<void>) | undefined;
  }

  it("registers a general click handler on the map after style.load", async () => {
    render(<MapView />);
    await fireStyleLoad();
    expect(findGeneralClickHandler()).toBeDefined();
  });

  it("fetches /api/elevation with the clicked lng/lat and opens a Popup with elevation data", async () => {
    render(<MapView />);
    await fireStyleLoad();
    MockPopup.mockClear();
    mockSetLngLat.mockClear();
    mockSetHTML.mockClear();
    mockAddTo.mockClear();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          elevation_m: 6.5,
          aoi_id: "turku",
          dist_m: 12,
        }),
    } as unknown as Response);

    const handler = findGeneralClickHandler()!;
    await act(async () => {
      await handler({ lngLat: { lng: 22.27, lat: 60.45 } });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/elevation?lng=22.270000&lat=60.450000"),
    );
    expect(MockPopup).toHaveBeenCalledTimes(1);
    expect(mockSetLngLat).toHaveBeenCalledWith([22.27, 60.45]);
    expect(mockSetHTML).toHaveBeenCalledWith(
      expect.stringContaining("Terrain Elevation"),
    );
    expect(mockSetHTML).toHaveBeenCalledWith(expect.stringContaining("6.5 m"));
    expect(mockAddTo).toHaveBeenCalled();
    expect(MockMarker).toHaveBeenCalledTimes(1);
    expect(mockMarkerSetLngLat).toHaveBeenCalledWith([22.27, 60.45]);
  });

  it("does not open a Popup or place a marker when elevation_m is null (outside AOI or too far)", async () => {
    render(<MapView />);
    await fireStyleLoad();
    MockPopup.mockClear();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ elevation_m: null }),
    } as unknown as Response);

    const handler = findGeneralClickHandler()!;
    await act(async () => {
      await handler({ lngLat: { lng: 10.0, lat: 50.0 } });
    });

    expect(MockMarker).not.toHaveBeenCalled();
    // Only pre-existing popup calls (none in this test path)
    const elevationPopupCalls = MockPopup.mock.calls.filter((args) =>
      JSON.stringify(args).includes("aurora-popup"),
    );
    expect(elevationPopupCalls).toHaveLength(0);
  });

  it("does not open a Popup when the elevation fetch throws", async () => {
    render(<MapView />);
    await fireStyleLoad();
    MockPopup.mockClear();

    global.fetch = vi.fn().mockRejectedValue(new Error("network error"));

    const handler = findGeneralClickHandler()!;
    await act(async () => {
      await handler({ lngLat: { lng: 22.27, lat: 60.45 } });
    });

    expect(MockMarker).not.toHaveBeenCalled();
    expect(MockPopup).not.toHaveBeenCalled();
  });

  it("suppresses elevation when clicking on an interactive feature layer", async () => {
    render(<MapView />);
    await fireStyleLoad();
    MockPopup.mockClear();
    MockMarker.mockClear();

    // Simulate clicking on a cell tower
    mockQueryRenderedFeatures.mockReturnValue([
      { layer: { id: "cell-towers-lte" } },
    ]);

    const handler = findGeneralClickHandler()!;
    await act(async () => {
      await handler({
        lngLat: { lng: 22.27, lat: 60.45 },
        point: { x: 100, y: 200 },
      });
    });

    expect(MockMarker).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/elevation"),
    );
  });

  it("suppresses elevation when clicking on a custom drawing layer feature", async () => {
    render(<MapView />);
    await fireStyleLoad();
    MockMarker.mockClear();

    // Simulate clicking on a custom layer
    mockQueryRenderedFeatures.mockReturnValue([
      { layer: { id: "custom-layer-abc123-fill" } },
    ]);

    const handler = findGeneralClickHandler()!;
    await act(async () => {
      await handler({
        lngLat: { lng: 22.27, lat: 60.45 },
        point: { x: 100, y: 200 },
      });
    });

    expect(MockMarker).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/elevation"),
    );
  });

  // ── Route planning tests ──────────────────────────────────────────────

  it("adds route-source and route-line layer after style.load", async () => {
    render(<MapView />);
    await fireStyleLoad();

    expect(mockAddSource).toHaveBeenCalledWith(
      "route-source",
      expect.objectContaining({ type: "geojson" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "route-line", type: "line", slot: "top" }),
    );
  });

  it("sets cursor to crosshair and disables dragPan when addingWaypoint=true", async () => {
    const canvas = {
      style: { cursor: "" },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    mockGetCanvas.mockReturnValue(canvas);

    render(<MapView addingWaypoint={true} />);
    await fireStyleLoad();

    expect(canvas.style.cursor).toBe("crosshair");
    expect(mockDragPanDisable).toHaveBeenCalled();
    expect(canvas.addEventListener).toHaveBeenCalledWith(
      "mousemove",
      expect.any(Function),
    );
  });

  it("resets cursor and re-enables dragPan when addingWaypoint=false", async () => {
    const canvas = {
      style: { cursor: "crosshair" },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    mockGetCanvas.mockReturnValue(canvas);

    const { rerender } = render(<MapView addingWaypoint={true} />);
    await fireStyleLoad();
    mockDragPanEnable.mockClear();

    rerender(<MapView addingWaypoint={false} />);
    expect(canvas.style.cursor).toBe("");
    expect(mockDragPanEnable).toHaveBeenCalled();
  });

  it("calls onWaypointClick with coords and skips elevation when addingWaypoint=true", async () => {
    const onWaypointClick = vi.fn();
    render(<MapView addingWaypoint={true} onWaypointClick={onWaypointClick} />);
    await fireStyleLoad();
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();

    const handler = findGeneralClickHandler()!;
    await act(async () => {
      await handler({ lngLat: { lng: 22.5, lat: 60.3 } });
    });

    expect(onWaypointClick).toHaveBeenCalledWith([22.5, 60.3]);
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/elevation"),
    );
  });

  it("updates route-source data when plannedRoute prop changes", async () => {
    const mockRoute: PlannedRoute = {
      geometry: {
        type: "LineString",
        coordinates: [
          [24.94, 60.17],
          [25.01, 60.23],
        ],
      },
      total_distance_m: 5000,
      total_duration_s: 300,
      legs: [],
    };

    const { rerender } = render(<MapView plannedRoute={null} />);
    await fireStyleLoad();
    mockSetData.mockClear();

    rerender(<MapView plannedRoute={mockRoute} />);

    expect(mockGetSource).toHaveBeenCalledWith("route-source");
    expect(mockSetData).toHaveBeenCalledWith(
      expect.objectContaining({ geometry: mockRoute.geometry }),
    );
  });

  it("clears route-source when plannedRoute becomes null", async () => {
    const mockRoute: PlannedRoute = {
      geometry: { type: "LineString", coordinates: [[24.94, 60.17]] },
      total_distance_m: 1000,
      total_duration_s: 60,
      legs: [],
    };

    const { rerender } = render(<MapView plannedRoute={mockRoute} />);
    await fireStyleLoad();
    mockSetData.mockClear();

    rerender(<MapView plannedRoute={null} />);

    expect(mockSetData).toHaveBeenCalledWith(
      expect.objectContaining({ type: "FeatureCollection", features: [] }),
    );
  });

  it("updates route-line color when routeProfile changes", async () => {
    const { rerender } = render(<MapView routeProfile="driving" />);
    await fireStyleLoad();
    mockSetPaintProperty.mockClear();

    rerender(<MapView routeProfile="walking" />);

    expect(mockSetPaintProperty).toHaveBeenCalledWith(
      "route-line",
      "line-color",
      "#4ade80",
    );
  });

  it("creates a Marker for each waypoint in routeWaypoints", async () => {
    const waypoints: Waypoint[] = [
      { id: "w1", label: "Start", coordinates: [24.94, 60.17] },
      { id: "w2", label: "Destination", coordinates: [25.01, 60.23] },
    ];
    MockMarker.mockClear();
    const { rerender } = render(<MapView routeWaypoints={[]} />);
    await fireStyleLoad();
    MockMarker.mockClear();

    rerender(<MapView routeWaypoints={waypoints} />);

    expect(MockMarker).toHaveBeenCalledTimes(2);
    expect(mockMarkerSetLngLat).toHaveBeenCalledWith([24.94, 60.17]);
    expect(mockMarkerSetLngLat).toHaveBeenCalledWith([25.01, 60.23]);
  });

  it("removes old waypoint markers when routeWaypoints changes", async () => {
    const waypoints: Waypoint[] = [
      { id: "w1", label: "Start", coordinates: [24.94, 60.17] },
    ];
    MockMarker.mockClear();
    const { rerender } = render(<MapView routeWaypoints={waypoints} />);
    await fireStyleLoad();
    mockMarkerRemove.mockClear();

    rerender(<MapView routeWaypoints={[]} />);

    expect(mockMarkerRemove).toHaveBeenCalled();
  });

  // ── Route hazard tests ────────────────────────────────────────────────

  it("adds route-hazards-source and three circle layers after style.load", async () => {
    render(<MapView />);
    await fireStyleLoad();

    expect(mockAddSource).toHaveBeenCalledWith(
      "route-hazards-source",
      expect.objectContaining({ type: "geojson" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "route-hazards-critical", type: "circle" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "route-hazards-warning", type: "circle" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "route-hazards-info", type: "circle" }),
    );
  });

  it("calls setData on route-hazards-source when routeHazards prop changes", async () => {
    const hazards: RouteHazard[] = [
      {
        id: "bridge-1-0",
        type: "bridge",
        severity: "critical",
        message: "Bridge vehicle limit exceeded",
        coordinates: [24.95, 60.18],
        properties: {},
      },
    ];

    const { rerender } = render(<MapView routeHazards={[]} />);
    await fireStyleLoad();
    mockSetData.mockClear();

    rerender(<MapView routeHazards={hazards} />);

    expect(mockGetSource).toHaveBeenCalledWith("route-hazards-source");
    const lastCall =
      mockSetData.mock.calls[mockSetData.mock.calls.length - 1][0];
    expect(lastCall.type).toBe("FeatureCollection");
    expect(lastCall.features).toHaveLength(1);
    expect(lastCall.features[0].properties.severity).toBe("critical");
  });

  it("calls flyTo when focusedHazard is set", async () => {
    const hazard: RouteHazard = {
      id: "road-1-0",
      type: "road",
      severity: "warning",
      message: "Recurring road damage",
      coordinates: [24.94, 60.17],
      properties: {},
    };

    const { rerender } = render(<MapView focusedHazard={null} />);
    await fireStyleLoad();

    rerender(<MapView focusedHazard={hazard} />);

    expect(mockFlyTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [24.94, 60.17], zoom: 15 }),
    );
  });

  it("places a Marker at the focused hazard coordinates", async () => {
    const hazard: RouteHazard = {
      id: "bridge-2-0",
      type: "bridge",
      severity: "critical",
      message: "Bridge limit exceeded",
      coordinates: [25.0, 60.2],
      properties: {},
    };

    MockMarker.mockClear();
    const { rerender } = render(<MapView focusedHazard={null} />);
    await fireStyleLoad();
    MockMarker.mockClear();

    rerender(<MapView focusedHazard={hazard} />);

    expect(MockMarker).toHaveBeenCalledWith(
      expect.objectContaining({ color: "#ef4444" }),
    );
    expect(mockMarkerSetLngLat).toHaveBeenCalledWith([25.0, 60.2]);
  });

  it("opens a Popup at the focused hazard coordinates", async () => {
    const hazard: RouteHazard = {
      id: "bridge-2-0",
      type: "bridge",
      severity: "critical",
      message: "Bridge limit exceeded",
      coordinates: [25.0, 60.2],
      properties: { name: "Test Bridge", max_vehicle_mass_t: 16 },
    };

    MockPopup.mockClear();
    const { rerender } = render(<MapView focusedHazard={null} />);
    await fireStyleLoad();
    MockPopup.mockClear();

    rerender(<MapView focusedHazard={hazard} />);

    expect(MockPopup).toHaveBeenCalled();
    expect(mockSetLngLat).toHaveBeenCalledWith([25.0, 60.2]);
    expect(mockSetHTML).toHaveBeenCalledWith(
      expect.stringContaining("Bridge hazard"),
    );
  });

  it("removes previous hazard focus marker and popup when focusedHazard changes", async () => {
    const hazard1: RouteHazard = {
      id: "road-1-0",
      type: "road",
      severity: "warning",
      message: "Damage",
      coordinates: [24.94, 60.17],
      properties: {},
    };
    const hazard2: RouteHazard = {
      id: "bridge-1-0",
      type: "bridge",
      severity: "critical",
      message: "Bridge limit",
      coordinates: [25.0, 60.2],
      properties: {},
    };

    MockMarker.mockClear();
    const { rerender } = render(<MapView focusedHazard={null} />);
    await fireStyleLoad();

    rerender(<MapView focusedHazard={hazard1} />);
    mockMarkerRemove.mockClear();
    mockPopupRemove.mockClear();

    rerender(<MapView focusedHazard={hazard2} />);

    expect(mockMarkerRemove).toHaveBeenCalled();
    expect(mockPopupRemove).toHaveBeenCalled();
  });
});
