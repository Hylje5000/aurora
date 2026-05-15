"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
}

export default function MapView({
  center = [21.5, 60.2],
  zoom = 7,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/standard",
      center,
      zoom,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl());

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // center and zoom are intentionally excluded — map init is one-shot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
