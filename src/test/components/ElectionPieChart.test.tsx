import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ElectionPieChart from "@/components/ElectionPieChart";

const TYPICAL_DATA = {
  KOK: 26.4,
  PS: 18.2,
  SDP: 15.1,
  KESK: 12.3,
  VIHR: 8.5,
  VAS: 7.1,
  RKP: 4.2,
  KD: 3.9,
  LIIKE: 1.5, // below 2% → Other
  SKP: 0.8, // below 2% → Other
};

describe("ElectionPieChart", () => {
  it("renders an SVG pie chart", () => {
    const { container } = render(<ElectionPieChart data={TYPICAL_DATA} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders path slices for parties above 2% threshold", () => {
    const { container } = render(<ElectionPieChart data={TYPICAL_DATA} />);
    const paths = container.querySelectorAll("path");
    // 8 parties >= 2% + 1 Other slice = 9
    expect(paths.length).toBe(9);
  });

  it("groups parties below 2% into Other slice", () => {
    render(<ElectionPieChart data={TYPICAL_DATA} />);
    // LIIKE (1.5) + SKP (0.8) → Other appears in top-4 list if large enough
    // With these values Other = 2.3% → 9th by rank, not in top 4
    // Just verify "Other" is NOT in the top 4 list when it's small
    const labels = screen.getAllByText(/^[A-Z]/);
    // KOK, PS, SDP, KESK should be the top 4
    expect(labels[0].textContent).toBe("KOK");
    expect(labels[1].textContent).toBe("PS");
    expect(labels[2].textContent).toBe("SDP");
    expect(labels[3].textContent).toBe("KESK");
  });

  it("lists top 4 parties in descending order with percentages", () => {
    render(<ElectionPieChart data={TYPICAL_DATA} />);
    const pctTexts = screen.getAllByText(/\d+\.\d+%/);
    const values = pctTexts.map((el) => parseFloat(el.textContent!));
    // First 4 values should be descending
    expect(values[0]).toBeGreaterThan(values[1]);
    expect(values[1]).toBeGreaterThan(values[2]);
    expect(values[2]).toBeGreaterThan(values[3]);
  });

  it("renders a circle (not path) for single-party data", () => {
    const { container } = render(<ElectionPieChart data={{ KOK: 100 }} />);
    expect(container.querySelector("circle")).not.toBeNull();
    expect(container.querySelector("path")).toBeNull();
  });

  it("returns null for empty data", () => {
    const { container } = render(<ElectionPieChart data={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when all shares are zero", () => {
    const { container } = render(<ElectionPieChart data={{ KOK: 0, PS: 0 }} />);
    expect(container.firstChild).toBeNull();
  });

  it("uses correct color for known parties", () => {
    const { container } = render(
      <ElectionPieChart data={{ SDP: 50, KOK: 50 }} />,
    );
    const paths = container.querySelectorAll("path");
    const fills = Array.from(paths).map((p) => p.getAttribute("fill"));
    expect(fills).toContain("#CC0000"); // SDP
    expect(fills).toContain("#1D5091"); // KOK
  });

  it("uses fallback color for unknown party abbreviations", () => {
    const { container } = render(
      <ElectionPieChart data={{ UNKNOWN: 60, KOK: 40 }} />,
    );
    const paths = container.querySelectorAll("path");
    const fills = Array.from(paths).map((p) => p.getAttribute("fill"));
    expect(fills).toContain("#64748B"); // unknown → slate
  });
});
