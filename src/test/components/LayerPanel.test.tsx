import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LayerPanel from "@/components/LayerPanel";
import { DEFAULT_LAYER_VISIBILITY } from "@/lib/layers";

const defaultProps = {
  visibility: DEFAULT_LAYER_VISIBILITY,
  onToggle: vi.fn(),
};

describe("LayerPanel", () => {
  it("renders all four layer toggle rows", () => {
    render(<LayerPanel {...defaultProps} />);
    expect(screen.getByLabelText(/3D Terrain/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hillshade/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contour Lines/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Land Cover/i)).toBeInTheDocument();
  });

  it("reflects checked state from visibility prop", () => {
    render(<LayerPanel {...defaultProps} />);
    // terrain3d is false by default
    expect(screen.getByLabelText(/3D Terrain/i)).not.toBeChecked();
    // others are true by default
    expect(screen.getByLabelText(/Hillshade/i)).toBeChecked();
    expect(screen.getByLabelText(/Contour Lines/i)).toBeChecked();
    expect(screen.getByLabelText(/Land Cover/i)).toBeChecked();
  });

  it("calls onToggle with 'terrain3d' when 3D Terrain checkbox is clicked", async () => {
    const onToggle = vi.fn();
    render(
      <LayerPanel visibility={DEFAULT_LAYER_VISIBILITY} onToggle={onToggle} />,
    );
    await userEvent.click(screen.getByLabelText(/3D Terrain/i));
    expect(onToggle).toHaveBeenCalledWith("terrain3d");
  });

  it("calls onToggle with 'hillshade' when Hillshade checkbox is clicked", async () => {
    const onToggle = vi.fn();
    render(
      <LayerPanel visibility={DEFAULT_LAYER_VISIBILITY} onToggle={onToggle} />,
    );
    await userEvent.click(screen.getByLabelText(/Hillshade/i));
    expect(onToggle).toHaveBeenCalledWith("hillshade");
  });

  it("calls onToggle with 'contours' when Contour Lines checkbox is clicked", async () => {
    const onToggle = vi.fn();
    render(
      <LayerPanel visibility={DEFAULT_LAYER_VISIBILITY} onToggle={onToggle} />,
    );
    await userEvent.click(screen.getByLabelText(/Contour Lines/i));
    expect(onToggle).toHaveBeenCalledWith("contours");
  });

  it("calls onToggle with 'landcover' when Land Cover checkbox is clicked", async () => {
    const onToggle = vi.fn();
    render(
      <LayerPanel visibility={DEFAULT_LAYER_VISIBILITY} onToggle={onToggle} />,
    );
    await userEvent.click(screen.getByLabelText(/Land Cover/i));
    expect(onToggle).toHaveBeenCalledWith("landcover");
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
});
