import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { LayerKey, LayerVisibility } from "@/lib/layers";
import type { CustomLayer } from "@/lib/customLayers";

// Stub AreaNav — renders buttons that call onSelect
vi.mock("@/components/AreaNav", () => ({
  default: ({
    selectedAreaId,
    onSelect,
  }: {
    selectedAreaId: string | null;
    onSelect: (id: string) => void;
  }) => (
    <div data-testid="area-nav" data-selected={selectedAreaId ?? ""}>
      <button onClick={() => onSelect("lappi")}>Lappi</button>
      <button onClick={() => onSelect("karjala")}>Karjala</button>
    </div>
  ),
}));

// Stub MapView — exposes props as data attributes
vi.mock("@/components/MapView", () => ({
  default: ({
    selectedAreaId,
    layerVisibility,
    customLayers,
    enabledCustomLayerIds,
    activeDrawingLayerId,
    onCancelDrawing,
  }: {
    selectedAreaId: string | null;
    layerVisibility: LayerVisibility;
    customLayers: CustomLayer[];
    enabledCustomLayerIds: Set<string>;
    activeDrawingLayerId: string | null;
    onCancelDrawing: () => void;
  }) => (
    <div
      data-testid="map-view"
      data-selected={selectedAreaId ?? ""}
      data-terrain3d={String(layerVisibility?.terrain3d ?? "")}
      data-hillshade={String(layerVisibility?.hillshade ?? "")}
      data-layer-count={String(customLayers?.length ?? 0)}
      data-enabled-count={String(enabledCustomLayerIds?.size ?? 0)}
      data-drawing-layer={activeDrawingLayerId ?? ""}
    >
      <button onClick={onCancelDrawing}>CancelDrawing</button>
    </div>
  ),
}));

// Stub LayerPanel — renders buttons that call onToggle
vi.mock("@/components/LayerPanel", () => ({
  default: ({
    onToggle,
  }: {
    visibility: LayerVisibility;
    onToggle: (key: LayerKey) => void;
  }) => (
    <div data-testid="layer-panel">
      <button onClick={() => onToggle("hillshade")}>Toggle Hillshade</button>
      <button onClick={() => onToggle("terrain3d")}>Toggle Terrain</button>
    </div>
  ),
}));

// Stub CustomLayerPanel — exposes callbacks as buttons
vi.mock("@/components/CustomLayerPanel", () => ({
  default: ({
    layers,
    enabledLayerIds,
    activeDrawingLayerId,
    onCreateLayer,
    onDeleteLayer,
    onToggleLayer,
    onSetActiveDrawingLayer,
  }: {
    layers: CustomLayer[];
    enabledLayerIds: Set<string>;
    activeDrawingLayerId: string | null;
    onCreateLayer: (name: string, color: string) => void;
    onDeleteLayer: (id: string) => void;
    onToggleLayer: (id: string) => void;
    onSetActiveDrawingLayer: (id: string | null) => void;
  }) => (
    <div
      data-testid="custom-layer-panel"
      data-layer-count={layers.length}
      data-enabled-count={enabledLayerIds.size}
      data-drawing-layer={activeDrawingLayerId ?? ""}
    >
      <button onClick={() => onCreateLayer("Test Layer", "#ef4444")}>
        CreateLayer
      </button>
      <button onClick={() => onDeleteLayer("layer-1")}>DeleteLayer</button>
      <button onClick={() => onToggleLayer("layer-1")}>ToggleLayer</button>
      <button onClick={() => onSetActiveDrawingLayer("layer-1")}>
        SetActiveLayer
      </button>
      <button onClick={() => onSetActiveDrawingLayer(null)}>
        ClearActiveLayer
      </button>
    </div>
  ),
}));

import MapWithNav from "@/components/MapWithNav";

const LAYER: CustomLayer = {
  id: "layer-1",
  name: "Alpha",
  color: "#ef4444",
  created_at: "2026-05-16T00:00:00Z",
  updated_at: "2026-05-16T00:00:00Z",
};

function mockFetchLayers(layers: CustomLayer[] = []) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(layers),
    status: 200,
  } as unknown as Response);
}

