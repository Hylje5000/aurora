"use client";

import { useEffect } from "react";

/**
 * ZoomGuard prevents the user from zooming the entire webpage (which can break the UI layout),
 * while still allowing Mapbox to handle its own internal zooming logic.
 */
export default function ZoomGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Prevent wheel zoom (Ctrl + Scroll)
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        const target = e.target as HTMLElement;
        const isMap = target?.closest(".mapboxgl-map");
        const isPopup = target?.closest(".mapboxgl-popup");

        // Only allow zoom if it's the map and NOT a popup/UI element
        if (!isMap || isPopup) {
          e.preventDefault();
        }
      }
    };

    const handleGesture = (e: Event) => {
      const target = e.target as HTMLElement;
      const isMap = target?.closest(".mapboxgl-map");
      const isPopup = target?.closest(".mapboxgl-popup");

      if (!isMap || isPopup) {
        e.preventDefault();
      }
    };

    // 3. Prevent keyboard zoom (Ctrl + +/-/0)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "=" || e.key === "-" || e.key === "+" || e.key === "0")
      ) {
        // We generally want to block these for the whole app as they scale the UI.
        e.preventDefault();
      }
    };

    // Add listeners to the window/document
    // { passive: false } is required to use preventDefault() in some browsers
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("gesturestart", handleGesture, { passive: false });
    window.addEventListener("gesturechange", handleGesture, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("gesturestart", handleGesture);
      window.removeEventListener("gesturechange", handleGesture);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return <>{children}</>;
}
