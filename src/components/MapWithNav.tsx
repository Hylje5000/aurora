"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import AreaNav from "./AreaNav";
import MapView from "./MapView";
import LayerPanel from "./LayerPanel";
import CustomLayerPanel from "./CustomLayerPanel";
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
import type { PlannedRoute, RouteProfile, Waypoint } from "@/lib/routing";

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

  // Route planning state
  const [routePanelOpen, setRoutePanelOpen] = useState(false);
  const [plannedRoute, setPlannedRoute] = useState<PlannedRoute | null>(null);
  const [routeProfile, setRouteProfile] = useState<RouteProfile>("driving");
  const [routeWaypoints, setRouteWaypoints] = useState<Waypoint[]>([]);
  const [addingWaypoint, setAddingWaypoint] = useState(false);
  const routePanelRef = useRef<RoutePanelHandle | null>(null);

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

      {/* Route toggle button */}
      <button
        onClick={() => setRoutePanelOpen((o) => !o)}
        className={[
          "absolute top-4 right-20 z-10 rounded px-3 py-1.5 text-sm font-semibold text-white transition-all",
          "bg-black/60 backdrop-blur-sm hover:bg-black/80",
          routePanelOpen
            ? "border border-blue-400 shadow-[0_0_0_2px_#60a5fa]"
            : "border border-white/30",
        ].join(" ")}
        aria-label="Toggle route planning panel"
        data-testid="route-toggle-btn"
      >
        Route
      </button>

      <MapView
        selectedAreaId={selectedAreaId}
        layerVisibility={layerVisibility}
        customLayers={customLayers}
        enabledCustomLayerIds={enabledCustomLayerIds}
        activeDrawingLayerId={activeDrawingLayerId}
        onCancelDrawing={() => setActiveDrawingLayerId(null)}
        onInfoPanel={setInfoPanelData}
        infoPanelOpen={infoPanelData !== null}
        plannedRoute={plannedRoute}
        routeProfile={routeProfile}
        routeWaypoints={routeWaypoints}
        addingWaypoint={addingWaypoint}
        onWaypointClick={handleWaypointClick}
      />
      <LayerPanel visibility={layerVisibility} onToggle={handleToggle} />
      <CustomLayerPanel
        layers={customLayers}
        enabledLayerIds={enabledCustomLayerIds}
        activeDrawingLayerId={activeDrawingLayerId}
        onCreateLayer={handleCreateLayer}
        onDeleteLayer={handleDeleteLayer}
        onToggleLayer={handleToggleLayer}
        onSetActiveDrawingLayer={setActiveDrawingLayerId}
      />
      {routePanelOpen && (
        <RoutePanel
          ref={routePanelRef}
          onAddingWaypointChange={setAddingWaypoint}
          onRouteChange={handleRouteChange}
          onClose={() => {
            setRoutePanelOpen(false);
            setAddingWaypoint(false);
          }}
        />
      )}
      <InfoPanel data={infoPanelData} onClose={() => setInfoPanelData(null)} />
      {selectedAreaId && (
        <div className="absolute left-4 top-16 z-10 flex items-start gap-2">
          <WeatherWidget
            region={selectedAreaId}
            month={selectedDay.month}
            day={selectedDay.day}
          />
          <DatePicker
            month={selectedDay.month}
            day={selectedDay.day}
            onChange={(month, day) => setSelectedDay({ month, day })}
          />
        </div>
      )}
    </div>
  );
}
