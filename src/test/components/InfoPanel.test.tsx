import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InfoPanel from "@/components/InfoPanel";

const baseData = {
  title: "Rusko / Rusko",
  rows: [
    ["Code", "704"],
    ["Region", "turku"],
  ] as [string, string | null | undefined][],
};

describe("InfoPanel", () => {
  it("renders nothing when data is null", () => {
    const { container } = render(<InfoPanel data={null} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the title when data is provided", () => {
    render(<InfoPanel data={baseData} onClose={vi.fn()} />);
    expect(screen.getByText("Rusko / Rusko")).toBeInTheDocument();
  });

  it("renders all label/value rows", () => {
    render(<InfoPanel data={baseData} onClose={vi.fn()} />);
    expect(screen.getByText("Code")).toBeInTheDocument();
    expect(screen.getByText("704")).toBeInTheDocument();
    expect(screen.getByText("Region")).toBeInTheDocument();
    expect(screen.getByText("turku")).toBeInTheDocument();
  });

  it("renders — for null values", () => {
    render(
      <InfoPanel
        data={{ title: "Test", rows: [["Field", null]] }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders — for undefined values", () => {
    render(
      <InfoPanel
        data={{ title: "Test", rows: [["Field", undefined]] }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("calls onClose when the × button is clicked", async () => {
    const onClose = vi.fn();
    render(<InfoPanel data={baseData} onClose={onClose} />);
    await userEvent.click(
      screen.getByRole("button", { name: /close info panel/i }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders a close button with correct aria-label", () => {
    render(<InfoPanel data={baseData} onClose={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /close info panel/i }),
    ).toBeInTheDocument();
  });
});
