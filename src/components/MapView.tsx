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
import { createMilsymbolImage } from "@/lib/milsymbol";
import type { InfoPanelData } from "@/components/InfoPanel";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  selectedAreaId?: string | null;
  layerVisibility?: LayerVisibility;
  onInfoPanel?: (data: InfoPanelData | null) => void;
  infoPanelOpen?: boolean;
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

function filterByEnabled(
  data: GeoJSON.FeatureCollection,
  vis: LayerVisibility,
): GeoJSON.FeatureCollection {
  if (vis.cellGSM && vis.cellUMTS && vis.cellLTE && vis.cellCDMA) return data;
  const enabled = new Set<string>();
  if (vis.cellGSM) enabled.add("GSM");
  if (vis.cellUMTS) enabled.add("UMTS");
  if (vis.cellLTE) enabled.add("LTE");
  if (vis.cellCDMA) enabled.add("CDMA");
  return {
    type: "FeatureCollection",
    features: data.features.filter(
      (f) => f.properties != null && enabled.has(f.properties.radio as string),
    ),
  };
}

const EMPTY_COLLECTION: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function getBbox(map: mapboxgl.Map): string {
  const bounds = map.getBounds();
  if (!bounds) return "";
  return [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth(),
  ].join(",");
}

async function fetchCellTowers(
  map: mapboxgl.Map,
  rawDataRef: { current: GeoJSON.FeatureCollection },
  visRef: { current: LayerVisibility },
): Promise<void> {
  const bbox = getBbox(map);
  if (!bbox) return;

  try {
    const res = await fetch(`/api/cell-towers?bbox=${bbox}`);
    if (!res.ok) return;
    const data = (await res.json()) as GeoJSON.FeatureCollection;
    rawDataRef.current = data;
    (map.getSource("cell-towers-source") as mapboxgl.GeoJSONSource).setData(
      filterByEnabled(data, visRef.current),
    );
  } catch (err) {
    console.error("[cell-towers] fetch failed", err);
  }
}

