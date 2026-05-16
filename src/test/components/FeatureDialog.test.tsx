import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FeatureDialog from "@/components/FeatureDialog";

// Mock milsymbol to avoid full library loading in tests
vi.mock("milsymbol", () => ({
  default: {
    Symbol: vi.fn().mockImplementation(() => ({
      asSVG: () => "<svg>mock-symbol</svg>",
    })),
  },
}));

function setup(props?: Partial<Parameters<typeof FeatureDialog>[0]>) {
  const onSave = vi.fn();
  const onDiscard = vi.fn();
  render(
    <FeatureDialog
      open={true}
      onSave={onSave}
      onDiscard={onDiscard}
      {...props}
    />,
  );
  return { onSave, onDiscard };
}

describe("FeatureDialog", () => {
  it("renders nothing when open is false", () => {
    const { onSave, onDiscard } = setup({ open: false });
    expect(screen.queryByTestId("feature-dialog")).toBeNull();
    void onSave;
    void onDiscard;
  });

  it("renders the dialog when open is true", () => {
    setup();
    expect(screen.getByTestId("feature-dialog")).toBeTruthy();
    expect(screen.getByTestId("feature-dialog-name")).toBeTruthy();
    expect(screen.getByTestId("feature-dialog-description")).toBeTruthy();
  });

  it("Save button is disabled when name is empty", () => {
    setup();
    const saveBtn = screen.getByTestId(
      "feature-dialog-save",
    ) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it("Save button is enabled when name has text", () => {
    setup();
    const nameInput = screen.getByTestId("feature-dialog-name");
    fireEvent.change(nameInput, { target: { value: "Obs Post" } });
    const saveBtn = screen.getByTestId(
      "feature-dialog-save",
    ) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);
  });

  it("calls onSave with trimmed name and description on Save click", () => {
    const { onSave } = setup();
    fireEvent.change(screen.getByTestId("feature-dialog-name"), {
      target: { value: "  Alpha  " },
    });
    fireEvent.change(screen.getByTestId("feature-dialog-description"), {
      target: { value: "  Some notes  " },
    });
    fireEvent.click(screen.getByTestId("feature-dialog-save"));
    expect(onSave).toHaveBeenCalledWith("Alpha", "Some notes", undefined);
  });

  it("shows SymbolPicker only for Point features", () => {
    const { rerender } = render(
      <FeatureDialog
        open={true}
        featureType="Polygon"
        onSave={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("symbol-picker")).toBeNull();

    rerender(
      <FeatureDialog
        open={true}
        featureType="Point"
        onSave={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    expect(screen.getByTestId("symbol-picker")).toBeTruthy();
  });

  it("calls onSave with SIDC when featureType is Point", () => {
    const { onSave } = setup({ featureType: "Point" });
    fireEvent.change(screen.getByTestId("feature-dialog-name"), {
      target: { value: "Friendly Inf" },
    });

    // Default symbol should be Infantry (SFG-UCI--------)
    fireEvent.click(screen.getByTestId("feature-dialog-save"));
    expect(onSave).toHaveBeenCalledWith("Friendly Inf", "", "SFG-UCI--------");
  });

  it("calls onSave with selected symbol from SymbolPicker", () => {
    const { onSave } = setup({ featureType: "Point" });
    fireEvent.change(screen.getByTestId("feature-dialog-name"), {
      target: { value: "Armor" },
    });

    // Change affiliation to Hostile
    fireEvent.click(screen.getByText("Hostile"));
    // Select Armor / Tank
    fireEvent.click(screen.getByText("Armor / Tank"));

    fireEvent.click(screen.getByTestId("feature-dialog-save"));
    // Hostile Armor SIDC
    expect(onSave).toHaveBeenCalledWith("Armor", "", "SHG-UCV--------");
  });

  it("calls onSave on Enter key when name is filled", () => {
    const { onSave } = setup();
    fireEvent.change(screen.getByTestId("feature-dialog-name"), {
      target: { value: "Test" },
    });
    fireEvent.keyDown(screen.getByTestId("feature-dialog"), { key: "Enter" });
    expect(onSave).toHaveBeenCalledWith("Test", "", undefined);
  });

  it("calls onDiscard when clicking the backdrop", () => {
    const { onDiscard } = setup();
    fireEvent.click(screen.getByTestId("feature-dialog-backdrop"));
    expect(onDiscard).toHaveBeenCalledOnce();
  });
});
