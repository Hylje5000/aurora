"use client";

import { X } from "lucide-react";
import { COLOUR_PALETTE } from "@/lib/customLayers";
import type { DrawingTool, ColourOption } from "@/lib/customLayers";

interface DrawingToolbarProps {
  activeDrawingLayerName: string;
  activeTool: DrawingTool | null;
  activeColour: string;
  hasSelection: boolean;
  onToolChange: (tool: DrawingTool | null) => void;
  onColourChange: (hex: string) => void;
  onCancel: () => void;
  onDeleteSelected: () => void;
}

interface ToolButtonProps {
  label: string;
  icon: string;
  tool: DrawingTool;
  active: boolean;
  onClick: () => void;
}

function ToolButton({ label, icon, active, onClick }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`w-8 h-8 rounded flex items-center justify-center text-sm font-mono transition-colors ${
        active
          ? "bg-slate-500 text-white"
          : "text-slate-400 hover:text-white hover:bg-slate-700"
      }`}
      data-testid={`tool-btn-${label.toLowerCase()}`}
    >
      {icon}
    </button>
  );
}

const TOOLS: { label: string; icon: string; tool: DrawingTool }[] = [
  { label: "Point", icon: "•", tool: "Point" },
  { label: "Line", icon: "—", tool: "LineString" },
  { label: "Polygon", icon: "⬡", tool: "Polygon" },
  { label: "Rectangle", icon: "▭", tool: "Rectangle" },
];

export default function DrawingToolbar({
  activeDrawingLayerName,
  activeTool,
  activeColour,
  hasSelection,
  onToolChange,
  onColourChange,
  onCancel,
  onDeleteSelected,
}: DrawingToolbarProps) {
  return (
    <div
      className="absolute top-16 right-4 z-10 w-48 rounded-lg border border-slate-700 bg-slate-900/90 backdrop-blur-sm shadow-xl select-none touch-none"
      data-testid="drawing-toolbar"
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-700/60 flex items-center justify-between">
        <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400">
          Drawing
        </span>
        <button
          onClick={onCancel}
          className="text-slate-500 hover:text-white transition-colors"
          aria-label="Cancel drawing"
          data-testid="drawing-toolbar-cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-3 py-2 flex flex-col gap-2">
        {/* Layer name */}
        <div className="text-[9px] text-slate-500 tracking-widest font-mono uppercase truncate">
          Layer: {activeDrawingLayerName}
        </div>

        {/* Tools */}
        <div className="flex gap-1">
          {TOOLS.map(({ label, icon, tool }) => (
            <ToolButton
              key={tool}
              label={label}
              icon={icon}
              tool={tool}
              active={activeTool === tool}
              onClick={() => onToolChange(activeTool === tool ? null : tool)}
            />
          ))}
        </div>

        {/* Colour palette */}
        <div className="text-[9px] text-slate-500 tracking-widest font-mono uppercase">
          Colour
        </div>
        <div className="flex flex-wrap gap-1.5" data-testid="colour-palette">
          {COLOUR_PALETTE.map((c: ColourOption) => (
            <button
              key={c.hex}
              title={c.label}
              aria-label={c.label}
              aria-pressed={activeColour === c.hex}
              onClick={() => onColourChange(c.hex)}
              className={`w-5 h-5 rounded-full border-2 transition-all ${
                activeColour === c.hex
                  ? "border-white scale-110"
                  : "border-transparent hover:border-slate-400"
              }`}
              style={{ backgroundColor: c.hex }}
              data-testid={`colour-swatch-${c.label.toLowerCase()}`}
            />
          ))}
        </div>

        {/* Delete selected */}
        {hasSelection && (
          <button
            onClick={onDeleteSelected}
            className="mt-1 w-full text-[10px] font-mono text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-700 rounded py-1 transition-colors"
            data-testid="drawing-toolbar-delete"
          >
            Delete Selected
          </button>
        )}
      </div>
    </div>
  );
}
