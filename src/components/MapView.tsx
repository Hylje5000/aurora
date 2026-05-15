"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { AREAS_OF_INTEREST } from "@/lib/areas";
import {
  DEFAULT_LAYER_VISIBILITY,
  LAYER_GROUPS,
  type LayerVisibility,
} from "@/lib/layers";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  selectedAreaId?: string | null;
  layerVisibility?: LayerVisibility;
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
  layerVisibility = DEFAULT_LAYER_VISIBILITY,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const styleLoadedRef = useRef(false);

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

      // Military basemap hardening — suppress civilian noise
      map.setConfigProperty("basemap", "showPointOfInterestLabels", false);
      map.setConfigProperty("basemap", "showTransitLabels", false);
      map.setConfigProperty("basemap", "show3dObjects", false);
      map.setConfigProperty("basemap", "colorWater", "#0d2137");

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

      const vis = layerVisibility;

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
          "circle-color": "#94a3b8",
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

      // Individual tower dots — one layer per radio type for per-type visibility toggling
      const towerLayers: Array<{
        id: string;
        radio: string;
        color: string;
        visible: boolean;
      }> = [
        {
          id: "cell-towers-gsm",
          radio: "GSM",
          color: "#fde047",
          visible: vis.cellGSM,
        },
        {
          id: "cell-towers-umts",
          radio: "UMTS",
          color: "#fb923c",
          visible: vis.cellUMTS,
        },
        {
          id: "cell-towers-lte",
          radio: "LTE",
          color: "#4ade80",
          visible: vis.cellLTE,
        },
        {
          id: "cell-towers-cdma",
          radio: "CDMA",
          color: "#c4b5fd",
          visible: vis.cellCDMA,
        },
      ];

      for (const { id, radio, color, visible } of towerLayers) {
        map.addLayer({
          id,
          type: "circle",
          source: "cell-towers-source",
          filter: [
            "all",
            ["!", ["has", "point_count"]],
            ["==", ["get", "radio"], radio],
          ],
          layout: { visibility: visible ? "visible" : "none" },
          paint: {
            "circle-radius": 5,
            "circle-color": color,
            "circle-stroke-width": 1,
            "circle-stroke-color": "rgba(0,0,0,0.5)",
          },
        });
      }

      // Popup and cursor handlers for all per-type tower layers
      const TOWER_LAYER_IDS = [
        "cell-towers-gsm",
        "cell-towers-umts",
        "cell-towers-lte",
        "cell-towers-cdma",
      ];

      for (const layerId of TOWER_LAYER_IDS) {
        map.on("click", layerId, (e) => {
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

        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
        });
      }

      // Fetch on every pan/zoom and immediately on load
      map.on("moveend", () => fetchCellTowers(map));
      fetchCellTowers(map);

      // ── Terrain & intelligence layers ──────────────────────────────────

      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });

      map.addSource("terrain-v2", {
        type: "vector",
        url: "mapbox://mapbox.mapbox-terrain-v2",
      });

      map.addLayer({
        id: "hillshading",
        type: "hillshade",
        source: "mapbox-dem",
        slot: "bottom",
        layout: { visibility: vis.hillshade ? "visible" : "none" },
        paint: {
          "hillshade-exaggeration": 0.7,
          "hillshade-illumination-direction": 335,
          "hillshade-shadow-color": "#0d1520",
          "hillshade-highlight-color": "#3a6080",
          "hillshade-accent-color": "#000000",
        },
      });

      map.addLayer({
        id: "landcover-military",
        type: "fill",
        source: "terrain-v2",
        "source-layer": "landcover",
        slot: "bottom",
        layout: { visibility: vis.landcover ? "visible" : "none" },
        paint: {
          "fill-color": [
            "match",
            ["get", "class"],
            "wood",
            "rgba(20,83,45,0.55)",
            "scrub",
            "rgba(54,83,20,0.35)",
            "grass",
            "rgba(74,108,42,0.22)",
            "crop",
            "rgba(74,108,42,0.22)",
            "snow",
            "rgba(180,210,255,0.3)",
            "rgba(0,0,0,0)",
          ],
        },
      });

      map.addLayer({
        id: "contours-minor",
        type: "line",
        source: "terrain-v2",
        "source-layer": "contour",
        slot: "bottom",
        filter: ["!=", ["get", "index"], 5],
        layout: { visibility: vis.contours ? "visible" : "none" },
        paint: {
          "line-color": "rgba(100,160,120,0.45)",
          "line-width": 0.5,
        },
      });

      map.addLayer({
        id: "contours-major",
        type: "line",
        source: "terrain-v2",
        "source-layer": "contour",
        slot: "bottom",
        filter: [
          "any",
          ["==", ["get", "index"], 5],
          ["==", ["get", "index"], 10],
        ],
        layout: { visibility: vis.contours ? "visible" : "none" },
        paint: {
          "line-color": "rgba(130,200,150,0.75)",
          "line-width": 1.2,
        },
      });

      map.addLayer({
        id: "contours-labels",
        type: "symbol",
        source: "terrain-v2",
        "source-layer": "contour",
        slot: "middle",
        filter: [
          "any",
          ["==", ["get", "index"], 5],
          ["==", ["get", "index"], 10],
        ],
        layout: {
          visibility: vis.contours ? "visible" : "none",
          "symbol-placement": "line",
          "text-field": ["concat", ["to-string", ["get", "ele"]], "m"],
          "text-size": 10,
          "text-font": ["DIN Pro Regular", "Arial Unicode MS Regular"],
        },
        paint: {
          "text-color": "#8acd9a",
          "text-halo-color": "rgba(0,0,0,0.6)",
          "text-halo-width": 1.5,
        },
      });

      if (vis.terrain3d) {
        map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
      }

      styleLoadedRef.current = true;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      styleLoadedRef.current = false;
    };
    // center, zoom, and layerVisibility are intentionally excluded — map init is one-shot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync layer visibility changes to the live map after style has loaded
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;

    for (const [key, layerIds] of Object.entries(LAYER_GROUPS) as [
      keyof typeof LAYER_GROUPS,
      string[],
    ][]) {
      const visible = layerVisibility[key];
      for (const layerId of layerIds) {
        map.setLayoutProperty(
          layerId,
          "visibility",
          visible ? "visible" : "none",
        );
      }
    }

    if (layerVisibility.terrain3d) {
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
    } else {
      map.setTerrain(null);
    }
  }, [layerVisibility]);

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
