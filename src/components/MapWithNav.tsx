"use client";

import { useState, useCallback } from "react";
import AreaNav from "./AreaNav";
import MapView from "./MapView";
import LayerPanel from "./LayerPanel";
import {
  DEFAULT_LAYER_VISIBILITY,
  type LayerKey,
  type LayerVisibility,
} from "@/lib/layers";

export default function MapWithNav() {
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(
    DEFAULT_LAYER_VISIBILITY,
  );

  const handleToggle = useCallback((key: LayerKey) => {
    setLayerVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <div className="relative w-full h-full">
      <AreaNav selectedAreaId={selectedAreaId} onSelect={setSelectedAreaId} />
      <MapView
        selectedAreaId={selectedAreaId}
        layerVisibility={layerVisibility}
      />
      <LayerPanel visibility={layerVisibility} onToggle={handleToggle} />
    </div>
  );
}
