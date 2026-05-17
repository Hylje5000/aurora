"use client";

import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
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
import type { InfoPanelData } from "@/components/InfoPanel";
import type { MapTool, MeasurementState } from "@/lib/mapTool";
import ElectionPieChart from "@/components/ElectionPieChart";
import {
  PROFILE_COLORS,
  type PlannedRoute,
  type RouteProfile,
  type RouteHazard,
  type Waypoint,
} from "@/lib/routing";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const DRAW_MODE_MAP: Record<DrawingTool, string> = {
  Point: "draw_point",
  LineString: "draw_line_string",
  Polygon: "draw_polygon",
  Rectangle: "draw_rectangle",
};

// Layers that have their own click popups — elevation is suppressed when these are hit
const INTERACTIVE_LAYER_IDS = new Set([
  "cell-towers-gsm",
  "cell-towers-umts",
  "cell-towers-lte",
  "cell-towers-cdma",
  "roads-line",
  "bridges-symbol",
  "railways-line",
  "municipalities-fill",
]);

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
  plannedRoute?: PlannedRoute | null;
  routeProfile?: RouteProfile;
  routeWaypoints?: Waypoint[];
  addingWaypoint?: boolean;
  onWaypointClick?: (coords: [number, number]) => void;
  routeHazards?: RouteHazard[];
  focusedHazard?: RouteHazard | null;
  routeCoverageGaps?: GeoJSON.Geometry | null;
  // Tool / drawing state (lifted from MapView to MapWithNav)
  activeTool?: MapTool;
  activeDrawingTool?: DrawingTool | null;
  activeDrawingColour?: string;
  onDrawToolChange?: (t: DrawingTool | null) => void;
  onDrawColourChange?: (hex: string) => void;
  onDrawSelectionChange?: (has: boolean) => void;
  onMeasurementUpdate?: (m: MeasurementState | null) => void;
}

export interface MapViewHandle {
  getMapScreenshot: () => string | undefined;
  deleteDrawingSelected: () => void;
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

// ── Measurement math helpers ───────────────────────────────────────────────

export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const c =
    sinDLat * sinDLat +
    Math.cos((a[1] * Math.PI) / 180) *
      Math.cos((b[1] * Math.PI) / 180) *
      sinDLon *
      sinDLon;
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

export function computeDistanceKm(points: [number, number][]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversineKm(points[i], points[i + 1]);
  }
  return total;
}

export function computeAreaKm2(points: [number, number][]): number {
  if (points.length < 3) return 0;
  const R = 6371;
  // Shoelace on geographic coordinates, projected equirectangularly at centroid lat
  const centLat = points.reduce((s, p) => s + p[1], 0) / points.length;
  const cosLat = Math.cos((centLat * Math.PI) / 180);
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const xi = points[i][0] * cosLat;
    const yi = points[i][1];
    const xj = points[j][0] * cosLat;
    const yj = points[j][1];
    area += xi * yj - xj * yi;
  }
  // Convert degrees² to km²: 1° lat ≈ 111.32 km
  return Math.abs(area / 2) * 111.32 * 111.32;
}

