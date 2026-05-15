import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";

const {
  mockRemove,
  mockAddControl,
  mockOn,
  mockAddSource,
  mockAddLayer,
  mockFitBounds,
  MockMap,
  MockNavigationControl,
} = vi.hoisted(() => {
  const mockRemove = vi.fn();
  const mockAddControl = vi.fn();
  const mockOn = vi.fn();
  const mockAddSource = vi.fn();
  const mockAddLayer = vi.fn();
  const mockFitBounds = vi.fn();
  const MockMap = vi.fn(() => ({
    addControl: mockAddControl,
    remove: mockRemove,
    on: mockOn,
    addSource: mockAddSource,
    addLayer: mockAddLayer,
    fitBounds: mockFitBounds,
  }));
  const MockNavigationControl = vi.fn();
  return {
    mockRemove,
    mockAddControl,
    mockOn,
    mockAddSource,
    mockAddLayer,
    mockFitBounds,
    MockMap,
    MockNavigationControl,
  };
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
    mockOn.mockClear();
    mockAddSource.mockClear();
    mockAddLayer.mockClear();
    mockFitBounds.mockClear();
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

  it("registers a style.load listener on mount", () => {
    render(<MapView />);
    const styleLoadCall = mockOn.mock.calls.find(
      ([event]) => event === "style.load",
    );
    expect(styleLoadCall).toBeDefined();
  });

  it("adds aoi-source, aoi-fill, and aoi-outline after style.load fires", () => {
    render(<MapView />);
    const styleLoadCall = mockOn.mock.calls.find(
      ([event]) => event === "style.load",
    );
    const styleLoadCb = styleLoadCall![1] as () => void;
    act(() => styleLoadCb());

    expect(mockAddSource).toHaveBeenCalledWith(
      "aoi-source",
      expect.objectContaining({ type: "geojson" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "aoi-fill", type: "fill" }),
    );
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "aoi-outline", type: "line" }),
    );
  });

  it("calls fitBounds with the correct bbox when selectedAreaId is set", () => {
    const { rerender } = render(<MapView selectedAreaId={null} />);
    expect(mockFitBounds).not.toHaveBeenCalled();

    rerender(<MapView selectedAreaId="karjala" />);
    expect(mockFitBounds).toHaveBeenCalledWith(
      [29.289551, 62.283256, 31.256104, 63.1047],
      expect.objectContaining({ padding: 60 }),
    );
  });

  it("does not call fitBounds when selectedAreaId is null", () => {
    render(<MapView selectedAreaId={null} />);
    expect(mockFitBounds).not.toHaveBeenCalled();
  });
});
