import { render, fireEvent } from "@testing-library/react";
import ZoomGuard from "@/components/ZoomGuard";
import { describe, it, expect, vi } from "vitest";

describe("ZoomGuard", () => {
  it("prevents wheel zoom when ctrlKey is pressed and target is not map", () => {
    const { getByText } = render(
      <ZoomGuard>
        <div>Content</div>
      </ZoomGuard>,
    );

    const content = getByText("Content");
    const event = new WheelEvent("wheel", {
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    // We can't easily mock e.preventDefault() in a way that checks if it was called on the real event object
    // in this environment, but we can spy on the event.
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    fireEvent(content, event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("does not prevent wheel zoom when ctrlKey is not pressed", () => {
    const { getByText } = render(
      <ZoomGuard>
        <div>Content</div>
      </ZoomGuard>,
    );

    const content = getByText("Content");
    const event = new WheelEvent("wheel", {
      ctrlKey: false,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    fireEvent(content, event);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it("does not prevent wheel zoom when target is map", () => {
    const { getByTestId } = render(
      <ZoomGuard>
        <div className="mapboxgl-map" data-testid="map">
          <div data-testid="inner">Map Content</div>
        </div>
      </ZoomGuard>,
    );

    const inner = getByTestId("inner");
    const event = new WheelEvent("wheel", {
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    fireEvent(inner, event);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it("prevents wheel zoom when target is a popup even if inside map", () => {
    const { getByTestId } = render(
      <ZoomGuard>
        <div className="mapboxgl-map" data-testid="map">
          <div className="mapboxgl-popup" data-testid="popup">
            Popup Content
          </div>
        </div>
      </ZoomGuard>,
    );

    const popup = getByTestId("popup");
    const event = new WheelEvent("wheel", {
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    fireEvent(popup, event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
