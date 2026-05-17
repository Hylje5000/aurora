"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import AreaNav from "./AreaNav";
import MapView, { type MapViewHandle } from "./MapView";
import MapToolbar from "./MapToolbar";
import LayerPanel from "./LayerPanel";
import InfoPanel, { type InfoPanelData } from "./InfoPanel";
import WeatherWidget from "./WeatherWidget";
import DatePicker from "./DatePicker";
import RoutePanel, { type RoutePanelHandle } from "./RoutePanel";
import SummaryModal from "./SummaryModal";
import { pdf } from "@react-pdf/renderer";
import { RoutePDF } from "./RoutePDF";
import { AREAS_OF_INTEREST } from "@/lib/areas";
import {
  DEFAULT_LAYER_VISIBILITY,
  type LayerKey,
  type LayerVisibility,
} from "@/lib/layers";
import { COLOUR_PALETTE, type CustomLayer } from "@/lib/customLayers";
import type { DrawingTool } from "@/lib/customLayers";
import type {
  PlannedRoute,
  RouteHazard,
  RouteIntelligence,
  RouteProfile,
  VehicleProfile,
  Waypoint,
} from "@/lib/routing";
import {
  DEFAULT_MAP_TOOL,
  type MapTool,
  type MeasurementState,
} from "@/lib/mapTool";

