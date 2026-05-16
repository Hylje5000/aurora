"use client";

import { useState } from "react";
import { type LayerKey, type LayerVisibility } from "@/lib/layers";

interface LayerPanelProps {
  visibility: LayerVisibility;
  onToggle: (key: LayerKey) => void;
}

interface LayerRowProps {
  label: string;
  dotColor: string;
  checked: boolean;
  onToggle: () => void;
}

function LayerRow({ label, dotColor, checked, onToggle }: LayerRowProps) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer group">
      <span className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: dotColor }}
        />
        <span className="text-slate-300 text-xs font-mono group-hover:text-white transition-colors">
          {label}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer flex-shrink-0"
      />
    </label>
  );
}

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="text-[9px] text-slate-500 tracking-widest font-mono uppercase pt-1 pb-0.5 border-t border-slate-700/60">
      {label}
    </div>
  );
}

export default function LayerPanel({ visibility, onToggle }: LayerPanelProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="absolute left-4 bottom-10 z-10 w-48 rounded-lg border border-slate-700 bg-slate-900/90 backdrop-blur-sm shadow-xl select-none touch-none">
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-slate-400 hover:text-white transition-colors"
        aria-expanded={open}
        aria-label="Toggle layer panel"
      >
        <span className="text-[10px] font-mono tracking-widest uppercase">
          Layers
        </span>
        <span
          className="text-[10px] transition-transform duration-200"
          style={{ transform: open ? "rotate(0deg)" : "rotate(180deg)" }}
        >
          ▲
        </span>
      </button>

      {/* Layer rows */}
      {open && (
        <div className="px-3 pb-3 flex flex-col gap-1.5">
          <SectionHeading label="Basemap" />
          <LayerRow
            label="Satellite View"
            dotColor="#1e293b"
            checked={visibility.satellite}
            onToggle={() => onToggle("satellite")}
          />

          <SectionHeading label="Terrain" />
          <LayerRow
            label="3D Terrain"
            dotColor="#94a3b8"
            checked={visibility.terrain3d}
            onToggle={() => onToggle("terrain3d")}
          />
          <LayerRow
            label="Hillshade"
            dotColor="#3a6080"
            checked={visibility.hillshade}
            onToggle={() => onToggle("hillshade")}
          />

          <SectionHeading label="Elevation" />
          <LayerRow
            label="Contour Lines"
            dotColor="#8acd9a"
            checked={visibility.contours}
            onToggle={() => onToggle("contours")}
          />

          <SectionHeading label="Vegetation" />
          <LayerRow
            label="Land Cover"
            dotColor="#14532d"
            checked={visibility.landcover}
            onToggle={() => onToggle("landcover")}
          />

          <SectionHeading label="Comms" />
          <LayerRow
            label="GSM"
            dotColor="#3b82f6"
            checked={visibility.cellGSM}
            onToggle={() => onToggle("cellGSM")}
          />
          <LayerRow
            label="UMTS"
            dotColor="#3b82f6"
            checked={visibility.cellUMTS}
            onToggle={() => onToggle("cellUMTS")}
          />
          <LayerRow
            label="LTE"
            dotColor="#3b82f6"
            checked={visibility.cellLTE}
            onToggle={() => onToggle("cellLTE")}
          />
          <LayerRow
            label="CDMA"
            dotColor="#3b82f6"
            checked={visibility.cellCDMA}
            onToggle={() => onToggle("cellCDMA")}
          />
        </div>
      )}
    </div>
  );
}
