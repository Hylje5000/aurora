"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import DrawRectangle from "mapbox-gl-draw-rectangle-mode";
import { AREAS_OF_INTEREST } from "@/lib/areas";
import {
  DEFAULT_LAYER_VISIBILITY,
  LAYER_GROUPS,
  type LayerVisibility,
} from "@/lib/layers";
import { createMilsymbolImage, ensureMilsymbolImages } from "@/lib/milsymbol";
import {
  COLOUR_PALETTE,
  type CustomLayer,
  type DrawingTool,
} from "@/lib/customLayers";
import FeatureDialog from "@/components/FeatureDialog";
import DrawingToolbar from "@/components/DrawingToolbar";
import type { InfoPanelData } from "@/components/InfoPanel";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const DRAW_MODE_MAP: Record<DrawingTool, string> = {
  Point: "draw_point",
  LineString: "draw_line_string",
  Polygon: "draw_polygon",
  Rectangle: "draw_rectangle",
};

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  selectedAreaId?: string | null;
  layerVisibility?: LayerVisibility;
  customLayers?: CustomLayer[];
  enabledCustomLayerIds?: Set<string>;
  activeDrawingLayerId?: string | null;
  onCancelDrawing?: () => void;
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

async function fetchCustomLayerFeatures(
  map: mapboxgl.Map,
  layerId: string,
): Promise<void> {
  const bbox = getBbox(map);
  if (!bbox) return;

  try {
    const res = await fetch(
      `/api/custom-layers/${layerId}/features?bbox=${bbox}`,
    );
    if (!res.ok) return;
    const data = (await res.json()) as GeoJSON.FeatureCollection;

    await ensureMilsymbolImages(map, data.features);

    (
      map.getSource(`custom-layer-${layerId}`) as mapboxgl.GeoJSONSource
    )?.setData(data);
  } catch (err) {
    console.error(`[custom-layer] fetch failed for ${layerId}`, err);
  }
}

