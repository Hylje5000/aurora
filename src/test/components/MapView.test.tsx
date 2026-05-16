import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";

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

vi.mock("@/lib/milsymbol", () => ({
  createMilsymbolImage: vi.fn(() => Promise.resolve(new Image())),
}));

import MapView from "@/components/MapView";

const infraOn = {
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

  it("sets lightPreset to night after style.load fires", async () => {
    render(<MapView />);
    await fireStyleLoad();

    expect(mockSetConfigProperty).toHaveBeenCalledWith(
      "basemap",
      "lightPreset",
      "night",
    );
  });

  it("adds aoi-source, aoi-fill, and aoi-outline after style.load fires", async () => {
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
          terrain3d: false,
          hillshade: true,
          contours: true,
          landcover: true,
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
          terrain3d: false,
          hillshade: true,
          contours: true,
          landcover: true,
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

  it("shows cluster layers when at least one cell type is toggled on", async () => {
    const allOff = {
      ...infraOn,
      terrain3d: false,
      hillshade: true,
      contours: true,
      landcover: true,
      cellGSM: false,
      cellUMTS: false,
      cellLTE: false,
      cellCDMA: false,
    };
    const { rerender } = render(<MapView layerVisibility={allOff} />);
    await fireStyleLoad();
    mockSetLayoutProperty.mockClear();

    rerender(<MapView layerVisibility={{ ...allOff, cellLTE: true }} />);

    expect(mockSetLayoutProperty).toHaveBeenCalledWith(
      "cell-towers-clusters",
      "visibility",
      "visible",
    );
    expect(mockSetLayoutProperty).toHaveBeenCalledWith(
      "cell-towers-cluster-count",
      "visibility",
      "visible",
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
          terrain3d: false,
          hillshade: true,
          contours: true,
          landcover: true,
          cellGSM: true,
          cellUMTS: true,
          cellLTE: false,
          cellCDMA: true,
        }}
      />,
    );

    const lastCall =
      mockSetData.mock.calls[mockSetData.mock.calls.length - 1][0];
    expect(lastCall.features).toHaveLength(1);
    expect(lastCall.features[0].properties.radio).toBe("GSM");
  });

  it("produces empty source when all cell types are toggled off", async () => {
    mockFetchWithTowers(["GSM", "UMTS", "LTE", "CDMA"]);
    const { rerender } = render(<MapView />);
    await fireStyleLoad();
    mockSetData.mockClear();

    rerender(
      <MapView
        layerVisibility={{
          ...infraOn,
          terrain3d: false,
          hillshade: true,
          contours: true,
          landcover: true,
          cellGSM: false,
          cellUMTS: false,
          cellLTE: false,
          cellCDMA: false,
        }}
      />,
    );

    const lastCall =
      mockSetData.mock.calls[mockSetData.mock.calls.length - 1][0];
    expect(lastCall.features).toHaveLength(0);
  });

  it("restores full data when all cell types are re-enabled", async () => {
    mockFetchWithTowers(["GSM", "UMTS", "LTE", "CDMA"]);
    const allOff = {
      ...infraOn,
      terrain3d: false,
      hillshade: true,
      contours: true,
      landcover: true,
      cellGSM: false,
      cellUMTS: false,
      cellLTE: false,
      cellCDMA: false,
    };
    const { rerender } = render(<MapView layerVisibility={allOff} />);
    await fireStyleLoad();
    mockSetData.mockClear();

    rerender(
      <MapView
        layerVisibility={{
          ...allOff,
          cellGSM: true,
          cellUMTS: true,
          cellLTE: true,
          cellCDMA: true,
        }}
      />,
    );

    const lastCall =
      mockSetData.mock.calls[mockSetData.mock.calls.length - 1][0];
    expect(lastCall.features).toHaveLength(4);
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

  it("adds four per-type tower layers as symbol layers with icon-image", async () => {
    render(<MapView />);
    await fireStyleLoad();

    const cases: Array<{ id: string; radio: string }> = [
      { id: "cell-towers-gsm", radio: "GSM" },
      { id: "cell-towers-umts", radio: "UMTS" },
      { id: "cell-towers-lte", radio: "LTE" },
      { id: "cell-towers-cdma", radio: "CDMA" },
    ];

    for (const { id, radio } of cases) {
      expect(mockAddLayer).toHaveBeenCalledWith(
        expect.objectContaining({
          id,
          type: "symbol",
          filter: expect.arrayContaining([
            expect.arrayContaining(["==", expect.anything(), radio]),
          ]),
          layout: expect.objectContaining({ "icon-image": `${id}-icon` }),
        }),
      );
    }
  });

  it("registers a moveend listener after style.load", async () => {
    render(<MapView />);
    await fireStyleLoad();

    const moveendCall = mockOn.mock.calls.find(
      ([event]) => event === "moveend",
    );
    expect(moveendCall).toBeDefined();
  });

  it("fetches cell towers immediately after style.load", async () => {
    render(<MapView />);
    await fireStyleLoad();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/cell-towers?bbox="),
    );
  });

  it("calls setData on the cell-towers source after a successful fetch", async () => {
    render(<MapView />);
    await fireStyleLoad();

    expect(mockGetSource).toHaveBeenCalledWith("cell-towers-source");
    expect(mockSetData).toHaveBeenCalledWith(
      expect.objectContaining({ type: "FeatureCollection" }),
    );
  });

  it("fetches cell towers again when moveend fires", async () => {
    render(<MapView />);
    await fireStyleLoad();

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

  it("registers click, mouseenter, and mouseleave handlers for each per-type tower layer", async () => {
    render(<MapView />);
    await fireStyleLoad();

    const layerIds = [
      "cell-towers-gsm",
      "cell-towers-umts",
      "cell-towers-lte",
      "cell-towers-cdma",
    ];

    for (const layerId of layerIds) {
      expect(
        mockOn.mock.calls.some(
          ([event, layer]) => event === "click" && layer === layerId,
        ),
      ).toBe(true);
      expect(
        mockOn.mock.calls.some(
          ([event, layer]) => event === "mouseenter" && layer === layerId,
        ),
      ).toBe(true);
      expect(
        mockOn.mock.calls.some(
          ([event, layer]) => event === "mouseleave" && layer === layerId,
        ),
      ).toBe(true);
    }
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
    await fireStyleLoad();

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
    await fireStyleLoad();

    const url = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(url).toContain("bbox=20,59,22,61");
  });

  // ── Terrain & intelligence layer tests ────────────────────────────────

  it("applies military config hardening after style.load", async () => {
    render(<MapView />);
    await fireStyleLoad();

    expect(mockSetConfigProperty).toHaveBeenCalledWith(
      "basemap",
      "showPointOfInterestLabels",
      false,
    );
    expect(mockSetConfigProperty).toHaveBeenCalledWith(
      "basemap",
      "showTransitLabels",
      false,
    );
    expect(mockSetConfigProperty).toHaveBeenCalledWith(
      "basemap",
      "show3dObjects",
      false,
    );
    expect(mockSetConfigProperty).toHaveBeenCalledWith(
      "basemap",
      "colorWater",
      "#0d2137",
    );
  });

  it("adds mapbox-dem and terrain-v2 sources after style.load", async () => {
    render(<MapView />);
    await fireStyleLoad();

    expect(mockAddSource).toHaveBeenCalledWith(
      "mapbox-dem",
      expect.objectContaining({ type: "raster-dem" }),
    );
    expect(mockAddSource).toHaveBeenCalledWith(
      "terrain-v2",
      expect.objectContaining({ type: "vector" }),
    );
  });

  it("adds hillshading, landcover-military, and contour layers after style.load", async () => {
    render(<MapView />);
    await fireStyleLoad();

    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "hillshading", type: "hillshade" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "landcover-military", type: "fill" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "contours-minor", type: "line" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "contours-major", type: "line" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "contours-labels", type: "symbol" }),
    );
  });

  it("does not call setTerrain on style.load when terrain3d is false (default)", async () => {
    render(<MapView />);
    await fireStyleLoad();
    expect(mockSetTerrain).not.toHaveBeenCalled();
  });

  it("calls setTerrain on style.load when terrain3d is initially true", async () => {
    render(
      <MapView
        layerVisibility={{
          ...infraOn,
          terrain3d: true,
          hillshade: true,
          contours: true,
          landcover: true,
          cellGSM: true,
          cellUMTS: true,
          cellLTE: true,
          cellCDMA: true,
        }}
      />,
    );
    await fireStyleLoad();
    expect(mockSetTerrain).toHaveBeenCalledWith(
      expect.objectContaining({ source: "mapbox-dem", exaggeration: 1.5 }),
    );
  });

  it("calls setLayoutProperty for hillshade layer when hillshade is toggled off", async () => {
    const { rerender } = render(<MapView />);
    await fireStyleLoad();
    mockSetLayoutProperty.mockClear();

    rerender(
      <MapView
        layerVisibility={{
          ...infraOn,
          terrain3d: false,
          hillshade: false,
          contours: true,
          landcover: true,
          cellGSM: true,
          cellUMTS: true,
          cellLTE: true,
          cellCDMA: true,
        }}
      />,
    );

    expect(mockSetLayoutProperty).toHaveBeenCalledWith(
      "hillshading",
      "visibility",
      "none",
    );
  });

  it("calls setLayoutProperty for all contour layers when contours is toggled off", async () => {
    const { rerender } = render(<MapView />);
    await fireStyleLoad();
    mockSetLayoutProperty.mockClear();

    rerender(
      <MapView
        layerVisibility={{
          ...infraOn,
          terrain3d: false,
          hillshade: true,
          contours: false,
          landcover: true,
          cellGSM: true,
          cellUMTS: true,
          cellLTE: true,
          cellCDMA: true,
        }}
      />,
    );

    expect(mockSetLayoutProperty).toHaveBeenCalledWith(
      "contours-minor",
      "visibility",
      "none",
    );
    expect(mockSetLayoutProperty).toHaveBeenCalledWith(
      "contours-major",
      "visibility",
      "none",
    );
    expect(mockSetLayoutProperty).toHaveBeenCalledWith(
      "contours-labels",
      "visibility",
      "none",
    );
  });

  it("calls setTerrain(null) when terrain3d is toggled off after style.load", async () => {
    const { rerender } = render(
      <MapView
        layerVisibility={{
          ...infraOn,
          terrain3d: true,
          hillshade: true,
          contours: true,
          landcover: true,
          cellGSM: true,
          cellUMTS: true,
          cellLTE: true,
          cellCDMA: true,
        }}
      />,
    );
    await fireStyleLoad();
    mockSetTerrain.mockClear();

    rerender(
      <MapView
        layerVisibility={{
          ...infraOn,
          terrain3d: false,
          hillshade: true,
          contours: true,
          landcover: true,
          cellGSM: true,
          cellUMTS: true,
          cellLTE: true,
          cellCDMA: true,
        }}
      />,
    );

    expect(mockSetTerrain).toHaveBeenCalledWith(null);
  });

  it("calls setTerrain when terrain3d is toggled on after style.load", async () => {
    const { rerender } = render(<MapView />);
    await fireStyleLoad();
    mockSetTerrain.mockClear();

    rerender(
      <MapView
        layerVisibility={{
          ...infraOn,
          terrain3d: true,
          hillshade: true,
          contours: true,
          landcover: true,
          cellGSM: true,
          cellUMTS: true,
          cellLTE: true,
          cellCDMA: true,
        }}
      />,
    );

    expect(mockSetTerrain).toHaveBeenCalledWith(
      expect.objectContaining({ source: "mapbox-dem", exaggeration: 1.5 }),
    );
  });

  it("adds infrastructure sources on style.load", async () => {
    render(<MapView />);
    await fireStyleLoad();

    for (const id of [
      "roads-source",
      "bridges-source",
      "railways-source",
      "municipalities-source",
    ]) {
      expect(mockAddSource).toHaveBeenCalledWith(
        id,
        expect.objectContaining({ type: "geojson" }),
      );
    }
  });

  it("adds infrastructure layers on style.load", async () => {
    render(<MapView />);
    await fireStyleLoad();

    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "roads-line", type: "line" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "bridges-symbol", type: "symbol" }),
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
  });

  it("shows roads-line popup when roads-line layer is clicked", async () => {
    render(<MapView />);
    await fireStyleLoad();

    const clickHandler = mockOn.mock.calls.find(
      ([event, layer]) => event === "click" && layer === "roads-line",
    )?.[2] as ((e: Record<string, unknown>) => void) | undefined;
    expect(clickHandler).toBeDefined();

    clickHandler?.({
      features: [
        {
          properties: {
            width_cm: 650,
            lane_count: 2,
            max_mass_kg: 8000,
            max_height_cm: 420,
            has_damage: false,
            condition_text: "hyvä tai erittäin hyvä",
          },
          geometry: { type: "LineString", coordinates: [[22.1, 60.2]] },
        },
      ],
      lngLat: { lng: 22.1, lat: 60.2 },
    });

    expect(mockSetLngLat).toHaveBeenCalled();
    expect(mockSetHTML).toHaveBeenCalledWith(
      expect.stringContaining("Road Segment"),
    );
    expect(mockAddTo).toHaveBeenCalled();
  });

  it("shows bridges-symbol popup when bridges-symbol layer is clicked", async () => {
    render(<MapView />);
    await fireStyleLoad();

    const clickHandler = mockOn.mock.calls.find(
      ([event, layer]) => event === "click" && layer === "bridges-symbol",
    )?.[2] as ((e: Record<string, unknown>) => void) | undefined;
    expect(clickHandler).toBeDefined();

    clickHandler?.({
      features: [
        {
          properties: {
            name: "Alhon silta",
            code: "T-1380",
            status: "kaytossa",
            max_vehicle_mass_t: 35,
            max_combination_mass_t: 60,
          },
        },
      ],
      lngLat: { lng: 21.64, lat: 60.87 },
    });

    expect(mockSetLngLat).toHaveBeenCalled();
    expect(mockSetHTML).toHaveBeenCalledWith(
      expect.stringContaining("Alhon silta"),
    );
    expect(mockAddTo).toHaveBeenCalled();
  });
});
