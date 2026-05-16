"use client";

import { useState, useCallback, useEffect } from "react";
import AreaNav from "./AreaNav";
import MapView from "./MapView";
import LayerPanel from "./LayerPanel";
import CustomLayerPanel from "./CustomLayerPanel";
import {
  DEFAULT_LAYER_VISIBILITY,
  type LayerKey,
  type LayerVisibility,
} from "@/lib/layers";
import type { CustomLayer } from "@/lib/customLayers";

export default function MapWithNav() {
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
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

  // Fetch all custom layers on mount
  useEffect(() => {
    fetch("/api/custom-layers")
      .then((r) => (r.ok ? r.json() : []))
      .then((layers: CustomLayer[]) => setCustomLayers(layers))
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
      }
    } catch {
      // graceful degradation — no DB
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
    }
  }

  return (
    <div className="relative w-full h-full">
      <AreaNav selectedAreaId={selectedAreaId} onSelect={setSelectedAreaId} />
      <MapView
        selectedAreaId={selectedAreaId}
        layerVisibility={layerVisibility}
        customLayers={customLayers}
        enabledCustomLayerIds={enabledCustomLayerIds}
        activeDrawingLayerId={activeDrawingLayerId}
        onCancelDrawing={() => setActiveDrawingLayerId(null)}
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
    </div>
  );
}
