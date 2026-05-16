import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { LayerKey, LayerVisibility } from "@/lib/layers";

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

// Stub MapView — exposes selectedAreaId and layerVisibility as data attributes
vi.mock("@/components/MapView", () => ({
  default: ({
    selectedAreaId,
    layerVisibility,
    onInfoPanel,
  }: {
    selectedAreaId: string | null;
    layerVisibility: LayerVisibility;
    onInfoPanel?: (data: unknown) => void;
  }) => (
    <div
      data-testid="map-view"
      data-selected={selectedAreaId ?? ""}
      data-terrain3d={String(layerVisibility?.terrain3d ?? "")}
      data-hillshade={String(layerVisibility?.hillshade ?? "")}
    >
      <button
        onClick={() => onInfoPanel?.({ title: "Test Municipality", rows: [] })}
      >
        Trigger InfoPanel
      </button>
    </div>
  ),
}));

// Stub InfoPanel
vi.mock("@/components/InfoPanel", () => ({
  default: ({ data }: { data: { title: string } | null }) =>
    data ? <div data-testid="info-panel">{data.title}</div> : null,
}));

// Stub LayerPanel — renders a button that calls onToggle("hillshade")
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

import MapWithNav from "@/components/MapWithNav";

describe("MapWithNav", () => {
  it("renders without crashing", () => {
    const { container } = render(<MapWithNav />);
    expect(container.firstChild).not.toBeNull();
  });

  it("renders AreaNav and MapView", () => {
    render(<MapWithNav />);
    expect(screen.getByTestId("area-nav")).toBeInTheDocument();
    expect(screen.getByTestId("map-view")).toBeInTheDocument();
  });

  it("starts with no area selected", () => {
    render(<MapWithNav />);
    expect(screen.getByTestId("map-view")).toHaveAttribute("data-selected", "");
  });

  it("propagates selected area from AreaNav to MapView", async () => {
    render(<MapWithNav />);
    await userEvent.click(screen.getByRole("button", { name: "Karjala" }));
    expect(screen.getByTestId("map-view")).toHaveAttribute(
      "data-selected",
      "karjala",
    );
    expect(screen.getByTestId("area-nav")).toHaveAttribute(
      "data-selected",
      "karjala",
    );
  });

  it("updates selection when a different area is clicked", async () => {
    render(<MapWithNav />);
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

  it("renders LayerPanel", () => {
    render(<MapWithNav />);
    expect(screen.getByTestId("layer-panel")).toBeInTheDocument();
  });

  it("passes default layerVisibility to MapView (hillshade on, terrain3d off)", () => {
    render(<MapWithNav />);
    const mapView = screen.getByTestId("map-view");
    expect(mapView).toHaveAttribute("data-hillshade", "true");
    expect(mapView).toHaveAttribute("data-terrain3d", "false");
  });

  it("updates MapView layerVisibility when LayerPanel toggles hillshade", async () => {
    render(<MapWithNav />);
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

  it("renders InfoPanel in the component tree (hidden when no data)", () => {
    render(<MapWithNav />);
    expect(screen.queryByTestId("info-panel")).not.toBeInTheDocument();
  });

  it("shows InfoPanel when onInfoPanel is called from MapView", async () => {
    render(<MapWithNav />);
    await userEvent.click(
      screen.getByRole("button", { name: "Trigger InfoPanel" }),
    );
    expect(screen.getByTestId("info-panel")).toBeInTheDocument();
    expect(screen.getByTestId("info-panel")).toHaveTextContent(
      "Test Municipality",
    );
  });

  it("updates MapView layerVisibility when LayerPanel toggles terrain3d", async () => {
    render(<MapWithNav />);
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
});