describe("MapWithNav", () => {
  beforeEach(() => {
    mockFetchLayers();
  });

  it("renders without crashing", async () => {
    const { container } = render(<MapWithNav />);
    await act(async () => {});
    expect(container.firstChild).not.toBeNull();
  });

  it("renders AreaNav, MapView, LayerPanel, and CustomLayerPanel", async () => {
    render(<MapWithNav />);
    await act(async () => {});
    expect(screen.getByTestId("area-nav")).toBeInTheDocument();
    expect(screen.getByTestId("map-view")).toBeInTheDocument();
    expect(screen.getByTestId("layer-panel")).toBeInTheDocument();
    expect(screen.getByTestId("custom-layer-panel")).toBeInTheDocument();
  });

  it("starts with no area selected", async () => {
    render(<MapWithNav />);
    await act(async () => {});
    expect(screen.getByTestId("map-view")).toHaveAttribute("data-selected", "");
  });

  it("propagates selected area from AreaNav to MapView", async () => {
    render(<MapWithNav />);
    await act(async () => {});
    await userEvent.click(screen.getByRole("button", { name: "Karjala" }));
    expect(screen.getByTestId("map-view")).toHaveAttribute(
      "data-selected",
      "karjala",
    );
  });

  it("updates selection when a different area is clicked", async () => {
    render(<MapWithNav />);
    await act(async () => {});
    await userEvent.click(screen.getByRole("button", { name: "Lappi" }));
    expect(screen.getByTestId("map-view")).toHaveAttribute(
      "data-selected",
      "lappi",
    );
    await userEvent.click(screen.getByRole("button", { name: "Karjala" }));
    expect(screen.getByTestId("map-view")).toHaveAttribute(
      "data-selected",
      "karjala",
    );
  });

  it("passes default layerVisibility to MapView (hillshade on, terrain3d off)", async () => {
    render(<MapWithNav />);
    await act(async () => {});
    const mapView = screen.getByTestId("map-view");
    expect(mapView).toHaveAttribute("data-hillshade", "true");
    expect(mapView).toHaveAttribute("data-terrain3d", "false");
  });

  it("updates MapView layerVisibility when LayerPanel toggles hillshade", async () => {
    render(<MapWithNav />);
    await act(async () => {});
    expect(screen.getByTestId("map-view")).toHaveAttribute(
      "data-hillshade",
      "true",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Toggle Hillshade" }),
    );
    expect(screen.getByTestId("map-view")).toHaveAttribute(
      "data-hillshade",
      "false",
    );
  });

  it("updates MapView layerVisibility when LayerPanel toggles terrain3d", async () => {
    render(<MapWithNav />);
    await act(async () => {});
    expect(screen.getByTestId("map-view")).toHaveAttribute(
      "data-terrain3d",
      "false",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Toggle Terrain" }),
    );
    expect(screen.getByTestId("map-view")).toHaveAttribute(
      "data-terrain3d",
      "true",
    );
  });

  it("fetches custom layers on mount and passes to CustomLayerPanel", async () => {
    mockFetchLayers([LAYER]);
    render(<MapWithNav />);
    await act(async () => {});
    expect(screen.getByTestId("custom-layer-panel")).toHaveAttribute(
      "data-layer-count",
      "1",
    );
    expect(screen.getByTestId("map-view")).toHaveAttribute(
      "data-layer-count",
      "1",
    );
  });

  it("adds a layer to state when CreateLayer is clicked", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(LAYER),
      } as unknown as Response);

    render(<MapWithNav />);
    await act(async () => {});

    await act(async () => {
      await userEvent.click(
        screen.getByRole("button", { name: "CreateLayer" }),
      );
    });

    expect(screen.getByTestId("custom-layer-panel")).toHaveAttribute(
      "data-layer-count",
      "1",
    );
  });

  it("removes layer from state when DeleteLayer is clicked", async () => {
    mockFetchLayers([LAYER]);
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([LAYER]),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
      } as unknown as Response);

    render(<MapWithNav />);
    await act(async () => {});

    expect(screen.getByTestId("custom-layer-panel")).toHaveAttribute(
      "data-layer-count",
      "1",
    );

    await act(async () => {
      await userEvent.click(
        screen.getByRole("button", { name: "DeleteLayer" }),
      );
    });

    expect(screen.getByTestId("custom-layer-panel")).toHaveAttribute(
      "data-layer-count",
      "0",
    );
  });

  it("toggles layer in enabledCustomLayerIds when ToggleLayer is clicked", async () => {
    render(<MapWithNav />);
    await act(async () => {});

    expect(screen.getByTestId("map-view")).toHaveAttribute(
      "data-enabled-count",
      "0",
    );
    await userEvent.click(screen.getByRole("button", { name: "ToggleLayer" }));
    expect(screen.getByTestId("map-view")).toHaveAttribute(
      "data-enabled-count",
      "1",
    );
    await userEvent.click(screen.getByRole("button", { name: "ToggleLayer" }));
    expect(screen.getByTestId("map-view")).toHaveAttribute(
      "data-enabled-count",
      "0",
    );
  });

  it("sets activeDrawingLayerId when SetActiveLayer is clicked", async () => {
    render(<MapWithNav />);
    await act(async () => {});

    await userEvent.click(
      screen.getByRole("button", { name: "SetActiveLayer" }),
    );
    expect(screen.getByTestId("map-view")).toHaveAttribute(
      "data-drawing-layer",
      "layer-1",
    );
  });

  it("clears activeDrawingLayerId when ClearActiveLayer is clicked", async () => {
    render(<MapWithNav />);
    await act(async () => {});

    await userEvent.click(
      screen.getByRole("button", { name: "SetActiveLayer" }),
    );
    expect(screen.getByTestId("map-view")).toHaveAttribute(
      "data-drawing-layer",
      "layer-1",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "ClearActiveLayer" }),
    );
    expect(screen.getByTestId("map-view")).toHaveAttribute(
      "data-drawing-layer",
      "",
    );
  });

  it("clears activeDrawingLayerId when MapView calls onCancelDrawing", async () => {
    render(<MapWithNav />);
    await act(async () => {});

    await userEvent.click(
      screen.getByRole("button", { name: "SetActiveLayer" }),
    );
    expect(screen.getByTestId("map-view")).toHaveAttribute(
      "data-drawing-layer",
      "layer-1",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "CancelDrawing" }),
    );
    expect(screen.getByTestId("map-view")).toHaveAttribute(
      "data-drawing-layer",
      "",
    );
  });
});
