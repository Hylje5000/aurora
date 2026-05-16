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

  it("renders optional component below rows when provided", () => {
    const Extra = () => <div data-testid="extra-component">chart here</div>;
    render(
      <InfoPanel
        data={{ ...baseData, component: <Extra /> }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId("extra-component")).toBeInTheDocument();
  });

  it("renders without error when component is not provided", () => {
    render(<InfoPanel data={baseData} onClose={vi.fn()} />);
    expect(screen.getByText("Rusko / Rusko")).toBeInTheDocument();
  });

  it("collapses body when the chevron button is clicked", async () => {
    render(<InfoPanel data={baseData} onClose={vi.fn()} />);
    expect(screen.getByText("Code")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: /collapse info panel/i }),
    );
    expect(screen.queryByText("Code")).not.toBeInTheDocument();
    expect(screen.getByText("Rusko / Rusko")).toBeInTheDocument();
  });

  it("expands body again after second chevron click", async () => {
    render(<InfoPanel data={baseData} onClose={vi.fn()} />);
    const chevron = screen.getByRole("button", {
      name: /collapse info panel/i,
    });
    await userEvent.click(chevron);
    await userEvent.click(
      screen.getByRole("button", { name: /expand info panel/i }),
    );
    expect(screen.getByText("Code")).toBeInTheDocument();
  });
});
