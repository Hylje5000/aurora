"use client";

import React from "react";
import {
  Hand,
  MousePointer2,
  Ruler,
  BoxSelect,
  MapPin,
  PenLine,
  Hexagon,
  Square,
  X,
} from "lucide-react";
import type { DrawingTool } from "@/lib/customLayers";
import type { MapTool, MeasurementState } from "@/lib/mapTool";

interface MapToolbarProps {
  activeTool: MapTool;
  onToolChange: (t: MapTool) => void;
  measurement: MeasurementState | null;
  activeDrawingLayerId: string | null;
  activeDrawingLayerName: string | undefined;
  activeDrawingTool: DrawingTool | null;
  onDrawToolChange: (t: DrawingTool | null) => void;
  onCancelDrawing: () => void;
}

const STD_TOOLS: {
  tool: MapTool;
  icon: React.ReactNode;
  label: string;
}[] = [
  { tool: "grab", icon: <Hand size={16} />, label: "Grab (pan map)" },
  {
    tool: "click",
    icon: <MousePointer2 size={16} />,
    label: "Click (inspect)",
  },
  {
    tool: "measure-distance",
    icon: <Ruler size={16} />,
    label: "Measure distance",
  },
  {
    tool: "measure-area",
    icon: <BoxSelect size={16} />,
    label: "Measure area",
  },
];

const DRAW_TOOLS: {
  tool: DrawingTool;
  icon: React.ReactNode;
  label: string;
}[] = [
  { tool: "Point", icon: <MapPin size={14} />, label: "Point" },
  { tool: "LineString", icon: <PenLine size={14} />, label: "Line" },
  { tool: "Polygon", icon: <Hexagon size={14} />, label: "Polygon" },
  { tool: "Rectangle", icon: <Square size={14} />, label: "Rectangle" },
];

function measureLabel(
  m: MeasurementState | null,
  tool: MapTool,
): string | null {
  if (!m) return null;
  if (tool === "measure-distance" && m.distance_km != null) {
    return m.distance_km >= 1
      ? `${m.distance_km.toFixed(2)} km`
      : `${(m.distance_km * 1000).toFixed(0)} m`;
  }
  if (tool === "measure-area" && m.area_km2 != null) {
    return m.area_km2 >= 0.01
      ? `${m.area_km2.toFixed(3)} km²`
      : `${(m.area_km2 * 1_000_000).toFixed(0)} m²`;
  }
  return null;
}

export default function MapToolbar({
  activeTool,
  onToolChange,
  measurement,
  activeDrawingLayerId,
  activeDrawingLayerName,
  activeDrawingTool,
  onDrawToolChange,
  onCancelDrawing,
}: MapToolbarProps) {
  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-start gap-1 rounded-xl border border-slate-700 bg-slate-900/90 backdrop-blur-sm shadow-xl px-3 py-2 select-none touch-none"
      data-testid="map-toolbar"
    >
      {/* Standard tools */}
      {STD_TOOLS.map(({ tool, icon, label }) => {
        const isActive = activeTool === tool && activeDrawingTool === null;
        const badge = isActive ? measureLabel(measurement, tool) : null;
        return (
          <div key={tool} className="flex flex-col items-center">
            <button
              onClick={() => onToolChange(tool)}
              title={label}
              aria-label={label}
              aria-pressed={isActive}
              data-testid={`tool-btn-${tool}`}
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-base transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {icon}
            </button>
            {badge && (
              <span
                className="text-[9px] font-mono text-cyan-400 mt-0.5 leading-none"
                data-testid={`measure-badge-${tool}`}
              >
                {badge}
              </span>
            )}
          </div>
        );
      })}

      {/* Draw tools — only when a layer is active */}
      {activeDrawingLayerId && (
        <>
          {/* Divider */}
          <div className="w-px h-7 bg-slate-700 mx-1" aria-hidden="true" />

          {/* Layer name */}
          {activeDrawingLayerName && (
            <span
              className="text-[9px] font-mono text-slate-500 tracking-widest uppercase max-w-[72px] truncate"
              title={activeDrawingLayerName}
              data-testid="draw-layer-name"
            >
              {activeDrawingLayerName}
            </span>
          )}

          {/* Draw tool buttons */}
          {DRAW_TOOLS.map(({ tool, icon, label }) => {
            const isActive = activeDrawingTool === tool;
            return (
              <button
                key={tool}
                onClick={() => onDrawToolChange(isActive ? null : tool)}
                title={label}
                aria-label={label}
                aria-pressed={isActive}
                data-testid={`draw-btn-${label.toLowerCase()}`}
                className={`w-8 h-8 rounded flex items-center justify-center text-sm font-mono transition-colors ${
                  isActive
                    ? "bg-slate-500 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                {icon}
              </button>
            );
          })}

          {/* Cancel drawing mode */}
          <button
            onClick={onCancelDrawing}
            aria-label="Cancel drawing"
            data-testid="draw-cancel"
            className="ml-1 w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X size={13} />
          </button>
        </>
      )}
    </div>
  );
}
