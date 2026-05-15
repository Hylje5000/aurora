import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Stub AreaNav — renders buttons that call onSelect
vi.mock("@/components/AreaNav", () => ({
  default: ({
    selectedAreaId,
    onSelect,
  }: {
    selectedAreaId: string | null;
    onSelect: (id: string) => void;
  }) => (
    <div data-testid="area-nav" data-selected={selectedAreaId ?? ""}>
      <button onClick={() => onSelect("lappi")}>Lappi</button>
      <button onClick={() => onSelect("karjala")}>Karjala</button>
    </div>
  ),
}));

// Stub MapView — renders its selectedAreaId as a data attribute
vi.mock("@/components/MapView", () => ({
  default: ({ selectedAreaId }: { selectedAreaId: string | null }) => (
    <div data-testid="map-view" data-selected={selectedAreaId ?? ""} />
  ),
}));

import MapWithNav from "@/components/MapWithNav";

describe("MapWithNav", () => {
  it("renders without crashing", () => {
    const { container } = render(<MapWithNav />);
    expect(container.firstChild).not.toBeNull();
  });

  it("renders AreaNav and MapView", () => {
    render(<MapWithNav />);
    expect(screen.getByTestId("area-nav")).toBeInTheDocument();
    expect(screen.getByTestId("map-view")).toBeInTheDocument();
  });

  it("starts with no area selected", () => {
    render(<MapWithNav />);
    expect(screen.getByTestId("map-view")).toHaveAttribute("data-selected", "");
  });

  it("propagates selected area from AreaNav to MapView", async () => {
    render(<MapWithNav />);
    await userEvent.click(screen.getByRole("button", { name: "Karjala" }));
    expect(screen.getByTestId("map-view")).toHaveAttribute(
      "data-selected",
      "karjala",
    );
    expect(screen.getByTestId("area-nav")).toHaveAttribute(
      "data-selected",
      "karjala",
    );
  });

  it("updates selection when a different area is clicked", async () => {
    render(<MapWithNav />);
    await userEvent.click(screen.getByRole("button", { name: "Lappi" }));
    expect(screen.getByTestId("map-view")).toHaveAttribute(
      "data-selected",
      "lappi",
    );
    await userEvent.click(screen.getByRole("button", { name: "Karjala" }));
    expect(screen.getByTestId("map-view")).toHaveAttribute(
      "data-selected",
      "karjala",
    );
  });
});
