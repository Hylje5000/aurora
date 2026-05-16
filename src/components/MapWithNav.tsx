"use client";

import { useState, useCallback } from "react";
import AreaNav from "./AreaNav";
import MapView from "./MapView";
import LayerPanel from "./LayerPanel";
import InfoPanel, { type InfoPanelData } from "./InfoPanel";
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
  const [infoPanelData, setInfoPanelData] = useState<InfoPanelData | null>(
    null,
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
        onInfoPanel={setInfoPanelData}
      />
      <LayerPanel visibility={layerVisibility} onToggle={handleToggle} />
      <InfoPanel data={infoPanelData} onClose={() => setInfoPanelData(null)} />
    </div>
  );
}
