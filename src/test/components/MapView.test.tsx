import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act, screen, fireEvent } from "@testing-library/react";

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
}));

import MapView from "@/components/MapView";
import type { CustomLayer } from "@/lib/customLayers";

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

  it("initialises a MapboxDraw control on mount", () => {
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

  it("registers a milsymbol image for each radio type via map.addImage", async () => {
    render(<MapView />);
    await fireStyleLoad();

    expect(mockAddImage).toHaveBeenCalledTimes(4);
    for (const id of [
      "cell-towers-gsm-icon",
      "cell-towers-umts-icon",
      "cell-towers-lte-icon",
      "cell-towers-cdma-icon",
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

  // ── Custom layer tests ────────────────────────────────────────────────

  it("adds source and layers for each customLayer passed at init time", async () => {
    render(<MapView customLayers={[LAYER_A]} />);
    await fireStyleLoad();

    expect(mockAddSource).toHaveBeenCalledWith(
      "custom-layer-layer-a",
      expect.objectContaining({ type: "geojson" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "custom-layer-layer-a-fill" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "custom-layer-layer-a-line" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "custom-layer-layer-a-circle" }),
    );
  });

  it("registers draw.create listener after style.load", async () => {
    render(<MapView />);
    await fireStyleLoad();

    const drawCreateCall = mockOn.mock.calls.find(
      ([event]) => event === "draw.create",
    );
    expect(drawCreateCall).toBeDefined();
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

  it("deletes Draw feature immediately if no active drawing layer", async () => {
    render(<MapView />);
    await fireStyleLoad();

    const drawCreateCb = mockOn.mock.calls.find(
      ([event]) => event === "draw.create",
    )![1] as (e: { features: GeoJSON.Feature[] }) => void;

    act(() =>
      drawCreateCb({
        features: [
          {
            type: "Feature",
            id: "orphan",
            geometry: { type: "Point", coordinates: [0, 0] },
            properties: {},
          },
        ],
      }),
    );

    expect(mockDrawDelete).toHaveBeenCalledWith("orphan");
  });

  it("posts feature and refreshes source on FeatureDialog save", async () => {
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

    (global.fetch as ReturnType<typeof vi.fn>).mockClear();

    await act(async () => {
      fireEvent.change(screen.getByTestId("feature-dialog-name"), {
        target: { value: "Bravo" },
      });
      fireEvent.click(screen.getByTestId("feature-dialog-save"));
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/custom-layers/layer-a/features",
      expect.objectContaining({ method: "POST" }),
    );
    expect(screen.queryByTestId("feature-dialog")).toBeNull();
  });

  it("deletes pending Draw feature on FeatureDialog discard", async () => {
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

    await act(async () => {
      fireEvent.click(screen.getByTestId("feature-dialog-discard"));
    });

    expect(mockDrawDelete).toHaveBeenCalledWith("temp-1");
    expect(screen.queryByTestId("feature-dialog")).toBeNull();
  });

  it("fetches custom layer features when enabled", async () => {
    const { rerender } = render(<MapView customLayers={[LAYER_A]} />);
    await fireStyleLoad();
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();

    rerender(
      <MapView
        customLayers={[LAYER_A]}
        enabledCustomLayerIds={new Set(["layer-a"])}
      />,
    );
    await act(async () => {});

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/custom-layers/layer-a/features?bbox="),
    );
  });

  it("clears custom layer source data when disabled", async () => {
    const { rerender } = render(
      <MapView
        customLayers={[LAYER_A]}
        enabledCustomLayerIds={new Set(["layer-a"])}
      />,
    );
    await fireStyleLoad();
    mockSetData.mockClear();

    rerender(
      <MapView customLayers={[LAYER_A]} enabledCustomLayerIds={new Set()} />,
    );
    await act(async () => {});

    expect(mockSetData).toHaveBeenCalledWith(
      expect.objectContaining({ type: "FeatureCollection", features: [] }),
    );
  });

  it("calls draw.changeMode when activeDrawingLayerId is cleared", async () => {
    const { rerender } = render(
      <MapView customLayers={[LAYER_A]} activeDrawingLayerId="layer-a" />,
    );
    await fireStyleLoad();
    mockDrawChangeMode.mockClear();

    rerender(<MapView customLayers={[LAYER_A]} activeDrawingLayerId={null} />);

    expect(mockDrawChangeMode).toHaveBeenCalledWith("simple_select");
  });

  it("shows DrawingToolbar when activeDrawingLayerId is set", async () => {
    render(<MapView customLayers={[LAYER_A]} activeDrawingLayerId="layer-a" />);
    await fireStyleLoad();

    expect(screen.getByTestId("drawing-toolbar")).toBeTruthy();
  });

  it("does not show DrawingToolbar when activeDrawingLayerId is null", async () => {
    render(<MapView customLayers={[LAYER_A]} />);
    await fireStyleLoad();

    expect(screen.queryByTestId("drawing-toolbar")).toBeNull();
  });

  it("calls onCancelDrawing when toolbar cancel is clicked", async () => {
    const onCancelDrawing = vi.fn();
    render(
      <MapView
        customLayers={[LAYER_A]}
        activeDrawingLayerId="layer-a"
        onCancelDrawing={onCancelDrawing}
      />,
    );
    await fireStyleLoad();

    fireEvent.click(screen.getByTestId("drawing-toolbar-cancel"));
    expect(onCancelDrawing).toHaveBeenCalledOnce();
  });

  it("calls draw.trash when Delete Selected is clicked in toolbar", async () => {
    render(<MapView customLayers={[LAYER_A]} activeDrawingLayerId="layer-a" />);
    await fireStyleLoad();

    const selectionCb = mockOn.mock.calls.find(
      ([event]) => event === "draw.selectionchange",
    )![1] as (e: { features: GeoJSON.Feature[] }) => void;

    await act(async () =>
      selectionCb({
        features: [
          {
            type: "Feature",
            id: "sel-1",
            geometry: { type: "Point", coordinates: [0, 0] },
            properties: {},
          },
        ],
      }),
    );

    fireEvent.click(screen.getByTestId("drawing-toolbar-delete"));
    expect(mockDrawTrash).toHaveBeenCalledOnce();
  });
});
