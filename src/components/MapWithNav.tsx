"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import AreaNav from "./AreaNav";
import MapView from "./MapView";
import LayerPanel from "./LayerPanel";
import InfoPanel, { type InfoPanelData } from "./InfoPanel";
import WeatherWidget from "./WeatherWidget";
import DatePicker from "./DatePicker";
import RoutePanel, { type RoutePanelHandle } from "./RoutePanel";
import {
  DEFAULT_LAYER_VISIBILITY,
  type LayerKey,
  type LayerVisibility,
} from "@/lib/layers";
import type { CustomLayer } from "@/lib/customLayers";
import type {
  PlannedRoute,
  RouteHazard,
  RouteIntelligence,
  RouteProfile,
  Waypoint,
} from "@/lib/routing";

export default function MapWithNav() {
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
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

  // Route intelligence state
  const [routeIntelligence, setRouteIntelligence] =
    useState<RouteIntelligence | null>(null);
  const [focusedHazard, setFocusedHazard] = useState<RouteHazard | null>(null);

  // Whenever infoPanelData becomes non-null (any municipality/elevation click),
  // guarantee the panel is uncollapsed and route panel is collapsed.
  useEffect(() => {
    if (infoPanelData) {
      setInfoPanelCollapsed(false);
      setRoutePanelExpanded(false);
    }
  }, [infoPanelData]);

  // Fetch all custom layers on mount
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
    if (!intel) setFocusedHazard(null);
  }

  function handleHazardFocus(hazard: RouteHazard) {
    setFocusedHazard(hazard);
    // Details shown in a map popup at the marker — no InfoPanel needed.
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
    }
  }

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
        selectedAreaId={selectedAreaId}
        layerVisibility={layerVisibility}
        customLayers={customLayers}
        enabledCustomLayerIds={enabledCustomLayerIds}
        activeDrawingLayerId={activeDrawingLayerId}
        onCancelDrawing={() => setActiveDrawingLayerId(null)}
        onInfoPanel={handleInfoPanel}
        infoPanelOpen={infoPanelData !== null}
        plannedRoute={plannedRoute}
        routeProfile={routeProfile}
        routeWaypoints={routeWaypoints}
        addingWaypoint={addingWaypoint}
        onWaypointClick={handleWaypointClick}
        routeHazards={routeIntelligence?.hazards ?? []}
        focusedHazard={focusedHazard}
      />
      <LayerPanel
        visibility={layerVisibility}
        onToggle={handleToggle}
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
          expanded={routePanelExpanded}
          onExpandedChange={handleRoutePanelExpandedChange}
          onClose={() => {
            setRoutePanelOpen(false);
            setAddingWaypoint(false);
          }}
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
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/40">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest flex-1">
              Date
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
    </div>
  );
}
