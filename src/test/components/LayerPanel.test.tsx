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
  it("renders all layer toggle rows including Basemap section", () => {
    render(<LayerPanel {...defaultProps} />);
    expect(screen.getByLabelText(/Satellite View/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/3D Terrain/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hillshade/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contour Lines/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Land Cover/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/GSM/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/UMTS/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/LTE/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/CDMA/i)).toBeInTheDocument();
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
    expect(screen.getByLabelText(/GSM/i)).toBeChecked();
    expect(screen.getByLabelText(/UMTS/i)).toBeChecked();
    expect(screen.getByLabelText(/LTE/i)).toBeChecked();
    expect(screen.getByLabelText(/CDMA/i)).toBeChecked();
  });

  it("calls onToggle with 'satellite' when Satellite View checkbox is clicked", async () => {
    const onToggle = vi.fn();
    render(
      <LayerPanel visibility={DEFAULT_LAYER_VISIBILITY} onToggle={onToggle} />,
    );
    await userEvent.click(screen.getByLabelText(/Satellite View/i));
    expect(onToggle).toHaveBeenCalledWith("satellite");
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

  it("calls onToggle with 'cellGSM' when GSM checkbox is clicked", async () => {
    const onToggle = vi.fn();
    render(
      <LayerPanel visibility={DEFAULT_LAYER_VISIBILITY} onToggle={onToggle} />,
    );
    await userEvent.click(screen.getByLabelText(/GSM/i));
    expect(onToggle).toHaveBeenCalledWith("cellGSM");
  });

  it("calls onToggle with 'cellUMTS' when UMTS checkbox is clicked", async () => {
    const onToggle = vi.fn();
    render(
      <LayerPanel visibility={DEFAULT_LAYER_VISIBILITY} onToggle={onToggle} />,
    );
    await userEvent.click(screen.getByLabelText(/UMTS/i));
    expect(onToggle).toHaveBeenCalledWith("cellUMTS");
  });

  it("calls onToggle with 'cellLTE' when LTE checkbox is clicked", async () => {
    const onToggle = vi.fn();
    render(
      <LayerPanel visibility={DEFAULT_LAYER_VISIBILITY} onToggle={onToggle} />,
    );
    await userEvent.click(screen.getByLabelText(/LTE/i));
    expect(onToggle).toHaveBeenCalledWith("cellLTE");
  });

  it("calls onToggle with 'cellCDMA' when CDMA checkbox is clicked", async () => {
    const onToggle = vi.fn();
    render(
      <LayerPanel visibility={DEFAULT_LAYER_VISIBILITY} onToggle={onToggle} />,
    );
    await userEvent.click(screen.getByLabelText(/CDMA/i));
    expect(onToggle).toHaveBeenCalledWith("cellCDMA");
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
