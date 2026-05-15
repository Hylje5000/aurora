import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AreaNav from "@/components/AreaNav";

describe("AreaNav", () => {
  it("renders a button for each AOI", () => {
    render(<AreaNav selectedAreaId={null} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Lappi" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Karjala" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Turku" })).toBeInTheDocument();
  });

  it("calls onSelect with the correct id when a button is clicked", async () => {
    const onSelect = vi.fn();
    render(<AreaNav selectedAreaId={null} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: "Karjala" }));
    expect(onSelect).toHaveBeenCalledWith("karjala");
  });

  it("applies active styling to the selected area button", () => {
    render(<AreaNav selectedAreaId="lappi" onSelect={vi.fn()} />);
    const lappiBtn = screen.getByRole("button", { name: "Lappi" });
    const karjalaBtn = screen.getByRole("button", { name: "Karjala" });
    // Active button has inline border/shadow styles set
    expect(lappiBtn).toHaveStyle({ borderColor: "#ef4444" });
    // Inactive button has no inline borderColor
    expect(karjalaBtn).not.toHaveStyle({ borderColor: "#ef4444" });
  });

  it("calls onSelect when each button is clicked", async () => {
    const onSelect = vi.fn();
    render(<AreaNav selectedAreaId={null} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: "Lappi" }));
    await userEvent.click(screen.getByRole("button", { name: "Turku" }));
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenNthCalledWith(1, "lappi");
    expect(onSelect).toHaveBeenNthCalledWith(2, "turku");
  });
});