function addCustomLayerSourcesToMap(
  map: mapboxgl.Map,
  layerId: string,
  visible: boolean,
  registeredIds: Set<string>,
) {
  if (registeredIds.has(layerId)) return;
  registeredIds.add(layerId);

  const sourceId = `custom-layer-${layerId}`;
  const vis = visible ? "visible" : ("none" as const);

  map.addSource(sourceId, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  map.addLayer({
    id: `${sourceId}-fill`,
    type: "fill",
    source: sourceId,
    filter: ["==", ["geometry-type"], "Polygon"],
    layout: { visibility: vis },
    paint: {
      "fill-color": ["get", "color"],
      "fill-opacity": 0.5,
    },
  });

  map.addLayer({
    id: `${sourceId}-line`,
    type: "line",
    source: sourceId,
    filter: [
      "in",
      ["geometry-type"],
      ["literal", ["LineString", "Polygon"]],
    ] as mapboxgl.FilterSpecification,
    layout: { visibility: vis },
    paint: {
      "line-color": ["get", "color"],
      "line-width": 4,
    },
  });

  map.addLayer({
    id: `${sourceId}-circle`,
    type: "circle",
    source: sourceId,
    filter: [
      "all",
      ["==", ["geometry-type"], "Point"],
      ["!", ["has", "sidc", ["get", "properties"]]],
    ],
    layout: { visibility: vis },
    paint: {
      "circle-color": ["get", "color"],
      "circle-radius": 10,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2.5,
    },
  });

  map.addLayer({
    id: `${sourceId}-symbol`,
    type: "symbol",
    source: sourceId,
    filter: [
      "all",
      ["==", ["geometry-type"], "Point"],
      ["has", "sidc", ["get", "properties"]],
    ],
    layout: {
      visibility: vis,
      "icon-image": ["get", "sidc", ["get", "properties"]],
      "icon-size": 0.6,
      "icon-allow-overlap": true,
    },
  });
}

function registerCustomLayerClickHandlers(map: mapboxgl.Map, layerId: string) {
  const sourceId = `custom-layer-${layerId}`;

  for (const suffix of ["-fill", "-line", "-circle", "-symbol"]) {
    const fullId = `${sourceId}${suffix}`;

    map.on("click", fullId, (e) => {
      const feature = e.features?.[0];
      if (!feature?.properties) return;
      const { name, description } = feature.properties as {
        name?: string;
        description?: string;
      };

      new mapboxgl.Popup({ className: "aurora-popup" })
        .setLngLat(e.lngLat)
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
            min-width:140px;
            max-width:260px;
            word-break:break-word;
            touch-action:none;
          ">
            <div style="font-size:13px;font-weight:700;color:#fff;${description ? "margin-bottom:6px;" : ""}letter-spacing:0.04em">${name ?? "Unnamed"}</div>
            ${description ? `<div style="color:#94a3b8;font-size:11px;line-height:1.5">${description}</div>` : ""}
          </div>`,
        )
        .addTo(map);
    });

    map.on("mouseenter", fullId, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", fullId, () => {
      map.getCanvas().style.cursor = "";
    });
  }
}

function removeCustomLayerFromMap(
  map: mapboxgl.Map,
  layerId: string,
  registeredIds: Set<string>,
) {
  if (!registeredIds.has(layerId)) return;
  registeredIds.delete(layerId);

  const sourceId = `custom-layer-${layerId}`;
  for (const suffix of ["-fill", "-line", "-circle", "-symbol"]) {
    try {
      map.removeLayer(`${sourceId}${suffix}`);
    } catch {
      // layer may not exist if map style reloaded
    }
  }
  try {
    map.removeSource(sourceId);
  } catch {
    // source may not exist
  }
}

const PULSE_SEQ = [1, 0.65, 0.35, 0.65, 1];

function startHighlightAnimation(
  map: mapboxgl.Map,
  frameRef: { current: number | null },
  stepRef: { current: number },
) {
  if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  stepRef.current = 0;
  let prevTs = 0;
  function tick(ts: number) {
    if (ts - prevTs >= 200) {
      prevTs = ts;
      map.setPaintProperty(
        "municipality-highlight-line",
        "line-opacity",
        PULSE_SEQ[stepRef.current % PULSE_SEQ.length],
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
  customLayers = [],
  enabledCustomLayerIds = new Set(),
  activeDrawingLayerId = null,
  onCancelDrawing,
  onInfoPanel,
  infoPanelOpen = false,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const styleLoadedRef = useRef(false);
  const eventsAttachedRef = useRef(false);

  // Cell tower state
  const rawTowerDataRef = useRef<GeoJSON.FeatureCollection>({
    type: "FeatureCollection",
    features: [],
  });
  const layerVisibilityRef = useRef(layerVisibility);
  const highlightAnimFrameRef = useRef<number | null>(null);
  const highlightAnimStepRef = useRef(0);

  // Drawing state
  const activeDrawingLayerIdRef = useRef<string | null>(activeDrawingLayerId);
  const activeDrawingColourRef = useRef<string>(COLOUR_PALETTE[0].hex);
  const activeDrawingToolRef = useRef<DrawingTool | null>(null);
  const pendingDrawFeatureRef = useRef<GeoJSON.Feature | null>(null);

  // Custom layer registration
  const registeredCustomLayerIdsRef = useRef<Set<string>>(new Set());
  const enabledCustomLayerIdsRef = useRef<Set<string>>(enabledCustomLayerIds);

  // UI state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeDrawingTool, setActiveDrawingTool] =
    useState<DrawingTool | null>(null);
  const [activeDrawingColour, setActiveDrawingColour] = useState<string>(
    COLOUR_PALETTE[0].hex,
  );
  const [hasDrawingSelection, setHasDrawingSelection] = useState(false);
  const [dialogFeatureType, setDialogFeatureType] =
    useState<DrawingTool | null>(null);

  const activeLayer = customLayers.find((l) => l.id === activeDrawingLayerId);

  // ── Map initialisation (one-shot) ─────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/standard",
      center,
      zoom,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl());

    // Initialise Draw control
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      modes: {
        ...MapboxDraw.modes,
        draw_rectangle: DrawRectangle,
      },
    });
    mapRef.current.addControl(draw as unknown as mapboxgl.IControl);
    drawRef.current = draw;

    mapRef.current.on("style.load", async () => {
      const map = mapRef.current;
      if (!map) return;

      registeredCustomLayerIdsRef.current.clear();

      if (!layerVisibilityRef.current.satellite) {
        map.setConfigProperty("basemap", "lightPreset", "night");

        // Military basemap hardening — suppress civilian noise
        map.setConfigProperty("basemap", "showPointOfInterestLabels", false);
        map.setConfigProperty("basemap", "showTransitLabels", false);
        map.setConfigProperty("basemap", "show3dObjects", false);
        map.setConfigProperty("basemap", "colorWater", "#0d2137");
      }

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
          "fill-opacity": 0.4,
        },
      });
      // Glow layer for maximum visibility
      map.addLayer({
        id: "aoi-outline-glow",
        type: "line",
        source: "aoi-source",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 12,
          "line-blur": 5,
          "line-opacity": 0.6,
        },
      });
      map.addLayer({
        id: "aoi-outline",
        type: "line",
        source: "aoi-source",
        paint: {
          "line-color": "#ffffff", // Pure white inner line for high contrast
          "line-width": 2,
        },
      });
      map.addLayer({
        id: "aoi-outline-outer",
        type: "line",
        source: "aoi-source",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 6,
          "line-offset": 0,
        },
      });

      const vis = layerVisibilityRef.current;
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
          color: "#3b82f6",
          visible: vis.cellGSM,
        },
        {
          id: "cell-towers-umts",
          radio: "UMTS",
          color: "#3b82f6",
          visible: vis.cellUMTS,
        },
        {
          id: "cell-towers-lte",
          radio: "LTE",
          color: "#3b82f6",
          visible: vis.cellLTE,
        },
        {
          id: "cell-towers-cdma",
          radio: "CDMA",
          color: "#3b82f6",
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

      if (!eventsAttachedRef.current) {
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
                  touch-action:none;
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

        // ── Draw events ────────────────────────────────────────────────────
        map.on("draw.create", (e: { features: GeoJSON.Feature[] }) => {
          const feature = e.features[0];
          if (!feature) return;
          const layerId = activeDrawingLayerIdRef.current;
          if (!layerId) {
            drawRef.current?.delete(feature.id as string);
            return;
          }

          const geomType = (feature.geometry as GeoJSON.Geometry).type;
          const featureType: DrawingTool =
            activeDrawingToolRef.current === "Rectangle"
              ? "Rectangle"
              : geomType === "Point"
                ? "Point"
                : geomType === "LineString"
                  ? "LineString"
                  : "Polygon";

          pendingDrawFeatureRef.current = feature;
          setDialogFeatureType(featureType);
          setDialogOpen(true);
        });

        map.on("draw.selectionchange", (e: { features: GeoJSON.Feature[] }) => {
          setHasDrawingSelection(e.features.length > 0);
        });
      }

      // Add sources/layers for any custom layers already in props at init time
      for (const layer of customLayers) {
        addCustomLayerSourcesToMap(
          map,
          layer.id,
          enabledCustomLayerIdsRef.current.has(layer.id),
          registeredCustomLayerIdsRef.current,
        );
        registerCustomLayerClickHandlers(map, layer.id);
        if (enabledCustomLayerIdsRef.current.has(layer.id)) {
          void fetchCustomLayerFeatures(map, layer.id);
        }
      }

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
          "hillshade-exaggeration": 0.3,
          "hillshade-illumination-direction": 335,
          "hillshade-shadow-color": "#253545",
          "hillshade-highlight-color": "#7aaabf",
          "hillshade-accent-color": "#1a2a38",
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
            "rgba(50,180,90,0.38)",
            "scrub",
            "rgba(110,170,50,0.28)",
            "grass",
            "rgba(130,200,70,0.20)",
            "crop",
            "rgba(160,210,80,0.20)",
            "snow",
            "rgba(210,235,255,0.30)",
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
          "line-color": "rgba(180,255,200,0.80)",
          "line-width": 0.8,
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
          "line-color": "rgba(210,255,220,1.0)",
          "line-width": 2,
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
          "text-color": "#ccffdd",
          "text-halo-color": "rgba(0,0,0,0.85)",
          "text-halo-width": 2.5,
        },
      });

      if (vis.terrain3d) {
        map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
      }

      // ── Infrastructure layers ──────────────────────────────────────────

      // Bridge NATO milsymbol icons (SIDC: Friendly Ground Installation)
      const BRIDGE_SIDC = "SFGPIMNB-------";
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
      // slot:"top" renders above Standard style night-mode color pipeline
      map.addLayer({
        id: "municipality-highlight-line",
        type: "line",
        source: "municipality-highlight-source",
        slot: "top",
        paint: {
          "line-color": "#ffffff",
          "line-width": 5,
          "line-opacity": 1,
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

        const rows: [string, string | null | undefined][] = [
          ["Code", p.nat_code as string],
          ["Region", p.aoi_id as string],
        ];

        if (p.population != null) {
          rows.push(
            ["Population", Number(p.population).toLocaleString("fi-FI")],
            [
              "Male",
              `${Number(p.male).toLocaleString("fi-FI")} (${p.male_pct}%)`,
            ],
            [
              "Female",
              `${Number(p.female).toLocaleString("fi-FI")} (${p.female_pct}%)`,
            ],
            [
              "Under 15",
              `${Number(p.age_0_14).toLocaleString("fi-FI")} (${p.age_0_14_pct}%)`,
            ],
            [
              "Over 65",
              `${Number(p.age_65plus).toLocaleString("fi-FI")} (${p.age_65plus_pct}%)`,
            ],
            ["Data year", String(p.til_vuosi)],
          );
        }

        onInfoPanel?.({ title: name, rows });
        (
          map.getSource(
            "municipality-highlight-source",
          ) as mapboxgl.GeoJSONSource
        ).setData({ type: "FeatureCollection", features: [f] });
        startHighlightAnimation(
          map,
          highlightAnimFrameRef,
          highlightAnimStepRef,
        );
      });

      // Cursor handlers for infrastructure
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

      // ── Fetch on every pan/zoom and immediately on load ────────────────
      if (!eventsAttachedRef.current) {
        map.on("moveend", () => {
          fetchCellTowers(map, rawTowerDataRef, layerVisibilityRef);
          if (map.getZoom() >= 12) {
            fetchLayer(map, "roads-source", "/api/roads");
            fetchLayer(map, "bridges-source", "/api/bridges");
          }
          fetchLayer(map, "railways-source", "/api/railways");
          for (const layerId of enabledCustomLayerIdsRef.current) {
            if (registeredCustomLayerIdsRef.current.has(layerId)) {
              void fetchCustomLayerFeatures(map, layerId);
            }
          }
        });
        fetchCellTowers(map, rawTowerDataRef, layerVisibilityRef);
        if (map.getZoom() >= 12) {
          fetchLayer(map, "roads-source", "/api/roads");
          fetchLayer(map, "bridges-source", "/api/bridges");
        }
        fetchLayer(map, "railways-source", "/api/railways");
        eventsAttachedRef.current = true;
      }

      styleLoadedRef.current = true;
    });

    const registeredIds = registeredCustomLayerIdsRef.current;
    return () => {
      if (highlightAnimFrameRef.current !== null) {
        cancelAnimationFrame(highlightAnimFrameRef.current);
      }
      mapRef.current?.remove();
      mapRef.current = null;
      drawRef.current = null;
      styleLoadedRef.current = false;
      registeredIds.clear();
    };
    // center, zoom, layerVisibility, customLayers intentionally excluded — map init is one-shot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync layer visibility ──────────────────────────────────────────────
  useEffect(() => {
    layerVisibilityRef.current = layerVisibility;

    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;

    // Handle satellite style switch
    const targetStyle = layerVisibility.satellite
      ? "mapbox://styles/mapbox/satellite-streets-v12"
      : "mapbox://styles/mapbox/standard";

    const style = map.getStyle();
    const isSatelliteNow =
      style?.sprite?.includes("satellite") ||
      style?.name?.toLowerCase().includes("satellite") ||
      false;

    if (layerVisibility.satellite !== isSatelliteNow) {
      styleLoadedRef.current = false; // pause other syncs while style loads
      map.setStyle(targetStyle);
      return; // The style.load event will re-sync everything
    }

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

  // ── Sync AOI navigation ────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedAreaId || !mapRef.current) return;
    const area = AREAS_OF_INTEREST.find((a) => a.id === selectedAreaId);
    if (!area) return;
    mapRef.current.fitBounds(area.bbox as mapboxgl.LngLatBoundsLike, {
      padding: 60,
      duration: 1200,
    });
  }, [selectedAreaId]);

  // ── Sync custom layer sources (add/remove as layers are created/deleted) ─
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;

    const currentIds = new Set(customLayers.map((l) => l.id));

    for (const layer of customLayers) {
      const isNew = !registeredCustomLayerIdsRef.current.has(layer.id);
      addCustomLayerSourcesToMap(
        map,
        layer.id,
        enabledCustomLayerIdsRef.current.has(layer.id),
        registeredCustomLayerIdsRef.current,
      );
      if (isNew) {
        registerCustomLayerClickHandlers(map, layer.id);
        if (enabledCustomLayerIdsRef.current.has(layer.id)) {
          void fetchCustomLayerFeatures(map, layer.id);
        }
      }
    }

    for (const id of [...registeredCustomLayerIdsRef.current]) {
      if (!currentIds.has(id)) {
        removeCustomLayerFromMap(map, id, registeredCustomLayerIdsRef.current);
      }
    }
  }, [customLayers]);

  // ── Sync enabled/disabled custom layers ───────────────────────────────
  useEffect(() => {
    enabledCustomLayerIdsRef.current = enabledCustomLayerIds;

    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;

    for (const layerId of registeredCustomLayerIdsRef.current) {
      const enabled = enabledCustomLayerIds.has(layerId);
      const sourceId = `custom-layer-${layerId}`;
      const vis = enabled ? "visible" : "none";

      for (const suffix of ["-fill", "-line", "-circle", "-symbol"]) {
        map.setLayoutProperty(`${sourceId}${suffix}`, "visibility", vis);
      }

      if (enabled) {
        void fetchCustomLayerFeatures(map, layerId);
      } else {
        (map.getSource(sourceId) as mapboxgl.GeoJSONSource)?.setData({
          type: "FeatureCollection",
          features: [],
        });
      }
    }
  }, [enabledCustomLayerIds]);

  // ── Sync active drawing layer id ──────────────────────────────────────
  useEffect(() => {
    activeDrawingLayerIdRef.current = activeDrawingLayerId;

    if (!activeDrawingLayerId) {
      drawRef.current?.changeMode("simple_select");
    }
  }, [activeDrawingLayerId]);

  // ── Sync active drawing tool → Draw mode ──────────────────────────────
  // Derive the effective tool: null when no layer is selected
  const effectiveTool = activeDrawingLayerId ? activeDrawingTool : null;

  useEffect(() => {
    activeDrawingToolRef.current = effectiveTool;

    const draw = drawRef.current;
    if (!draw) return;

    if (!effectiveTool) {
      draw.changeMode("simple_select");
      return;
    }

    draw.changeMode(DRAW_MODE_MAP[effectiveTool]);
  }, [effectiveTool]);

  // ── Sync active drawing colour ─────────────────────────────────────────
  useEffect(() => {
    activeDrawingColourRef.current = activeDrawingColour;
  }, [activeDrawingColour]);

  // ── Sync InfoPanel highlight ───────────────────────────────────────────
  useEffect(() => {
    if (infoPanelOpen) return;
    if (highlightAnimFrameRef.current !== null) {
      cancelAnimationFrame(highlightAnimFrameRef.current);
      highlightAnimFrameRef.current = null;
    }
    const map = mapRef.current;
    if (map && styleLoadedRef.current) {
      (
        map.getSource("municipality-highlight-source") as mapboxgl.GeoJSONSource
      )?.setData(EMPTY_COLLECTION);
    }
  }, [infoPanelOpen]);

  // ── Feature dialog handlers ────────────────────────────────────────────
  async function handleFeatureSave(
    name: string,
    description: string,
    sidc?: string,
  ) {
    const feature = pendingDrawFeatureRef.current;
    const layerId = activeDrawingLayerIdRef.current;
    const map = mapRef.current;

    setDialogOpen(false);
    pendingDrawFeatureRef.current = null;

    if (!feature || !layerId || !map) return;

    drawRef.current?.delete(feature.id as string);

    const geomType = (feature.geometry as GeoJSON.Geometry).type;
    const featureType: DrawingTool =
      activeDrawingToolRef.current === "Rectangle"
        ? "Rectangle"
        : geomType === "Point"
          ? "Point"
          : geomType === "LineString"
            ? "LineString"
            : "Polygon";

    try {
      const res = await fetch(`/api/custom-layers/${layerId}/features`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          feature_type: featureType,
          geometry: feature.geometry,
          color: activeDrawingColourRef.current,
          properties: sidc ? { sidc } : {},
        }),
      });
      if (res.ok) {
        void fetchCustomLayerFeatures(map, layerId);
      }
    } catch (err) {
      console.error("[custom-layer] feature save failed", err);
    }
  }

  function handleFeatureDiscard() {
    const feature = pendingDrawFeatureRef.current;
    if (feature) drawRef.current?.delete(feature.id as string);
    pendingDrawFeatureRef.current = null;
    setDialogOpen(false);
  }

  function handleDeleteSelected() {
    drawRef.current?.trash();
  }

  function handleCancelDrawing() {
    setActiveDrawingTool(null);
    drawRef.current?.changeMode("simple_select");
    onCancelDrawing?.();
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {activeDrawingLayerId && activeLayer && (
        <DrawingToolbar
          activeDrawingLayerName={activeLayer.name}
          activeTool={effectiveTool}
          activeColour={activeDrawingColour}
          hasSelection={hasDrawingSelection}
          onToolChange={setActiveDrawingTool}
          onColourChange={setActiveDrawingColour}
          onCancel={handleCancelDrawing}
          onDeleteSelected={handleDeleteSelected}
        />
      )}

      <FeatureDialog
        open={dialogOpen}
        featureType={dialogFeatureType || undefined}
        onSave={handleFeatureSave}
        onDiscard={handleFeatureDiscard}
      />
    </div>
  );
}
