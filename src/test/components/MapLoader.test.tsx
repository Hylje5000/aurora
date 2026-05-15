import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="map-stub" />,
}));

import MapLoader from "@/components/MapLoader";

describe("MapLoader", () => {
  it("renders without crashing", () => {
    const { container } = render(<MapLoader />);
    expect(container.firstChild).not.toBeNull();
  });

  it("renders the dynamic map stub", () => {
    const { getByTestId } = render(<MapLoader />);
    expect(getByTestId("map-stub")).toBeDefined();
  });
});