function buildMeasureFeatures(
  points: [number, number][],
  mode: "measure-distance" | "measure-area",
): GeoJSON.FeatureCollection {
  if (points.length === 0) return { type: "FeatureCollection", features: [] };
  const features: GeoJSON.Feature[] = [];
  // Vertex circles
  for (const pt of points) {
    features.push({
      type: "Feature",
      properties: { featureRole: "vertex" },
      geometry: { type: "Point", coordinates: pt },
    });
  }
  // Line / polygon outline
  if (points.length >= 2) {
    if (mode === "measure-area" && points.length >= 3) {
      features.push({
        type: "Feature",
        properties: { featureRole: "fill" },
        geometry: {
          type: "Polygon",
          coordinates: [[...points, points[0]]],
        },
      });
    } else {
      features.push({
        type: "Feature",
        properties: { featureRole: "line" },
        geometry: { type: "LineString", coordinates: points },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

function clearMeasureSources(map: mapboxgl.Map) {
  const src = map.getSource("measure-source") as
    | mapboxgl.GeoJSONSource
    | undefined;
  src?.setData({ type: "FeatureCollection", features: [] });
}

const EMPTY_COLLECTION: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function towerToCirclePolygon(
  lng: number,
  lat: number,
  radiusM: number,
): GeoJSON.Polygon {
  const latRad = (lat * Math.PI) / 180;
  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.cos(latRad));
  const coords: [number, number][] = Array.from({ length: 65 }, (_, i) => {
    const a = (i / 64) * 2 * Math.PI;
    return [lng + dLng * Math.sin(a), lat + dLat * Math.cos(a)];
  });
  return { type: "Polygon", coordinates: [coords] };
}

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

function buildCoverageCircles(
  data: GeoJSON.FeatureCollection,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: data.features
      .filter(
        (f) =>
          f.geometry.type === "Point" &&
          f.properties != null &&
          (f.properties.range_m ?? 0) > 0,
      )
      .map((f) => {
        const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
        const r = (f.properties?.range_m as number) ?? 500;
        return {
          type: "Feature" as const,
          properties: f.properties,
          geometry: towerToCirclePolygon(lng, lat, r),
        };
      }),
  };
}

async function fetchCellTowers(
  map: mapboxgl.Map,
  rawDataRef: { current: GeoJSON.FeatureCollection },
  visRef: { current: LayerVisibility },
  signal?: AbortSignal,
): Promise<void> {
  const bbox = getBbox(map);
  if (!bbox) return;

  try {
    const res = await fetch(`/api/cell-towers?bbox=${bbox}`, { signal });
    if (!res.ok) return;
    const data = (await res.json()) as GeoJSON.FeatureCollection;
    rawDataRef.current = data;
    (map.getSource("cell-towers-source") as mapboxgl.GeoJSONSource).setData(
      filterByEnabled(data, visRef.current),
    );
    if (visRef.current.cellCoverageCircles) {
      (
        map.getSource("coverage-circles-source") as mapboxgl.GeoJSONSource
      )?.setData(buildCoverageCircles(data));
    }
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") return;
    console.error("[cell-towers] fetch failed", err);
  }
}

async function fetchLayer(
  map: mapboxgl.Map,
  sourceId: string,
  endpoint: string,
  signal?: AbortSignal,
): Promise<void> {
  const bbox = getBbox(map);
  if (!bbox) return;
  try {
    const res = await fetch(`${endpoint}?bbox=${bbox}`, { signal });
    if (!res.ok) return;
    const data = (await res.json()) as GeoJSON.FeatureCollection;
    (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(data);
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") return;
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
  signal?: AbortSignal,
): Promise<void> {
  const bbox = getBbox(map);
  if (!bbox) return;

  try {
    const res = await fetch(
      `/api/custom-layers/${layerId}/features?bbox=${bbox}`,
      { signal },
    );
    if (!res.ok) return;
    const data = (await res.json()) as GeoJSON.FeatureCollection;

    await ensureMilsymbolImages(map, data.features);

    (
      map.getSource(`custom-layer-${layerId}`) as mapboxgl.GeoJSONSource
    )?.setData(data);
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") return;
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
      "line-width": 5,
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
      "circle-radius": 11,
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

function registerCustomLayerClickHandlers(
  map: mapboxgl.Map,
  layerId: string,
  addingWaypointRef: { current: boolean },
) {
  const sourceId = `custom-layer-${layerId}`;

  for (const suffix of ["-fill", "-line", "-circle", "-symbol"]) {
    const fullId = `${sourceId}${suffix}`;

    map.on("click", fullId, (e) => {
      if (addingWaypointRef.current) return;
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

const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  {
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
    plannedRoute = null,
    routeProfile = "driving",
    routeWaypoints = [],
    addingWaypoint = false,
    onWaypointClick,
    routeHazards = [],
    focusedHazard = null,
    routeCoverageGaps = null,
    activeTool = "grab",
    activeDrawingTool = null,
    activeDrawingColour = COLOUR_PALETTE[0].hex,
    onDrawToolChange,
    onDrawColourChange,
    onDrawSelectionChange,
    onMeasurementUpdate,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const styleLoadedRef = useRef(false);
  const eventsAttachedRef = useRef(false);

  useImperativeHandle(ref, () => ({
    getMapScreenshot: () => {
      return mapRef.current?.getCanvas().toDataURL("image/png");
    },
    deleteDrawingSelected: () => {
      drawRef.current?.trash();
    },
  }));

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
  const activeDrawingColourRef = useRef<string>(activeDrawingColour);
  const activeDrawingToolRef = useRef<DrawingTool | null>(null);
  const pendingDrawFeatureRef = useRef<GeoJSON.Feature | null>(null);

  // Tool / measurement state
  const activeToolRef = useRef<MapTool>(activeTool);
  const measurePointsRef = useRef<[number, number][]>([]);
  const onMeasurementUpdateRef = useRef(onMeasurementUpdate);
  onMeasurementUpdateRef.current = onMeasurementUpdate;

  // Elevation marker + popup (both replaced on each click, cleared on teardown)
  const elevationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const elevationPopupRef = useRef<mapboxgl.Popup | null>(null);

  // Always-current ref for onInfoPanel — style.load closure would otherwise capture stale prop
  const onInfoPanelRef = useRef(onInfoPanel);
  onInfoPanelRef.current = onInfoPanel;

  // Route layer refs
  const addingWaypointRef = useRef(addingWaypoint);
  const onWaypointClickRef = useRef(onWaypointClick);
  const waypointMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const hazardFocusMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const hazardFocusPopupRef = useRef<mapboxgl.Popup | null>(null);

  // Custom layer registration
  const registeredCustomLayerIdsRef = useRef<Set<string>>(new Set());
  const enabledCustomLayerIdsRef = useRef<Set<string>>(enabledCustomLayerIds);

  // Abort controllers — each cancels its previous in-flight fetch on new moveend
  const cellTowersAbortRef = useRef<AbortController | null>(null);
  const roadsAbortRef = useRef<AbortController | null>(null);
  const bridgesAbortRef = useRef<AbortController | null>(null);
  const railwaysAbortRef = useRef<AbortController | null>(null);
  const customLayerAbortRefs = useRef<Map<string, AbortController>>(new Map());

  // UI state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogFeatureType, setDialogFeatureType] =
    useState<DrawingTool | null>(null);

  // ── Map initialisation (one-shot) ─────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/standard",
      center,
      zoom,
      preserveDrawingBuffer: true,
    });

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
          "fill-color": "#38bdf8",
          "fill-opacity": 0.06,
        },
      });
      // Glow layer for visibility
      map.addLayer({
        id: "aoi-outline-glow",
        type: "line",
        source: "aoi-source",
        paint: {
          "line-color": "#38bdf8",
          "line-width": 16,
          "line-blur": 6,
          "line-opacity": 0.7,
        },
      });
      map.addLayer({
        id: "aoi-outline",
        type: "line",
        source: "aoi-source",
        paint: {
          "line-color": "#ffffff",
          "line-width": 2,
        },
      });
      map.addLayer({
        id: "aoi-outline-outer",
        type: "line",
        source: "aoi-source",
        paint: {
          "line-color": "#38bdf8",
          "line-width": 6,
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
        slot: "top",
        filter: ["has", "point_count"],
        layout: { visibility: clustersVisible ? "visible" : "none" },
        paint: {
          "circle-color": "#f97316",
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
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
        },
      });

      // Cluster count labels
      map.addLayer({
        id: "cell-towers-cluster-count",
        type: "symbol",
        source: "cell-towers-source",
        slot: "top",
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
          slot: "top",
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
            if (addingWaypointRef.current) return;
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
          onDrawSelectionChange?.(e.features.length > 0);
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
        registerCustomLayerClickHandlers(map, layer.id, addingWaypointRef);
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
          "hillshade-exaggeration": 0.15,
          "hillshade-illumination-direction": 335,
          "hillshade-shadow-color": "#1e3040",
          "hillshade-highlight-color": "#8ab8cc",
          "hillshade-accent-color": "#1e3040",
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
            "rgba(80,200,110,0.18)",
            "scrub",
            "rgba(140,195,80,0.13)",
            "grass",
            "rgba(160,220,100,0.10)",
            "crop",
            "rgba(180,230,110,0.10)",
            "snow",
            "rgba(210,235,255,0.12)",
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
        id: "municipality-highlight-fill",
        type: "fill",
        source: "municipality-highlight-source",
        slot: "top",
        paint: {
          "fill-color": "#ffffff",
          "fill-opacity": 0.08,
        },
      });
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
      // Dark halo casing renders below the colour line for contrast
      map.addLayer({
        id: "roads-line-casing",
        type: "line",
        minzoom: 12,
        source: "roads-source",
        layout: { visibility: vis.roads ? "visible" : "none" },
        paint: {
          "line-color": "#0f172a",
          "line-width": ["interpolate", ["linear"], ["zoom"], 12, 2, 14, 4],
          "line-opacity": 0.45,
        },
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
            "#94a3b8",
          ],
          "line-width": ["interpolate", ["linear"], ["zoom"], 12, 1, 14, 2.5],
          "line-opacity": 0.6,
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
          "line-width": 3,
          "line-dasharray": [4, 2],
        },
      });

      // Click popups for infrastructure layers
      map.on("click", "roads-line", (e) => {
        if (addingWaypointRef.current) return;
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
        if (addingWaypointRef.current) return;
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
        if (addingWaypointRef.current) return;
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
        if (addingWaypointRef.current) return;
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

        const rawElection = p.election_data as string | null;
        const electionData = rawElection
          ? (JSON.parse(rawElection) as Record<string, number>)
          : null;

        onInfoPanelRef.current?.({
          title: name,
          rows,
          component: electionData ? (
            <ElectionPieChart data={electionData} />
          ) : null,
        });
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
          cellTowersAbortRef.current?.abort();
          const cellCtrl = new AbortController();
          cellTowersAbortRef.current = cellCtrl;
          fetchCellTowers(
            map,
            rawTowerDataRef,
            layerVisibilityRef,
            cellCtrl.signal,
          );

          if (map.getZoom() >= 12) {
            roadsAbortRef.current?.abort();
            const roadsCtrl = new AbortController();
            roadsAbortRef.current = roadsCtrl;
            fetchLayer(map, "roads-source", "/api/roads", roadsCtrl.signal);

            bridgesAbortRef.current?.abort();
            const bridgesCtrl = new AbortController();
            bridgesAbortRef.current = bridgesCtrl;
            fetchLayer(
              map,
              "bridges-source",
              "/api/bridges",
              bridgesCtrl.signal,
            );
          }

          railwaysAbortRef.current?.abort();
          const railCtrl = new AbortController();
          railwaysAbortRef.current = railCtrl;
          fetchLayer(map, "railways-source", "/api/railways", railCtrl.signal);

          for (const layerId of enabledCustomLayerIdsRef.current) {
            if (registeredCustomLayerIdsRef.current.has(layerId)) {
              customLayerAbortRefs.current.get(layerId)?.abort();
              const ctrl = new AbortController();
              customLayerAbortRefs.current.set(layerId, ctrl);
              void fetchCustomLayerFeatures(map, layerId, ctrl.signal);
            }
          }
        });

        {
          cellTowersAbortRef.current?.abort();
          const cellCtrl = new AbortController();
          cellTowersAbortRef.current = cellCtrl;
          fetchCellTowers(
            map,
            rawTowerDataRef,
            layerVisibilityRef,
            cellCtrl.signal,
          );
        }
        if (map.getZoom() >= 12) {
          roadsAbortRef.current?.abort();
          const roadsCtrl = new AbortController();
          roadsAbortRef.current = roadsCtrl;
          fetchLayer(map, "roads-source", "/api/roads", roadsCtrl.signal);

          bridgesAbortRef.current?.abort();
          const bridgesCtrl = new AbortController();
          bridgesAbortRef.current = bridgesCtrl;
          fetchLayer(map, "bridges-source", "/api/bridges", bridgesCtrl.signal);
        }
        {
          railwaysAbortRef.current?.abort();
          const railCtrl = new AbortController();
          railwaysAbortRef.current = railCtrl;
          fetchLayer(map, "railways-source", "/api/railways", railCtrl.signal);
        }

        // General click handler — routed by active tool
        map.on("click", async (e) => {
          const { lng, lat } = e.lngLat;

          // Waypoint intercept takes highest priority
          if (addingWaypointRef.current) {
            onWaypointClickRef.current?.([lng, lat]);
            return;
          }

          const tool = activeToolRef.current;

          // Grab mode — map panning only, no click actions
          if (tool === "grab") return;

          // Measure modes — accumulate a point and update overlay
          if (tool === "measure-distance" || tool === "measure-area") {
            measurePointsRef.current = [
              ...measurePointsRef.current,
              [lng, lat],
            ];
            const pts = measurePointsRef.current;
            const src = map.getSource("measure-source") as
              | mapboxgl.GeoJSONSource
              | undefined;
            src?.setData(buildMeasureFeatures(pts, tool));
            const m =
              tool === "measure-distance"
                ? { distance_km: computeDistanceKm(pts) }
                : { area_km2: computeAreaKm2(pts) };
            onMeasurementUpdateRef.current?.(m);
            return;
          }

          // Click mode — existing elevation + interactive-layer logic
          elevationMarkerRef.current?.remove();
          elevationMarkerRef.current = null;
          elevationPopupRef.current?.remove();
          elevationPopupRef.current = null;

          const hitInteractive = map
            .queryRenderedFeatures(e.point)
            .some(
              (f) =>
                f.layer != null &&
                (INTERACTIVE_LAYER_IDS.has(f.layer.id) ||
                  f.layer.id.startsWith("custom-layer-")),
            );
          if (hitInteractive) return;

          try {
            const res = await fetch(
              `/api/elevation?lng=${lng.toFixed(6)}&lat=${lat.toFixed(6)}`,
            );
            if (!res.ok) return;
            const data = (await res.json()) as {
              elevation_m: number | null;
              aoi_id?: string;
              dist_m?: number;
            };
            if (data.elevation_m === null) return;

            const el = document.createElement("div");
            el.style.cssText =
              "width:14px;height:14px;border-radius:50%;" +
              "background:#facc15;border:2px solid #fff;" +
              "box-shadow:0 0 6px rgba(0,0,0,0.6);";
            elevationMarkerRef.current = new mapboxgl.Marker({ element: el })
              .setLngLat([lng, lat])
              .addTo(map);

            elevationPopupRef.current = new mapboxgl.Popup({
              className: "aurora-popup",
              offset: 15,
            })
              .setLngLat([lng, lat])
              .setHTML(
                popupStyle("Terrain Elevation", [
                  ["Elevation", `${data.elevation_m.toFixed(1)} m`],
                  ["Coordinates", `${lat.toFixed(4)}°N  ${lng.toFixed(4)}°E`],
                  ["AOI", data.aoi_id ?? "—"],
                  ["Source", "NLS Finland DEM (50 m)"],
                  [
                    "Source dist",
                    data.dist_m != null ? `${data.dist_m.toFixed(0)} m` : "—",
                  ],
                ]),
              )
              .addTo(map);
          } catch {
            // Elevation is supplementary — fail silently
          }
        });

        // Double-click in measure mode — finalise without adding duplicate point
        map.on("dblclick", (e) => {
          const tool = activeToolRef.current;
          if (tool !== "measure-distance" && tool !== "measure-area") return;
          e.preventDefault();
          // The preceding click event already added the last point; pop the duplicate
          if (measurePointsRef.current.length > 0) {
            measurePointsRef.current = measurePointsRef.current.slice(0, -1);
            const pts = measurePointsRef.current;
            const src = map.getSource("measure-source") as
              | mapboxgl.GeoJSONSource
              | undefined;
            src?.setData(buildMeasureFeatures(pts, tool));
          }
        });

        eventsAttachedRef.current = true;
      }

      // ── Route planning layer ───────────────────────────────────────────
      map.addSource("route-source", {
        type: "geojson",
        data: EMPTY_COLLECTION,
      });
      // No slot — non-slotted layers render above slot:"top" layers in Standard style,
      // so route must be slotless and added after roads to win the z-order battle.
      map.addLayer({
        id: "route-line-outline",
        type: "line",
        source: "route-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": 28,
          "line-opacity": 0.4,
        },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": PROFILE_COLORS["driving"],
          "line-width": 16,
          "line-opacity": 1.0,
        },
      });

      // ── Route hazard layers ────────────────────────────────────────────
      map.addSource("route-hazards-source", {
        type: "geojson",
        data: EMPTY_COLLECTION,
      });
      map.addLayer({
        id: "route-hazards-info",
        type: "circle",
        source: "route-hazards-source",
        filter: ["==", ["get", "severity"], "info"],
        paint: {
          "circle-color": "#94a3b8",
          "circle-radius": 7,
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 1.5,
        },
      });
      map.addLayer({
        id: "route-hazards-warning",
        type: "circle",
        source: "route-hazards-source",
        filter: ["==", ["get", "severity"], "warning"],
        paint: {
          "circle-color": "#f97316",
          "circle-radius": 9,
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "route-hazards-critical",
        type: "circle",
        source: "route-hazards-source",
        filter: ["==", ["get", "severity"], "critical"],
        paint: {
          "circle-color": "#ff2d2d",
          "circle-radius": 11,
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2.5,
        },
      });

      // ── Coverage gap overlay ───────────────────────────────────────────
      map.addSource("route-coverage-gaps-source", {
        type: "geojson",
        data: EMPTY_COLLECTION,
      });
      map.addLayer({
        id: "route-coverage-gaps-line",
        type: "line",
        source: "route-coverage-gaps-source",
        slot: "top",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#ef4444",
          "line-width": 6,
          "line-dasharray": [6, 4],
          "line-opacity": 0.85,
        },
      });

      // ── Cell tower coverage circles ────────────────────────────────────
      map.addSource("coverage-circles-source", {
        type: "geojson",
        data: EMPTY_COLLECTION,
      });
      map.addLayer({
        id: "coverage-circles-fill",
        type: "fill",
        source: "coverage-circles-source",
        slot: "middle",
        layout: {
          visibility: DEFAULT_LAYER_VISIBILITY.cellCoverageCircles
            ? "visible"
            : "none",
        },
        paint: { "fill-color": "#f97316", "fill-opacity": 0.15 },
      });
      map.addLayer({
        id: "coverage-circles-line",
        type: "line",
        source: "coverage-circles-source",
        slot: "bottom",
        layout: {
          visibility: DEFAULT_LAYER_VISIBILITY.cellCoverageCircles
            ? "visible"
            : "none",
        },
        paint: {
          "line-color": "#f97316",
          "line-width": 1.5,
          "line-opacity": 0.55,
        },
      });

      // ── Measurement overlay ────────────────────────────────────────────
      map.addSource("measure-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "measure-fill",
        type: "fill",
        source: "measure-source",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": "#06b6d4", "fill-opacity": 0.12 },
      });
      map.addLayer({
        id: "measure-line",
        type: "line",
        source: "measure-source",
        filter: [
          "in",
          ["geometry-type"],
          ["literal", ["LineString", "Polygon"]],
        ] as mapboxgl.FilterSpecification,
        paint: {
          "line-color": "#06b6d4",
          "line-width": 2,
          "line-dasharray": [4, 2],
        },
      });
      map.addLayer({
        id: "measure-vertices",
        type: "circle",
        source: "measure-source",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-color": "#06b6d4",
          "circle-radius": 5,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
        },
      });

      styleLoadedRef.current = true;
    });

    const registeredIds = registeredCustomLayerIdsRef.current;
    const customAborts = customLayerAbortRefs.current;
    return () => {
      cellTowersAbortRef.current?.abort();
      roadsAbortRef.current?.abort();
      bridgesAbortRef.current?.abort();
      railwaysAbortRef.current?.abort();
      for (const ctrl of customAborts.values()) ctrl.abort();

      if (highlightAnimFrameRef.current !== null) {
        cancelAnimationFrame(highlightAnimFrameRef.current);
      }
      elevationMarkerRef.current?.remove();
      elevationMarkerRef.current = null;
      elevationPopupRef.current?.remove();
      elevationPopupRef.current = null;
      for (const m of waypointMarkersRef.current) m.remove();
      waypointMarkersRef.current = [];
      hazardFocusMarkerRef.current?.remove();
      hazardFocusMarkerRef.current = null;
      hazardFocusPopupRef.current?.remove();
      hazardFocusPopupRef.current = null;
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
        registerCustomLayerClickHandlers(map, layer.id, addingWaypointRef);
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

  // ── Sync active tool → ref, cursor, and measure state ─────────────────
  useEffect(() => {
    activeToolRef.current = activeTool;

    const map = mapRef.current;
    if (!map) return;

    const canvas = map.getCanvas();
    if (activeTool === "grab") {
      canvas.style.cursor = "";
    } else if (activeTool === "click") {
      canvas.style.cursor = "default";
    } else {
      canvas.style.cursor = "crosshair";
    }

    if (activeTool !== "measure-distance" && activeTool !== "measure-area") {
      measurePointsRef.current = [];
      if (styleLoadedRef.current) {
        clearMeasureSources(map);
      }
      onMeasurementUpdateRef.current?.(null);
    }
  }, [activeTool]);

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

  // ── Sync addingWaypoint ref and cursor ───────────────────────────────
  useEffect(() => {
    addingWaypointRef.current = addingWaypoint;
    onWaypointClickRef.current = onWaypointClick;

    const map = mapRef.current;
    if (!map) return;

    const canvas = map.getCanvas();
    if (addingWaypoint) {
      // Lock the crosshair: disable Mapbox's dragPan (which overrides cursor
      // to "grabbing" on mousedown) and pin the cursor via a mousemove
      // listener so Mapbox's hover handlers can't reset it.
      map.dragPan.disable();
      canvas.style.cursor = "crosshair";
      const keepCrosshair = () => {
        canvas.style.cursor = "crosshair";
      };
      canvas.addEventListener("mousemove", keepCrosshair);
      return () => {
        canvas.removeEventListener("mousemove", keepCrosshair);
      };
    } else {
      map.dragPan.enable();
      canvas.style.cursor = "";
    }
  }, [addingWaypoint, onWaypointClick]);

  // ── Sync planned route geometry and line color ────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;

    const source = map.getSource("route-source") as
      | mapboxgl.GeoJSONSource
      | undefined;
    if (!source) return;

    if (plannedRoute) {
      source.setData({
        type: "Feature",
        properties: {},
        geometry: plannedRoute.geometry,
      });
    } else {
      source.setData(EMPTY_COLLECTION);
    }

    map.setPaintProperty(
      "route-line",
      "line-color",
      PROFILE_COLORS[routeProfile],
    );
  }, [plannedRoute, routeProfile]);

  // ── Sync waypoint markers ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;

    // Remove old markers
    for (const m of waypointMarkersRef.current) m.remove();
    waypointMarkersRef.current = [];

    if (!map) return;

    const markers = routeWaypoints.map((wp, i) => {
      const el = document.createElement("div");
      el.style.cssText = [
        "width:22px;height:22px;border-radius:50%;",
        `background:${PROFILE_COLORS[routeProfile]};`,
        "border:2px solid #fff;",
        "display:flex;align-items:center;justify-content:center;",
        "font-size:10px;font-weight:700;color:#fff;",
        "box-shadow:0 2px 6px rgba(0,0,0,0.5);",
        "cursor:default;",
      ].join("");
      el.textContent = String(i + 1);

      return new mapboxgl.Marker({ element: el })
        .setLngLat(wp.coordinates)
        .addTo(map);
    });

    waypointMarkersRef.current = markers;
  }, [routeWaypoints, routeProfile]);

  // ── Sync route hazard circles ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;

    const source = map.getSource("route-hazards-source") as
      | mapboxgl.GeoJSONSource
      | undefined;
    if (!source) return;

    source.setData({
      type: "FeatureCollection",
      features: routeHazards.map((h) => ({
        type: "Feature" as const,
        properties: {
          severity: h.severity,
          id: h.id,
          message: h.message,
          type: h.type,
        },
        geometry: { type: "Point" as const, coordinates: h.coordinates },
      })),
    });
  }, [routeHazards]);

  // ── Sync coverage gap overlay ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;

    const source = map.getSource("route-coverage-gaps-source") as
      | mapboxgl.GeoJSONSource
      | undefined;
    if (!source) return;

    if (routeCoverageGaps) {
      source.setData({
        type: "Feature",
        properties: {},
        geometry: routeCoverageGaps,
      });
    } else {
      source.setData(EMPTY_COLLECTION);
    }
  }, [routeCoverageGaps]);

  // ── Focused hazard: fly-to + marker + popup ───────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    hazardFocusMarkerRef.current?.remove();
    hazardFocusMarkerRef.current = null;
    hazardFocusPopupRef.current?.remove();
    hazardFocusPopupRef.current = null;

    if (!map || !focusedHazard) return;

    map.flyTo({ center: focusedHazard.coordinates, zoom: 15, duration: 800 });

    const color =
      focusedHazard.severity === "critical"
        ? "#ef4444"
        : focusedHazard.severity === "warning"
          ? "#eab308"
          : "#94a3b8";

    const severityLabel =
      focusedHazard.severity === "critical"
        ? "CRITICAL"
        : focusedHazard.severity === "warning"
          ? "WARNING"
          : "INFO";

    const p = focusedHazard.properties;
    const rows: [string, unknown][] =
      focusedHazard.type === "bridge"
        ? [
            [
              "Severity",
              `<span style="color:${color};font-weight:700">${severityLabel}</span>`,
            ],
            ...(p.name ? [["Name", p.name] as [string, unknown]] : []),
            ...(p.max_vehicle_mass_t != null
              ? [
                  ["Mass limit", `${p.max_vehicle_mass_t} t`] as [
                    string,
                    unknown,
                  ],
                ]
              : []),
            ...(p.max_bogie_mass_t != null
              ? [
                  ["Bogie limit", `${p.max_bogie_mass_t} t`] as [
                    string,
                    unknown,
                  ],
                ]
              : []),
            ...(p.max_axle_mass_t != null
              ? [["Axle limit", `${p.max_axle_mass_t} t`] as [string, unknown]]
              : []),
            ...(p.height_restriction_m != null
              ? [
                  ["Height limit", `${p.height_restriction_m} m`] as [
                    string,
                    unknown,
                  ],
                ]
              : []),
            ...(p.status ? [["Status", p.status] as [string, unknown]] : []),
          ]
        : [
            [
              "Severity",
              `<span style="color:${color};font-weight:700">${severityLabel}</span>`,
            ],
            ...(p.max_mass_kg != null
              ? [["Mass limit", `${p.max_mass_kg} kg`] as [string, unknown]]
              : []),
            ...(p.max_bogie_mass_kg != null
              ? [
                  ["Bogie limit", `${p.max_bogie_mass_kg} kg`] as [
                    string,
                    unknown,
                  ],
                ]
              : []),
            ...(p.max_axle_mass_kg != null
              ? [
                  ["Axle limit", `${p.max_axle_mass_kg} kg`] as [
                    string,
                    unknown,
                  ],
                ]
              : []),
            ...(p.width_cm != null
              ? [["Width", `${p.width_cm} cm`] as [string, unknown]]
              : []),
            ...(p.max_height_cm != null
              ? [["Height limit", `${p.max_height_cm} cm`] as [string, unknown]]
              : []),
            ...(p.condition_class != null
              ? [["Condition class", p.condition_class] as [string, unknown]]
              : []),
            ...(p.condition_text
              ? [["Condition", p.condition_text] as [string, unknown]]
              : []),
            ...(p.rut_depth_mm != null
              ? [["Rut depth", `${p.rut_depth_mm} mm`] as [string, unknown]]
              : []),
          ];

    const title =
      focusedHazard.type === "bridge" ? "Bridge hazard" : "Road hazard";
    const html = popupStyle(title, rows);

    hazardFocusPopupRef.current = new mapboxgl.Popup({
      className: "aurora-popup",
      maxWidth: "260px",
    })
      .setLngLat(focusedHazard.coordinates)
      .setHTML(html)
      .addTo(map);

    hazardFocusMarkerRef.current = new mapboxgl.Marker({ color, scale: 0.8 })
      .setLngLat(focusedHazard.coordinates)
      .addTo(map);
  }, [focusedHazard]);

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

  function handleCancelDrawing() {
    onDrawToolChange?.(null);
    drawRef.current?.changeMode("simple_select");
    onCancelDrawing?.();
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      <FeatureDialog
        open={dialogOpen}
        featureType={dialogFeatureType || undefined}
        onSave={handleFeatureSave}
        onDiscard={handleFeatureDiscard}
      />
    </div>
  );
});

export default MapView;
