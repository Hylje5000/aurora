import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import SummaryModal from "@/components/SummaryModal";

describe("SummaryModal", () => {
  it("does not render when open is false", () => {
    const { container } = render(
      <SummaryModal open={false} summary="Test" onClose={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders when open is true", () => {
    render(<SummaryModal open={true} summary="**Test**" onClose={vi.fn()} />);
    expect(screen.getByTestId("summary-modal")).toBeInTheDocument();
  });

  it("renders the parsed markdown summary", () => {
    render(<SummaryModal open={true} summary="**Test**" onClose={vi.fn()} />);
    expect(screen.getByText("Test")).toBeInTheDocument();
    expect(screen.getByText("Test").tagName).toBe("STRONG");
  });

  it("renders a fallback message when summary is null", () => {
    render(<SummaryModal open={true} summary={null} onClose={vi.fn()} />);
    expect(screen.getByText("No summary available.")).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<SummaryModal open={true} summary="Test" onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close summary modal"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when the dismiss button is clicked", () => {
    const onClose = vi.fn();
    render(<SummaryModal open={true} summary="Test" onClose={onClose} />);
    fireEvent.click(screen.getByTestId("summary-modal-close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<SummaryModal open={true} summary="Test" onClose={onClose} />);
    fireEvent.click(screen.getByTestId("summary-modal-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose on Escape key press", () => {
    const onClose = vi.fn();
    render(<SummaryModal open={true} summary="Test" onClose={onClose} />);
    fireEvent.keyDown(screen.getByTestId("summary-modal"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
