import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LayerPanel from "@/components/LayerPanel";
import { DEFAULT_LAYER_VISIBILITY } from "@/lib/layers";
import type { CustomLayerPanelProps } from "@/components/CustomLayerPanel";

const defaultProps = {
  visibility: DEFAULT_LAYER_VISIBILITY,
  onToggle: vi.fn(),
  onToggleComms: vi.fn(),
};

describe("LayerPanel", () => {
  it("renders all layer toggle rows including Basemap section", () => {
    render(<LayerPanel {...defaultProps} />);
    expect(screen.getByLabelText(/Satellite View/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/3D Terrain/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hillshade/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contour Lines/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Land Cover/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Cell Towers/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^GSM$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^UMTS$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^LTE$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^CDMA$/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Coverage Circles/i)).toBeInTheDocument();
  });

  it("renders the COMMS section heading", () => {
    render(<LayerPanel {...defaultProps} />);
    expect(screen.getByText(/comms/i)).toBeInTheDocument();
  });

  it("reflects checked state from visibility prop", () => {
    render(<LayerPanel {...defaultProps} />);
    // satellite and terrain3d are false by default
    expect(screen.getByLabelText(/Satellite View/i)).not.toBeChecked();
    expect(screen.getByLabelText(/3D Terrain/i)).not.toBeChecked();
    // others are true by default
    expect(screen.getByLabelText(/Hillshade/i)).toBeChecked();
    expect(screen.getByLabelText(/Contour Lines/i)).toBeChecked();
    expect(screen.getByLabelText(/Land Cover/i)).toBeChecked();
    // Cell Towers is checked when any cell type is on (all default true)
    expect(screen.getByLabelText(/Cell Towers/i)).toBeChecked();
    // Coverage Circles is false by default
    expect(screen.getByLabelText(/Coverage Circles/i)).not.toBeChecked();
  });

  it("shows Cell Towers unchecked when all cell types are off", () => {
    const allOff = {
      ...DEFAULT_LAYER_VISIBILITY,
      cellGSM: false,
      cellUMTS: false,
      cellLTE: false,
      cellCDMA: false,
    };
    render(<LayerPanel {...defaultProps} visibility={allOff} />);
    expect(screen.getByLabelText(/Cell Towers/i)).not.toBeChecked();
  });

  it("calls onToggle with 'satellite' when Satellite View checkbox is clicked", async () => {
    const onToggle = vi.fn();
    render(
      <LayerPanel
        visibility={DEFAULT_LAYER_VISIBILITY}
        onToggle={onToggle}
        onToggleComms={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByLabelText(/Satellite View/i));
    expect(onToggle).toHaveBeenCalledWith("satellite");
  });

  it("calls onToggle with 'terrain3d' when 3D Terrain checkbox is clicked", async () => {
    const onToggle = vi.fn();
    render(
      <LayerPanel
        visibility={DEFAULT_LAYER_VISIBILITY}
        onToggle={onToggle}
        onToggleComms={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByLabelText(/3D Terrain/i));
    expect(onToggle).toHaveBeenCalledWith("terrain3d");
  });

  it("calls onToggle with 'hillshade' when Hillshade checkbox is clicked", async () => {
    const onToggle = vi.fn();
    render(
      <LayerPanel
        visibility={DEFAULT_LAYER_VISIBILITY}
        onToggle={onToggle}
        onToggleComms={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByLabelText(/Hillshade/i));
    expect(onToggle).toHaveBeenCalledWith("hillshade");
  });

  it("calls onToggle with 'contours' when Contour Lines checkbox is clicked", async () => {
    const onToggle = vi.fn();
    render(
      <LayerPanel
        visibility={DEFAULT_LAYER_VISIBILITY}
        onToggle={onToggle}
        onToggleComms={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByLabelText(/Contour Lines/i));
    expect(onToggle).toHaveBeenCalledWith("contours");
  });

  it("calls onToggle with 'landcover' when Land Cover checkbox is clicked", async () => {
    const onToggle = vi.fn();
    render(
      <LayerPanel
        visibility={DEFAULT_LAYER_VISIBILITY}
        onToggle={onToggle}
        onToggleComms={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByLabelText(/Land Cover/i));
    expect(onToggle).toHaveBeenCalledWith("landcover");
  });

  it("calls onToggleComms when Cell Towers checkbox is clicked", async () => {
    const onToggleComms = vi.fn();
    render(
      <LayerPanel
        visibility={DEFAULT_LAYER_VISIBILITY}
        onToggle={vi.fn()}
        onToggleComms={onToggleComms}
      />,
    );
    await userEvent.click(screen.getByLabelText(/Cell Towers/i));
    expect(onToggleComms).toHaveBeenCalledOnce();
  });

  it("calls onToggle with 'cellCoverageCircles' when Coverage Circles checkbox is clicked", async () => {
    const onToggle = vi.fn();
    render(
      <LayerPanel
        visibility={DEFAULT_LAYER_VISIBILITY}
        onToggle={onToggle}
        onToggleComms={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByLabelText(/Coverage Circles/i));
    expect(onToggle).toHaveBeenCalledWith("cellCoverageCircles");
  });

  it("collapses layer rows when header button is clicked", async () => {
    render(<LayerPanel {...defaultProps} />);
    // rows visible initially
    expect(screen.getByLabelText(/3D Terrain/i)).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: /toggle layer panel/i }),
    );
    // rows hidden after collapse
    expect(screen.queryByLabelText(/3D Terrain/i)).not.toBeInTheDocument();
  });

  it("expands layer rows again after second header click", async () => {
    render(<LayerPanel {...defaultProps} />);
    const btn = screen.getByRole("button", { name: /toggle layer panel/i });
    await userEvent.click(btn);
    await userEvent.click(btn);
    expect(screen.getByLabelText(/3D Terrain/i)).toBeInTheDocument();
  });

  it("renders Custom Layers section when customLayerProps is provided", () => {
    const customLayerProps: CustomLayerPanelProps = {
      layers: [
        {
          id: "layer-1",
          name: "Alpha",
          color: "#ef4444",
          description: "",
          created_at: "",
          updated_at: "",
        },
      ],
      enabledLayerIds: new Set(["layer-1"]),
      activeDrawingLayerId: null,
      onCreateLayer: vi.fn(),
      onDeleteLayer: vi.fn(),
      onToggleLayer: vi.fn(),
      onSetActiveDrawingLayer: vi.fn(),
    };
    render(
      <LayerPanel {...defaultProps} customLayerProps={customLayerProps} />,
    );
    expect(screen.getByText(/custom layers/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Toggle Alpha")).toBeInTheDocument();
    expect(screen.getByTestId("new-layer-btn")).toBeInTheDocument();
  });

  it("does not render Custom Layers section when customLayerProps is omitted", () => {
    render(<LayerPanel {...defaultProps} />);
    expect(screen.queryByText(/custom layers/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("new-layer-btn")).not.toBeInTheDocument();
  });
});
