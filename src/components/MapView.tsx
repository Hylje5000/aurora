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

async function fetchCellTowers(map: mapboxgl.Map): Promise<void> {
  const bounds = map.getBounds();
  if (!bounds) return;
  const bbox = [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth(),
  ].join(",");

  try {
    const res = await fetch(`/api/cell-towers?bbox=${bbox}`);
    if (!res.ok) return;
    const data = await res.json();
    (map.getSource("cell-towers-source") as mapboxgl.GeoJSONSource).setData(
      data,
    );
  } catch (err) {
    console.error("[cell-towers] fetch failed", err);
  }
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

      map.setConfigProperty("basemap", "lightPreset", "night");

      // AOI highlight layers
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

      // Cell tower clustered source
      map.addSource("cell-towers-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cluster circles
      map.addLayer({
        id: "cell-towers-clusters",
        type: "circle",
        source: "cell-towers-source",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#64748b",
          "circle-radius": [
            "step",
            ["get", "point_count"],
            14,
            10,
            18,
            100,
            24,
          ],
          "circle-opacity": 0.85,
        },
      });

      // Cluster count labels
      map.addLayer({
        id: "cell-towers-cluster-count",
        type: "symbol",
        source: "cell-towers-source",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 11,
        },
        paint: { "text-color": "#ffffff" },
      });

      // Individual tower dots colored by radio type
      map.addLayer({
        id: "cell-towers-unclustered",
        type: "circle",
        source: "cell-towers-source",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 5,
          "circle-color": [
            "match",
            ["get", "radio"],
            "GSM",
            "#facc15",
            "UMTS",
            "#f97316",
            "LTE",
            "#22c55e",
            "CDMA",
            "#a78bfa",
            "#94a3b8",
          ],
          "circle-stroke-width": 1,
          "circle-stroke-color": "#1e293b",
        },
      });

      // Popup on click
      map.on("click", "cell-towers-unclustered", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const { radio, aoi_id, range_m, avg_signal } =
          feature.properties as Record<string, unknown>;
        const coords = (
          feature.geometry as GeoJSON.Point
        ).coordinates.slice() as [number, number];
        new mapboxgl.Popup({ className: "aurora-popup" })
          .setLngLat(coords)
          .setHTML(
            `<div style="
              background:#0f172a;
              color:#e2e8f0;
              border:1px solid #334155;
              border-radius:6px;
              padding:10px 14px;
              font-family:monospace;
              font-size:12px;
              line-height:1.8;
              min-width:160px;
            ">
              <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:4px;letter-spacing:0.05em">${radio}</div>
              <div><span style="color:#64748b">AOI</span>&nbsp;&nbsp;&nbsp;&nbsp;${aoi_id}</div>
              <div><span style="color:#64748b">RANGE</span>&nbsp;&nbsp;${range_m != null ? `${range_m} m` : "—"}</div>
              <div><span style="color:#64748b">SIGNAL</span>&nbsp;${avg_signal != null ? `${avg_signal} dBm` : "—"}</div>
            </div>`,
          )
          .addTo(map);
      });

      map.on("mouseenter", "cell-towers-unclustered", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "cell-towers-unclustered", () => {
        map.getCanvas().style.cursor = "";
      });

      // Fetch on every pan/zoom and immediately on load
      map.on("moveend", () => fetchCellTowers(map));
      fetchCellTowers(map);
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
