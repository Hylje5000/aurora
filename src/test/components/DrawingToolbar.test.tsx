import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DrawingToolbar from "@/components/DrawingToolbar";
import { COLOUR_PALETTE } from "@/lib/customLayers";
import type { DrawingTool } from "@/lib/customLayers";

const DEFAULT_PROPS = {
  activeDrawingLayerName: "Sector Blue",
  activeTool: null as DrawingTool | null,
  activeColour: COLOUR_PALETTE[0].hex,
  hasSelection: false,
  onToolChange: vi.fn(),
  onColourChange: vi.fn(),
  onCancel: vi.fn(),
  onDeleteSelected: vi.fn(),
};

function setup(overrides?: Partial<typeof DEFAULT_PROPS>) {
  const props = { ...DEFAULT_PROPS, ...overrides };
  render(<DrawingToolbar {...props} />);
  return props;
}

describe("DrawingToolbar", () => {
  it("renders the toolbar", () => {
    setup();
    expect(screen.getByTestId("drawing-toolbar")).toBeTruthy();
  });

  it("shows the active layer name", () => {
    setup({ activeDrawingLayerName: "My Layer" });
    expect(screen.getByText(/My Layer/)).toBeTruthy();
  });

  it("renders all four tool buttons", () => {
    setup();
    expect(screen.getByTestId("tool-btn-point")).toBeTruthy();
    expect(screen.getByTestId("tool-btn-line")).toBeTruthy();
    expect(screen.getByTestId("tool-btn-polygon")).toBeTruthy();
    expect(screen.getByTestId("tool-btn-rectangle")).toBeTruthy();
  });

  it("calls onToolChange with the tool when a tool button is clicked", () => {
    const onToolChange = vi.fn();
    setup({ onToolChange });
    fireEvent.click(screen.getByTestId("tool-btn-point"));
    expect(onToolChange).toHaveBeenCalledWith("Point");
  });

  it("calls onToolChange with null when active tool is clicked again (toggle off)", () => {
    const onToolChange = vi.fn();
    setup({ activeTool: "Point", onToolChange });
    fireEvent.click(screen.getByTestId("tool-btn-point"));
    expect(onToolChange).toHaveBeenCalledWith(null);
  });

  it("renders all 8 colour swatches", () => {
    setup();
    expect(screen.getByTestId("colour-palette").children).toHaveLength(
      COLOUR_PALETTE.length,
    );
  });

  it("calls onColourChange when a swatch is clicked", () => {
    const onColourChange = vi.fn();
    setup({ onColourChange });
    const secondColour = COLOUR_PALETTE[1];
    fireEvent.click(
      screen.getByTestId(`colour-swatch-${secondColour.label.toLowerCase()}`),
    );
    expect(onColourChange).toHaveBeenCalledWith(secondColour.hex);
  });

  it("calls onCancel when the cancel button is clicked", () => {
    const onCancel = vi.fn();
    setup({ onCancel });
    fireEvent.click(screen.getByTestId("drawing-toolbar-cancel"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("does not render Delete Selected when hasSelection is false", () => {
    setup({ hasSelection: false });
    expect(screen.queryByTestId("drawing-toolbar-delete")).toBeNull();
  });

  it("renders Delete Selected when hasSelection is true", () => {
    setup({ hasSelection: true });
    expect(screen.getByTestId("drawing-toolbar-delete")).toBeTruthy();
  });

  it("calls onDeleteSelected when Delete Selected is clicked", () => {
    const onDeleteSelected = vi.fn();
    setup({ hasSelection: true, onDeleteSelected });
    fireEvent.click(screen.getByTestId("drawing-toolbar-delete"));
    expect(onDeleteSelected).toHaveBeenCalledOnce();
  });
});
