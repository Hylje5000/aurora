"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { AREAS_OF_INTEREST } from "@/lib/areas";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  selectedAreaId?: string | null;
}

function buildAoiCollection() {
  return {
    type: "FeatureCollection" as const,
    features: AREAS_OF_INTEREST.map((area) => {
      const [minLng, minLat, maxLng, maxLat] = area.bbox;
      return {
        type: "Feature" as const,
        properties: { color: area.color, name: area.name },
        geometry: {
          type: "Polygon" as const,
          coordinates: [
            [
              [minLng, minLat],
              [maxLng, minLat],
              [maxLng, maxLat],
              [minLng, maxLat],
              [minLng, minLat],
            ],
          ],
        },
      };
    }),
  };
}

export default function MapView({
  center = [21.5, 60.2],
  zoom = 7,
  selectedAreaId = null,
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

    mapRef.current.on("style.load", () => {
      const map = mapRef.current;
      if (!map) return;
      map.addSource("aoi-source", {
        type: "geojson",
        data: buildAoiCollection(),
      });
      map.addLayer({
        id: "aoi-fill",
        type: "fill",
        source: "aoi-source",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.12,
        },
      });
      map.addLayer({
        id: "aoi-outline",
        type: "line",
        source: "aoi-source",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 2,
        },
      });
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // center and zoom are intentionally excluded — map init is one-shot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedAreaId || !mapRef.current) return;
    const area = AREAS_OF_INTEREST.find((a) => a.id === selectedAreaId);
    if (!area) return;
    mapRef.current.fitBounds(area.bbox as mapboxgl.LngLatBoundsLike, {
      padding: 60,
      duration: 1200,
    });
  }, [selectedAreaId]);

  return <div ref={containerRef} className="w-full h-full" />;
}
