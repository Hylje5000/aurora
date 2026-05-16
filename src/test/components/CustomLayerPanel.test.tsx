import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CustomLayerPanel from "@/components/CustomLayerPanel";
import type { CustomLayer } from "@/lib/customLayers";

const LAYER_A: CustomLayer = {
  id: "a",
  name: "Alpha",
  color: "#ef4444",
  created_at: "2026-05-16T00:00:00Z",
  updated_at: "2026-05-16T00:00:00Z",
};
const LAYER_B: CustomLayer = {
  id: "b",
  name: "Bravo",
  color: "#3b82f6",
  created_at: "2026-05-16T00:00:00Z",
  updated_at: "2026-05-16T00:00:00Z",
};

const DEFAULT_PROPS = {
  layers: [LAYER_A, LAYER_B],
  enabledLayerIds: new Set<string>(),
  activeDrawingLayerId: null as string | null,
  onCreateLayer: vi.fn(),
  onDeleteLayer: vi.fn(),
  onToggleLayer: vi.fn(),
  onSetActiveDrawingLayer: vi.fn(),
};

function setup(overrides?: Partial<typeof DEFAULT_PROPS>) {
  const props = { ...DEFAULT_PROPS, ...overrides };
  render(<CustomLayerPanel {...props} />);
  return props;
}

describe("CustomLayerPanel", () => {
  it("renders the panel", () => {
    setup();
    expect(screen.getByTestId("custom-layer-panel")).toBeTruthy();
  });

  it("shows layer names", () => {
    setup();
    expect(screen.getByTestId("layer-name-a")).toBeTruthy();
    expect(screen.getByTestId("layer-name-b")).toBeTruthy();
  });

  it("collapses and expands when header button is clicked", () => {
    setup();
    expect(screen.getByTestId("layer-name-a")).toBeTruthy();
    fireEvent.click(screen.getByTestId("custom-layer-panel-toggle"));
    expect(screen.queryByTestId("layer-name-a")).toBeNull();
    fireEvent.click(screen.getByTestId("custom-layer-panel-toggle"));
    expect(screen.getByTestId("layer-name-a")).toBeTruthy();
  });

  it("calls onToggleLayer when checkbox is clicked", () => {
    const onToggleLayer = vi.fn();
    setup({ onToggleLayer });
    fireEvent.click(screen.getByTestId("layer-toggle-a"));
    expect(onToggleLayer).toHaveBeenCalledWith("a");
  });

  it("shows checkbox checked for enabled layers", () => {
    setup({ enabledLayerIds: new Set(["a"]) });
    const checkboxA = screen.getByTestId("layer-toggle-a") as HTMLInputElement;
    const checkboxB = screen.getByTestId("layer-toggle-b") as HTMLInputElement;
    expect(checkboxA.checked).toBe(true);
    expect(checkboxB.checked).toBe(false);
  });

  it("calls onSetActiveDrawingLayer when a layer name is clicked", () => {
    const onSetActiveDrawingLayer = vi.fn();
    setup({ onSetActiveDrawingLayer });
    fireEvent.click(screen.getByTestId("layer-name-a"));
    expect(onSetActiveDrawingLayer).toHaveBeenCalledWith("a");
  });

  it("calls onSetActiveDrawingLayer(null) when active layer name is clicked", () => {
    const onSetActiveDrawingLayer = vi.fn();
    setup({ activeDrawingLayerId: "a", onSetActiveDrawingLayer });
    fireEvent.click(screen.getByTestId("layer-name-a"));
    expect(onSetActiveDrawingLayer).toHaveBeenCalledWith(null);
  });

  it("shows inline delete confirm on trash click", () => {
    setup();
    fireEvent.click(screen.getByTestId("layer-delete-a"));
    expect(screen.getByTestId("layer-delete-confirm-a")).toBeTruthy();
  });

  it("calls onDeleteLayer on confirm click", () => {
    const onDeleteLayer = vi.fn();
    setup({ onDeleteLayer });
    fireEvent.click(screen.getByTestId("layer-delete-a"));
    fireEvent.click(screen.getByTestId("layer-delete-confirm-a"));
    expect(onDeleteLayer).toHaveBeenCalledWith("a");
  });

  it("hides confirm on cancel click", () => {
    setup();
    fireEvent.click(screen.getByTestId("layer-delete-a"));
    expect(screen.getByTestId("layer-delete-confirm-a")).toBeTruthy();
    fireEvent.click(screen.getByTestId("layer-delete-cancel-a"));
    expect(screen.queryByTestId("layer-delete-confirm-a")).toBeNull();
  });

  it("deactivates drawing layer when that layer is deleted", () => {
    const onDeleteLayer = vi.fn();
    const onSetActiveDrawingLayer = vi.fn();
    setup({
      activeDrawingLayerId: "a",
      onDeleteLayer,
      onSetActiveDrawingLayer,
    });
    fireEvent.click(screen.getByTestId("layer-delete-a"));
    fireEvent.click(screen.getByTestId("layer-delete-confirm-a"));
    expect(onSetActiveDrawingLayer).toHaveBeenCalledWith(null);
    expect(onDeleteLayer).toHaveBeenCalledWith("a");
  });

  it("shows + New Layer button when form is hidden", () => {
    setup();
    expect(screen.getByTestId("new-layer-btn")).toBeTruthy();
  });

  it("shows the create form when + New Layer is clicked", () => {
    setup();
    fireEvent.click(screen.getByTestId("new-layer-btn"));
    expect(screen.getByTestId("new-layer-name-input")).toBeTruthy();
    expect(screen.getByTestId("new-layer-create-btn")).toBeTruthy();
  });

  it("Create button is disabled when name is empty", () => {
    setup();
    fireEvent.click(screen.getByTestId("new-layer-btn"));
    const btn = screen.getByTestId("new-layer-create-btn") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("calls onCreateLayer with name and colour on Create", () => {
    const onCreateLayer = vi.fn();
    setup({ onCreateLayer });
    fireEvent.click(screen.getByTestId("new-layer-btn"));
    fireEvent.change(screen.getByTestId("new-layer-name-input"), {
      target: { value: "My Layer" },
    });
    fireEvent.click(screen.getByTestId("new-layer-colour-blue"));
    fireEvent.click(screen.getByTestId("new-layer-create-btn"));
    expect(onCreateLayer).toHaveBeenCalledWith("My Layer", "#3b82f6");
  });

  it("hides the create form after successful creation", () => {
    const onCreateLayer = vi.fn();
    setup({ onCreateLayer });
    fireEvent.click(screen.getByTestId("new-layer-btn"));
    fireEvent.change(screen.getByTestId("new-layer-name-input"), {
      target: { value: "My Layer" },
    });
    fireEvent.click(screen.getByTestId("new-layer-create-btn"));
    expect(screen.queryByTestId("new-layer-name-input")).toBeNull();
  });

  it("hides the create form on cancel", () => {
    setup();
    fireEvent.click(screen.getByTestId("new-layer-btn"));
    fireEvent.click(screen.getByTestId("new-layer-cancel-btn"));
    expect(screen.queryByTestId("new-layer-name-input")).toBeNull();
  });

  it("shows empty state message when there are no layers", () => {
    setup({ layers: [] });
    expect(screen.getByText(/No layers yet/)).toBeTruthy();
  });
});
