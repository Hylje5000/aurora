import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MapToolbar from "@/components/MapToolbar";

const defaultProps = {
  activeTool: "grab" as const,
  onToolChange: vi.fn(),
  measurement: null,
  activeDrawingLayerId: null,
  activeDrawingLayerName: undefined,
  activeDrawingTool: null,
  onDrawToolChange: vi.fn(),
  onCancelDrawing: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MapToolbar", () => {
  it("renders four standard tool buttons", () => {
    render(<MapToolbar {...defaultProps} />);
    expect(screen.getByTestId("tool-btn-grab")).toBeInTheDocument();
    expect(screen.getByTestId("tool-btn-click")).toBeInTheDocument();
    expect(screen.getByTestId("tool-btn-measure-distance")).toBeInTheDocument();
    expect(screen.getByTestId("tool-btn-measure-area")).toBeInTheDocument();
  });

  it("active tool has aria-pressed=true", () => {
    render(<MapToolbar {...defaultProps} activeTool="click" />);
    expect(screen.getByTestId("tool-btn-click")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("tool-btn-grab")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onToolChange when a tool is clicked", () => {
    const onToolChange = vi.fn();
    render(<MapToolbar {...defaultProps} onToolChange={onToolChange} />);
    fireEvent.click(screen.getByTestId("tool-btn-click"));
    expect(onToolChange).toHaveBeenCalledWith("click");
  });

  it("does not render draw section when activeDrawingLayerId is null", () => {
    render(<MapToolbar {...defaultProps} activeDrawingLayerId={null} />);
    expect(screen.queryByTestId("draw-btn-point")).not.toBeInTheDocument();
    expect(screen.queryByTestId("draw-cancel")).not.toBeInTheDocument();
  });

  it("renders draw section when activeDrawingLayerId is set", () => {
    render(
      <MapToolbar
        {...defaultProps}
        activeDrawingLayerId="layer-1"
        activeDrawingLayerName="Alpha"
      />,
    );
    expect(screen.getByTestId("draw-btn-point")).toBeInTheDocument();
    expect(screen.getByTestId("draw-btn-line")).toBeInTheDocument();
    expect(screen.getByTestId("draw-btn-polygon")).toBeInTheDocument();
    expect(screen.getByTestId("draw-btn-rectangle")).toBeInTheDocument();
    expect(screen.getByTestId("draw-cancel")).toBeInTheDocument();
  });

  it("does not render colour swatches or delete button in draw section", () => {
    render(
      <MapToolbar
        {...defaultProps}
        activeDrawingLayerId="layer-1"
        activeDrawingLayerName="Alpha"
      />,
    );
    expect(
      screen.queryByTestId("draw-colour-palette"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("draw-delete-selected"),
    ).not.toBeInTheDocument();
  });

  it("shows layer name in draw section", () => {
    render(
      <MapToolbar
        {...defaultProps}
        activeDrawingLayerId="layer-1"
        activeDrawingLayerName="Bravo"
      />,
    );
    expect(screen.getByTestId("draw-layer-name")).toHaveTextContent("Bravo");
  });

  it("draw tool button calls onDrawToolChange", () => {
    const onDrawToolChange = vi.fn();
    render(
      <MapToolbar
        {...defaultProps}
        activeDrawingLayerId="layer-1"
        onDrawToolChange={onDrawToolChange}
      />,
    );
    fireEvent.click(screen.getByTestId("draw-btn-point"));
    expect(onDrawToolChange).toHaveBeenCalledWith("Point");
  });

  it("clicking active draw tool deactivates it", () => {
    const onDrawToolChange = vi.fn();
    render(
      <MapToolbar
        {...defaultProps}
        activeDrawingLayerId="layer-1"
        activeDrawingTool="Point"
        onDrawToolChange={onDrawToolChange}
      />,
    );
    fireEvent.click(screen.getByTestId("draw-btn-point"));
    expect(onDrawToolChange).toHaveBeenCalledWith(null);
  });

  it("cancel button calls onCancelDrawing", () => {
    const onCancelDrawing = vi.fn();
    render(
      <MapToolbar
        {...defaultProps}
        activeDrawingLayerId="layer-1"
        onCancelDrawing={onCancelDrawing}
      />,
    );
    fireEvent.click(screen.getByTestId("draw-cancel"));
    expect(onCancelDrawing).toHaveBeenCalled();
  });

  it("shows distance badge when measure-distance is active with measurement", () => {
    render(
      <MapToolbar
        {...defaultProps}
        activeTool="measure-distance"
        measurement={{ distance_km: 3.25 }}
      />,
    );
    expect(
      screen.getByTestId("measure-badge-measure-distance"),
    ).toHaveTextContent("3.25 km");
  });

  it("shows metres when distance < 1 km", () => {
    render(
      <MapToolbar
        {...defaultProps}
        activeTool="measure-distance"
        measurement={{ distance_km: 0.45 }}
      />,
    );
    expect(
      screen.getByTestId("measure-badge-measure-distance"),
    ).toHaveTextContent("450 m");
  });

  it("shows area badge when measure-area is active with measurement", () => {
    render(
      <MapToolbar
        {...defaultProps}
        activeTool="measure-area"
        measurement={{ area_km2: 2.5 }}
      />,
    );
    expect(screen.getByTestId("measure-badge-measure-area")).toHaveTextContent(
      "2.500 km²",
    );
  });

  it("does not show badge for inactive tool", () => {
    render(
      <MapToolbar
        {...defaultProps}
        activeTool="grab"
        measurement={{ distance_km: 5 }}
      />,
    );
    expect(
      screen.queryByTestId("measure-badge-measure-distance"),
    ).not.toBeInTheDocument();
  });
});
