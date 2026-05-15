"use client";

import { useState } from "react";
import AreaNav from "./AreaNav";
import MapView from "./MapView";

export default function MapWithNav() {
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  return (
    <div className="relative w-full h-full">
      <AreaNav selectedAreaId={selectedAreaId} onSelect={setSelectedAreaId} />
      <MapView selectedAreaId={selectedAreaId} />
    </div>
  );
}
