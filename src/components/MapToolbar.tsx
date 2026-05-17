"use client";

import { COLOUR_PALETTE } from "@/lib/customLayers";
import type { DrawingTool, ColourOption } from "@/lib/customLayers";
import type { MapTool, MeasurementState } from "@/lib/mapTool";

interface MapToolbarProps {
  activeTool: MapTool;
  onToolChange: (t: MapTool) => void;
  measurement: MeasurementState | null;
  activeDrawingLayerId: string | null;
  activeDrawingLayerName: string | undefined;
  activeDrawingTool: DrawingTool | null;
  activeDrawingColour: string;
  hasDrawingSelection: boolean;
  onDrawToolChange: (t: DrawingTool | null) => void;
  onDrawColourChange: (hex: string) => void;
  onDeleteSelected: () => void;
  onCancelDrawing: () => void;
}

const STD_TOOLS: { tool: MapTool; icon: string; label: string }[] = [
  { tool: "grab", icon: "✋", label: "Grab (pan map)" },
  { tool: "click", icon: "👆", label: "Click (inspect)" },
  { tool: "measure-distance", icon: "📏", label: "Measure distance" },
  { tool: "measure-area", icon: "⬡", label: "Measure area" },
];

const DRAW_TOOLS: { tool: DrawingTool; icon: string; label: string }[] = [
  { tool: "Point", icon: "•", label: "Point" },
  { tool: "LineString", icon: "—", label: "Line" },
  { tool: "Polygon", icon: "⬡", label: "Polygon" },
  { tool: "Rectangle", icon: "▭", label: "Rectangle" },
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
  activeDrawingColour,
  hasDrawingSelection,
  onDrawToolChange,
  onDrawColourChange,
  onDeleteSelected,
  onCancelDrawing,
}: MapToolbarProps) {
  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/90 backdrop-blur-sm shadow-xl px-3 py-2 select-none touch-none"
      data-testid="map-toolbar"
    >
      {/* Standard tools */}
      {STD_TOOLS.map(({ tool, icon, label }) => {
        const isActive = activeTool === tool;
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

          {/* Colour swatches */}
          <div className="flex gap-1 ml-1" data-testid="draw-colour-palette">
            {COLOUR_PALETTE.map((c: ColourOption) => (
              <button
                key={c.hex}
                title={c.label}
                aria-label={c.label}
                aria-pressed={activeDrawingColour === c.hex}
                onClick={() => onDrawColourChange(c.hex)}
                data-testid={`colour-swatch-${c.label.toLowerCase()}`}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  activeDrawingColour === c.hex
                    ? "border-white scale-110"
                    : "border-transparent hover:border-slate-400"
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>

          {/* Delete selected */}
          {hasDrawingSelection && (
            <button
              onClick={onDeleteSelected}
              aria-label="Delete selected"
              data-testid="draw-delete-selected"
              className="ml-1 px-2 h-7 text-[10px] font-mono text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-700 rounded transition-colors"
            >
              Del
            </button>
          )}

          {/* Cancel drawing mode */}
          <button
            onClick={onCancelDrawing}
            aria-label="Cancel drawing"
            data-testid="draw-cancel"
            className="ml-1 w-7 h-7 rounded flex items-center justify-center text-xs text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}
