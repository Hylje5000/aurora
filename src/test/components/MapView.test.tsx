import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";

const { mockRemove, mockAddControl, MockMap, MockNavigationControl } =
  vi.hoisted(() => {
    const mockRemove = vi.fn();
    const mockAddControl = vi.fn();
    const MockMap = vi.fn(() => ({
      addControl: mockAddControl,
      remove: mockRemove,
    }));
    const MockNavigationControl = vi.fn();
    return { mockRemove, mockAddControl, MockMap, MockNavigationControl };
  });

vi.mock("mapbox-gl", () => ({
  default: {
    Map: MockMap,
    NavigationControl: MockNavigationControl,
    accessToken: "",
  },
}));

import MapView from "@/components/MapView";

describe("MapView", () => {
  beforeEach(() => {
    MockMap.mockClear();
    mockAddControl.mockClear();
    mockRemove.mockClear();
  });

  it("renders a container div", () => {
    const { container } = render(<MapView />);
    const div = container.querySelector("div");
    expect(div).not.toBeNull();
    expect(div?.className).toContain("w-full");
    expect(div?.className).toContain("h-full");
  });

  it("initialises mapboxgl.Map once on mount", () => {
    render(<MapView center={[21.5, 60.2]} zoom={7} />);
    expect(MockMap).toHaveBeenCalledTimes(1);
    expect(MockMap).toHaveBeenCalledWith(
      expect.objectContaining({ center: [21.5, 60.2], zoom: 7 }),
    );
  });

  it("adds a NavigationControl on mount", () => {
    render(<MapView />);
    expect(mockAddControl).toHaveBeenCalledTimes(1);
    expect(mockAddControl).toHaveBeenCalledWith(
      expect.any(MockNavigationControl),
    );
  });

  it("calls map.remove() on unmount", () => {
    const { unmount } = render(<MapView />);
    act(() => unmount());
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