export default function MapWithNav() {
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>("turku");
  const [selectedDay, setSelectedDay] = useState<{
    month: number;
    day: number;
  }>(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, day: now.getDate() };
  });
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(
    DEFAULT_LAYER_VISIBILITY,
  );
  const [customLayers, setCustomLayers] = useState<CustomLayer[]>([]);
  const [enabledCustomLayerIds, setEnabledCustomLayerIds] = useState<
    Set<string>
  >(new Set());
  const [activeDrawingLayerId, setActiveDrawingLayerId] = useState<
    string | null
  >(null);
  const [infoPanelData, setInfoPanelData] = useState<InfoPanelData | null>(
    null,
  );

  // Panel collapse coordination
  const [infoPanelCollapsed, setInfoPanelCollapsed] = useState(false);
  const [routePanelExpanded, setRoutePanelExpanded] = useState(true);

  // Route planning state
  const [routePanelOpen, setRoutePanelOpen] = useState(false);
  const [plannedRoute, setPlannedRoute] = useState<PlannedRoute | null>(null);
  const [routeProfile, setRouteProfile] = useState<RouteProfile>("driving");
  const [routeWaypoints, setRouteWaypoints] = useState<Waypoint[]>([]);
  const [addingWaypoint, setAddingWaypoint] = useState(false);
  const routePanelRef = useRef<RoutePanelHandle | null>(null);
  const mapViewRef = useRef<MapViewHandle | null>(null);

  // Route intelligence state
  const [routeIntelligence, setRouteIntelligence] =
    useState<RouteIntelligence | null>(null);
  const [focusedHazard, setFocusedHazard] = useState<RouteHazard | null>(null);

  // AI Summary state
  const [routeSummary, setRouteSummary] = useState<string | null>(null);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);

  // Map toolbar state
  const [activeTool, setActiveTool] = useState<MapTool>(DEFAULT_MAP_TOOL);
  const [activeDrawingTool, setActiveDrawingTool] =
    useState<DrawingTool | null>(null);
  const [activeDrawingColour, setActiveDrawingColour] = useState<string>(
    COLOUR_PALETTE[0].hex,
  );
  const [measurement, setMeasurement] = useState<MeasurementState | null>(null);

  // Panel collapse coordination

  useEffect(() => {
    fetch("/api/custom-layers")
      .then((r) => (r.ok ? r.json() : []))
      .then((layers: CustomLayer[]) => {
        setCustomLayers(layers);
        setEnabledCustomLayerIds(new Set(layers.map((l: CustomLayer) => l.id)));
      })
      .catch(() => {});
  }, []);

  const handleToggle = useCallback((key: LayerKey) => {
    setLayerVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleCommsToggle = useCallback(() => {
    setLayerVisibility((prev) => {
      const anyOn =
        prev.cellGSM || prev.cellUMTS || prev.cellLTE || prev.cellCDMA;
      return {
        ...prev,
        cellGSM: !anyOn,
        cellUMTS: !anyOn,
        cellLTE: !anyOn,
        cellCDMA: !anyOn,
      };
    });
  }, []);

  const handleToggleLayer = useCallback((id: string) => {
    setEnabledCustomLayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  async function handleCreateLayer(name: string, color: string) {
    try {
      const res = await fetch("/api/custom-layers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      if (res.ok) {
        const layer = (await res.json()) as CustomLayer;
        setCustomLayers((prev) => [...prev, layer]);
        setEnabledCustomLayerIds((prev) => new Set([...prev, layer.id]));
      }
    } catch {
      // graceful degradation — no DB
    }
  }

  function handleInfoPanel(data: InfoPanelData | null) {
    setInfoPanelData(data);
    if (data) {
      setInfoPanelCollapsed(false);
      setRoutePanelExpanded(false);
    }
  }

  function handleInfoPanelCollapsedChange(collapsed: boolean) {
    setInfoPanelCollapsed(collapsed);
    if (!collapsed) {
      // Expanding info panel → collapse route panel
      setRoutePanelExpanded(false);
    }
  }

  function handleRoutePanelExpandedChange(expanded: boolean) {
    setRoutePanelExpanded(expanded);
    if (expanded) {
      // Expanding route panel → collapse info panel
      setInfoPanelCollapsed(true);
    }
  }

  function handleWaypointClick(coords: [number, number]) {
    routePanelRef.current?.addWaypoint(coords);
    setAddingWaypoint(false);
  }

  function handleRouteChange(
    route: PlannedRoute | null,
    profile: RouteProfile,
    waypoints: Waypoint[],
  ) {
    setPlannedRoute(route);
    setRouteProfile(profile);
    setRouteWaypoints(waypoints);
  }

  function handleHazardsChange(intel: RouteIntelligence | null) {
    setRouteIntelligence(intel);
    if (!intel) {
      setFocusedHazard(null);
      setRouteSummary(null);
    }
  }

  function handleHazardFocus(hazard: RouteHazard) {
    setFocusedHazard(hazard);
    // Details shown in a map popup at the marker — no InfoPanel needed.
  }

  async function handleExportPDF(
    vehicle: VehicleProfile,
    intel: RouteIntelligence,
  ) {
    if (!plannedRoute || !mapViewRef.current) return;

    const screenshot = mapViewRef.current.getMapScreenshot();
    if (!screenshot) return;

    try {
      const blob = await pdf(
        <RoutePDF
          plannedRoute={plannedRoute}
          routeIntelligence={intel}
          routeSummary={routeSummary}
          routeProfile={routeProfile}
          vehicle={vehicle}
          mapScreenshot={screenshot}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Aurora_Route_Report_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export PDF:", err);
    }
  }

  async function handleDeleteLayer(id: string) {
    try {
      await fetch(`/api/custom-layers/${id}`, { method: "DELETE" });
    } catch {
      // graceful degradation
    }
    setCustomLayers((prev) => prev.filter((l) => l.id !== id));
    setEnabledCustomLayerIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (activeDrawingLayerId === id) {
      setActiveDrawingLayerId(null);
      setActiveDrawingTool(null);
    }
  }

  function handleToolChange(tool: MapTool) {
    setActiveTool(tool);
    setActiveDrawingTool(null);
    if (tool !== "measure-distance" && tool !== "measure-area") {
      setMeasurement(null);
    }
  }

  function handleDrawToolChange(tool: DrawingTool | null) {
    setActiveDrawingTool(tool);
    if (tool !== null) {
      setActiveTool("grab");
      setMeasurement(null);
    }
  }

  const handleCloseRoutePanel = useCallback(() => {
    setRoutePanelOpen(false);
    setAddingWaypoint(false);
  }, []);

  const handleSummaryModalOpen = useCallback(() => {
    setSummaryModalOpen(true);
  }, []);

  return (
    <div className="relative w-full h-full">
      <AreaNav selectedAreaId={selectedAreaId} onSelect={setSelectedAreaId} />

      {/* Route toggle button — only shown when RoutePanel is not mounted */}
      {!routePanelOpen && (
        <button
          onClick={() => {
            setRoutePanelOpen(true);
            setRoutePanelExpanded(true);
            setInfoPanelCollapsed(true);
          }}
          className="absolute bottom-10 right-4 z-10 rounded-lg px-4 py-2 text-sm font-bold tracking-wide text-white bg-blue-600 hover:bg-blue-700 border border-blue-500 transition-all backdrop-blur-sm"
          aria-label="Toggle route planning panel"
          data-testid="route-toggle-btn"
        >
          Plan a Route
        </button>
      )}

      <MapView
        ref={mapViewRef}
        selectedAreaId={selectedAreaId}
        layerVisibility={layerVisibility}
        customLayers={customLayers}
        enabledCustomLayerIds={enabledCustomLayerIds}
        activeDrawingLayerId={activeDrawingLayerId}
        onCancelDrawing={() => {
          setActiveDrawingLayerId(null);
          setActiveDrawingTool(null);
        }}
        onInfoPanel={handleInfoPanel}
        infoPanelOpen={infoPanelData !== null}
        plannedRoute={plannedRoute}
        routeProfile={routeProfile}
        routeWaypoints={routeWaypoints}
        addingWaypoint={addingWaypoint}
        onWaypointClick={handleWaypointClick}
        routeHazards={routeIntelligence?.hazards ?? []}
        routeCoverageGaps={routeIntelligence?.coverage?.gap_geometry ?? null}
        focusedHazard={focusedHazard}
        activeTool={activeTool}
        activeDrawingTool={activeDrawingTool}
        activeDrawingColour={activeDrawingColour}
        onDrawToolChange={handleDrawToolChange}
        onDrawColourChange={setActiveDrawingColour}
        onMeasurementUpdate={setMeasurement}
      />
      <MapToolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        measurement={measurement}
        activeDrawingLayerId={activeDrawingLayerId}
        activeDrawingLayerName={
          customLayers.find((l) => l.id === activeDrawingLayerId)?.name
        }
        activeDrawingTool={activeDrawingTool}
        onDrawToolChange={handleDrawToolChange}
        onCancelDrawing={() => {
          setActiveDrawingLayerId(null);
          setActiveDrawingTool(null);
        }}
      />
      <LayerPanel
        visibility={layerVisibility}
        onToggle={handleToggle}
        onToggleComms={handleCommsToggle}
        customLayerProps={{
          layers: customLayers,
          enabledLayerIds: enabledCustomLayerIds,
          activeDrawingLayerId,
          onCreateLayer: handleCreateLayer,
          onDeleteLayer: handleDeleteLayer,
          onToggleLayer: handleToggleLayer,
          onSetActiveDrawingLayer: setActiveDrawingLayerId,
        }}
      />
      {routePanelOpen && (
        <RoutePanel
          ref={routePanelRef}
          onAddingWaypointChange={setAddingWaypoint}
          onRouteChange={handleRouteChange}
          onHazardsChange={handleHazardsChange}
          onHazardFocus={handleHazardFocus}
          onExportPDF={handleExportPDF}
          expanded={routePanelExpanded}
          onExpandedChange={handleRoutePanelExpandedChange}
          onClose={handleCloseRoutePanel}
          onSummaryLoadingChange={() => {}}
          routeSummary={routeSummary}
          onSummaryChange={setRouteSummary}
          onSummaryModalOpen={handleSummaryModalOpen}
        />
      )}
      <InfoPanel
        data={infoPanelData}
        collapsed={infoPanelCollapsed}
        onCollapsedChange={handleInfoPanelCollapsedChange}
        onClose={() => {
          setInfoPanelData(null);
          setFocusedHazard(null);
        }}
      />
      {selectedAreaId && (
        <div className="absolute left-4 top-10 z-10 w-52 rounded-lg border border-slate-700 bg-slate-900/90 backdrop-blur-sm shadow-xl">
          {/* Area name + date picker merged into one compact row */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-700/40">
            <span className="text-xs font-bold text-white flex-1 truncate">
              {AREAS_OF_INTEREST.find((a) => a.id === selectedAreaId)?.name ??
                selectedAreaId}
            </span>
            <DatePicker
              bare
              month={selectedDay.month}
              day={selectedDay.day}
              onChange={(month, day) => setSelectedDay({ month, day })}
            />
          </div>
          <WeatherWidget
            bare
            region={selectedAreaId}
            month={selectedDay.month}
            day={selectedDay.day}
          />
        </div>
      )}
      <SummaryModal
        open={summaryModalOpen}
        summary={routeSummary}
        onClose={() => setSummaryModalOpen(false)}
      />
    </div>
  );
}