async function fetchLayer(
  map: mapboxgl.Map,
  sourceId: string,
  endpoint: string,
): Promise<void> {
  const bbox = getBbox(map);
  if (!bbox) return;
  try {
    const res = await fetch(`${endpoint}?bbox=${bbox}`);
    if (!res.ok) return;
    const data = (await res.json()) as GeoJSON.FeatureCollection;
    (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(data);
  } catch (err) {
    console.error(`[${endpoint}] fetch failed`, err);
  }
}

function pavementLabel(type: unknown): string {
  if (type === 1) return "Asphalt";
  if (type === 2) return "Gravel";
  if (type === 3) return "Dirt/Other";
  return "—";
}

function popupStyle(title: string, rows: [string, unknown][]): string {
  const rowsHtml = rows
    .map(
      ([label, val]) =>
        `<div><span style="color:#64748b">${label}</span>&nbsp;&nbsp;${val ?? "—"}</div>`,
    )
    .join("");
  return `<div style="
    background:#0f172a;color:#e2e8f0;border:1px solid #334155;
    border-radius:6px;padding:10px 14px;font-family:monospace;
    font-size:12px;line-height:1.8;min-width:180px;">
    <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:4px;letter-spacing:0.05em">${title}</div>
    ${rowsHtml}
  </div>`;
}

const DASH_SEQ: number[][] = [
  [0, 4],
  [0.5, 3.5],
  [1, 3],
  [1.5, 2.5],
  [2, 2],
  [2.5, 1.5],
  [3, 1],
  [3.5, 0.5],
];

function startHighlightAnimation(
  map: mapboxgl.Map,
  frameRef: { current: number | null },
  stepRef: { current: number },
) {
  if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  stepRef.current = 0;
  let prevTs = 0;
  function tick(ts: number) {
    if (ts - prevTs >= 60) {
      prevTs = ts;
      map.setPaintProperty(
        "municipality-highlight-line",
        "line-dasharray",
        DASH_SEQ[stepRef.current % DASH_SEQ.length],
      );
      stepRef.current++;
    }
    frameRef.current = requestAnimationFrame(tick);
  }
  frameRef.current = requestAnimationFrame(tick);
}

export default function MapView({
  center = [21.5, 60.2],
  zoom = 7,
  selectedAreaId = null,
  layerVisibility = DEFAULT_LAYER_VISIBILITY,
  onInfoPanel,
  infoPanelOpen = false,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const styleLoadedRef = useRef(false);
  const rawTowerDataRef = useRef<GeoJSON.FeatureCollection>({
    type: "FeatureCollection",
    features: [],
  });
  const layerVisibilityRef = useRef(layerVisibility);
  const highlightAnimFrameRef = useRef<number | null>(null);
  const highlightAnimStepRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/standard",
      center,
      zoom,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl());

    mapRef.current.on("style.load", async () => {
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
      const clustersVisible =
        vis.cellGSM || vis.cellUMTS || vis.cellLTE || vis.cellCDMA;

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
        layout: { visibility: clustersVisible ? "visible" : "none" },
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
          visibility: clustersVisible ? "visible" : "none",
          "text-field": "{point_count_abbreviated}",
          "text-size": 11,
        },
        paint: { "text-color": "#ffffff" },
      });

      // Individual tower markers — one NATO milsymbol layer per radio type
      const SIDC = "SFGPUUSR-------";
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

      await Promise.all(
        towerLayers.map(({ id, radio, color }) =>
          createMilsymbolImage({
            sidc: SIDC,
            fillColor: color,
            uniqueDesignation: radio,
          }).then((img) => map.addImage(`${id}-icon`, img)),
        ),
      );

      for (const { id, radio, visible } of towerLayers) {
        map.addLayer({
          id,
          type: "symbol",
          source: "cell-towers-source",
          filter: [
            "all",
            ["!", ["has", "point_count"]],
            ["==", ["get", "radio"], radio],
          ],
          layout: {
            visibility: visible ? "visible" : "none",
            "icon-image": `${id}-icon`,
            "icon-size": 0.6,
            "icon-allow-overlap": true,
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
      map.on("moveend", () =>
        fetchCellTowers(map, rawTowerDataRef, layerVisibilityRef),
      );
      fetchCellTowers(map, rawTowerDataRef, layerVisibilityRef);

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

      // ── Infrastructure layers ──────────────────────────────────────────

      // Bridge NATO milsymbol icons (SIDC: Friendly Ground Installation)
      const BRIDGE_SIDC = "SFGPIBE--------";
      const [bridgeActiveImg, bridgeInactiveImg] = await Promise.all([
        createMilsymbolImage({ sidc: BRIDGE_SIDC, fillColor: "#facc15" }),
        createMilsymbolImage({ sidc: BRIDGE_SIDC, fillColor: "#94a3b8" }),
      ]);
      map.addImage("bridge-active", bridgeActiveImg);
      map.addImage("bridge-inactive", bridgeInactiveImg);

      // Municipality boundaries (static — fetch once)
      map.addSource("municipalities-source", {
        type: "geojson",
        data: EMPTY_COLLECTION,
      });
      map.addLayer({
        id: "municipalities-fill",
        type: "fill",
        source: "municipalities-source",
        layout: { visibility: vis.municipalities ? "visible" : "none" },
        paint: { "fill-color": "#ffffff", "fill-opacity": 0.05 },
      });
      map.addLayer({
        id: "municipalities-outline",
        type: "line",
        source: "municipalities-source",
        layout: { visibility: vis.municipalities ? "visible" : "none" },
        paint: {
          "line-color": "#ffffff",
          "line-opacity": 0.4,
          "line-width": 1,
        },
      });
      map.addSource("municipality-highlight-source", {
        type: "geojson",
        data: EMPTY_COLLECTION,
      });
      map.addLayer({
        id: "municipality-highlight-line",
        type: "line",
        source: "municipality-highlight-source",
        paint: {
          "line-color": "#ffffff",
          "line-width": 3,
          "line-dasharray": [0, 4],
        },
      });

      fetch("/api/municipalities")
        .then((r) => r.json())
        .then((data: GeoJSON.FeatureCollection) => {
          (
            map.getSource("municipalities-source") as mapboxgl.GeoJSONSource
          ).setData(data);
        })
        .catch((err) => console.error("[municipalities] fetch failed", err));

      // Roads
      map.addSource("roads-source", {
        type: "geojson",
        data: EMPTY_COLLECTION,
      });
      map.addLayer({
        id: "roads-line",
        type: "line",
        minzoom: 12,
        source: "roads-source",
        layout: { visibility: vis.roads ? "visible" : "none" },
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "condition_class"], 1],
            "#ef4444",
            ["==", ["get", "condition_class"], 2],
            "#ef4444",
            ["==", ["get", "condition_class"], 3],
            "#eab308",
            ["==", ["get", "condition_class"], 4],
            "#22c55e",
            ["==", ["get", "condition_class"], 5],
            "#22c55e",
            "#64748b",
          ],
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1, 14, 3],
          "line-opacity": 0.8,
        },
      });

      // Bridges
      map.addSource("bridges-source", {
        type: "geojson",
        data: EMPTY_COLLECTION,
      });
      map.addLayer({
        id: "bridges-symbol",
        type: "symbol",
        minzoom: 12,
        source: "bridges-source",
        layout: {
          visibility: vis.bridges ? "visible" : "none",
          "icon-image": [
            "case",
            ["==", ["get", "status"], "kaytossa"],
            "bridge-active",
            "bridge-inactive",
          ],
          "icon-size": 0.5,
          "icon-allow-overlap": true,
        },
      });

      // Railways
      map.addSource("railways-source", {
        type: "geojson",
        data: EMPTY_COLLECTION,
      });
      map.addLayer({
        id: "railways-line",
        type: "line",
        source: "railways-source",
        layout: { visibility: vis.railways ? "visible" : "none" },
        paint: {
          "line-color": "#a78bfa",
          "line-width": 2,
          "line-dasharray": [2, 2],
        },
      });

      // Click popups for infrastructure layers
      map.on("click", "roads-line", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as Record<string, unknown>;
        new mapboxgl.Popup({ className: "aurora-popup" })
          .setLngLat(e.lngLat)
          .setHTML(
            popupStyle("Road Segment", [
              ["Width", p.width_cm != null ? `${p.width_cm} cm` : null],
              ["Lanes", p.lane_count],
              [
                "Max Mass",
                p.max_mass_kg != null ? `${p.max_mass_kg} kg` : null,
              ],
              [
                "Max Height",
                p.max_height_cm != null ? `${p.max_height_cm} cm` : null,
              ],
              [
                "Max Bogie",
                p.max_bogie_mass_kg != null
                  ? `${p.max_bogie_mass_kg} kg`
                  : null,
              ],
              ["Pavement", pavementLabel(p.pavement_type)],
              [
                "Condition",
                p.condition_text ??
                  (p.condition_class != null
                    ? `Class ${p.condition_class}`
                    : null),
              ],
              [
                "Rut Depth",
                p.rut_depth_mm != null ? `${p.rut_depth_mm} mm` : null,
              ],
              [
                "Damage",
                p.has_damage
                  ? p.damage_recurring
                    ? "Recurring"
                    : "Yes"
                  : "None",
              ],
            ]),
          )
          .addTo(map);
      });

      map.on("click", "bridges-symbol", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as Record<string, unknown>;
        const title = p.name
          ? `${p.name} (${p.code ?? ""})`
          : ((p.code as string) ?? "Bridge");
        new mapboxgl.Popup({ className: "aurora-popup" })
          .setLngLat(e.lngLat)
          .setHTML(
            popupStyle(title, [
              ["Type", p.type_name],
              ["Status", p.status],
              [
                "Max Vehicle",
                p.max_vehicle_mass_t != null
                  ? `${p.max_vehicle_mass_t} t`
                  : null,
              ],
              [
                "Max Combi",
                p.max_combination_mass_t != null
                  ? `${p.max_combination_mass_t} t`
                  : null,
              ],
              [
                "Max Bogie",
                p.max_bogie_mass_t != null ? `${p.max_bogie_mass_t} t` : null,
              ],
              [
                "Height Limit",
                p.height_restriction_m != null
                  ? `${p.height_restriction_m} m`
                  : null,
              ],
              ["Owner", p.owner],
              ["Network", p.network_type],
            ]),
          )
          .addTo(map);
      });

      map.on("click", "railways-line", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as Record<string, unknown>;
        new mapboxgl.Popup({ className: "aurora-popup" })
          .setLngLat(e.lngLat)
          .setHTML(
            popupStyle((p.name as string) ?? "Railway Track", [
              ["Type", p.track_type],
              ["State", p.state],
              ["Route", p.route_name],
              [
                "Length",
                p.length_m != null
                  ? `${Math.round(p.length_m as number)} m`
                  : null,
              ],
              ["District", p.maintenance_district],
              ["Centre", p.operating_centre],
            ]),
          )
          .addTo(map);
      });

      map.on("click", "municipalities-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as Record<string, unknown>;
        const name = p.name_sv
          ? `${p.name_fi} / ${p.name_sv}`
          : ((p.name_fi as string) ?? "Municipality");
        onInfoPanel?.({
          title: name,
          rows: [
            ["Code", p.nat_code as string],
            ["Region", p.aoi_id as string],
          ],
        });
        (
          map.getSource(
            "municipality-highlight-source",
          ) as mapboxgl.GeoJSONSource
        ).setData({ type: "FeatureCollection", features: [f] });
        startHighlightAnimation(map, highlightAnimFrameRef, highlightAnimStepRef);
      });

      // Cursor handlers
      for (const layerId of [
        "roads-line",
        "bridges-symbol",
        "railways-line",
        "municipalities-fill",
      ]) {
        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
        });
      }

      // Fetch on moveend and immediately (roads/bridges only at zoom >= 12)
      map.on("moveend", () => {
        if (map.getZoom() >= 12) {
          fetchLayer(map, "roads-source", "/api/roads");
          fetchLayer(map, "bridges-source", "/api/bridges");
        }
        fetchLayer(map, "railways-source", "/api/railways");
      });
      if (map.getZoom() >= 12) {
        fetchLayer(map, "roads-source", "/api/roads");
        fetchLayer(map, "bridges-source", "/api/bridges");
      }
      fetchLayer(map, "railways-source", "/api/railways");

      styleLoadedRef.current = true;
    });

    return () => {
      if (highlightAnimFrameRef.current !== null) {
        cancelAnimationFrame(highlightAnimFrameRef.current);
      }
      mapRef.current?.remove();
      mapRef.current = null;
      styleLoadedRef.current = false;
    };
    // center, zoom, and layerVisibility are intentionally excluded — map init is one-shot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync layer visibility changes to the live map after style has loaded
  useEffect(() => {
    layerVisibilityRef.current = layerVisibility;

    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;

    // Re-filter source data so cluster counts reflect only enabled radio types
    (map.getSource("cell-towers-source") as mapboxgl.GeoJSONSource).setData(
      filterByEnabled(rawTowerDataRef.current, layerVisibility),
    );

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

    const clustersVisible =
      layerVisibility.cellGSM ||
      layerVisibility.cellUMTS ||
      layerVisibility.cellLTE ||
      layerVisibility.cellCDMA;
    for (const id of ["cell-towers-clusters", "cell-towers-cluster-count"]) {
      map.setLayoutProperty(
        id,
        "visibility",
        clustersVisible ? "visible" : "none",
      );
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

  useEffect(() => {
    if (infoPanelOpen) return;
    if (highlightAnimFrameRef.current !== null) {
      cancelAnimationFrame(highlightAnimFrameRef.current);
      highlightAnimFrameRef.current = null;
    }
    const map = mapRef.current;
    if (map && styleLoadedRef.current) {
      (
        map.getSource(
          "municipality-highlight-source",
        ) as mapboxgl.GeoJSONSource
      )?.setData(EMPTY_COLLECTION);
    }
  }, [infoPanelOpen]);

  return <div ref={containerRef} className="w-full h-full" />;
}
