import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FeatureDialog from "@/components/FeatureDialog";

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
    expect(onSave).toHaveBeenCalledWith("Alpha", "Some notes");
  });

  it("does not call onSave when name is only whitespace", () => {
    const { onSave } = setup();
    fireEvent.change(screen.getByTestId("feature-dialog-name"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByTestId("feature-dialog-save"));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onDiscard on Discard button click", () => {
    const { onDiscard } = setup();
    fireEvent.click(screen.getByTestId("feature-dialog-discard"));
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it("calls onDiscard on Escape key", () => {
    const { onDiscard } = setup();
    fireEvent.keyDown(screen.getByTestId("feature-dialog"), { key: "Escape" });
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it("calls onSave on Enter key when name is filled", () => {
    const { onSave } = setup();
    fireEvent.change(screen.getByTestId("feature-dialog-name"), {
      target: { value: "Test" },
    });
    fireEvent.keyDown(screen.getByTestId("feature-dialog"), { key: "Enter" });
    expect(onSave).toHaveBeenCalledWith("Test", "");
  });

  it("calls onDiscard when clicking the backdrop", () => {
    const { onDiscard } = setup();
    fireEvent.click(screen.getByTestId("feature-dialog-backdrop"));
    expect(onDiscard).toHaveBeenCalledOnce();
  });
});
