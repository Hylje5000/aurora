import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SymbolPicker from "@/components/SymbolPicker";

// Mock milsymbol to avoid full library loading in tests
vi.mock("milsymbol", () => ({
  default: {
    Symbol: vi.fn().mockImplementation(() => ({
      asSVG: () => "<svg>mock-symbol</svg>",
    })),
  },
}));

describe("SymbolPicker", () => {
  const defaultSidc = "SFGPUCI--------"; // Infantry Friend Present

  it("renders with initial SIDC and affiliation", () => {
    render(<SymbolPicker selectedSidc={defaultSidc} onChange={() => {}} />);
    expect(screen.getByTestId("symbol-picker")).toBeInTheDocument();
    expect(screen.getByText("Friend")).toHaveClass("bg-slate-700");
    const infantryBtn = screen.getByText("Infantry").closest("button");
    expect(infantryBtn).toHaveClass("bg-slate-700");
  });

  it("filters symbols by search term", () => {
    render(<SymbolPicker selectedSidc={defaultSidc} onChange={() => {}} />);
    const searchInput = screen.getByTestId("symbol-search");

    fireEvent.change(searchInput, { target: { value: "Armor" } });

    expect(screen.getByText("Armor / Tank")).toBeInTheDocument();
    expect(screen.queryByText("Infantry")).not.toBeInTheDocument();
  });

  it("calls onChange when a new affiliation is clicked", () => {
    const onChange = vi.fn();
    render(<SymbolPicker selectedSidc={defaultSidc} onChange={onChange} />);

    fireEvent.click(screen.getByText("Hostile"));

    // Position 2 changed from F to H
    expect(onChange).toHaveBeenCalledWith("SHGPUCI--------");
  });

  it("calls onChange when a new symbol is selected", () => {
    const onChange = vi.fn();
    render(<SymbolPicker selectedSidc={defaultSidc} onChange={onChange} />);

    fireEvent.click(screen.getByText("Armor / Tank"));

    // Keeps current affiliation (F) and status (P) from the base SIDC
    expect(onChange).toHaveBeenCalledWith("SFGPUCV--------");
  });

  it("maintains current affiliation when switching symbols", () => {
    const onChange = vi.fn();
    const hostileInfantry = "SHGPUCI--------";
    render(<SymbolPicker selectedSidc={hostileInfantry} onChange={onChange} />);

    fireEvent.click(screen.getByText("Armor / Tank"));

    // Should result in Hostile Armor Present
    expect(onChange).toHaveBeenCalledWith("SHGPUCV--------");
  });
});
