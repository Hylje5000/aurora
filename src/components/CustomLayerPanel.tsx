"use client";

import { useState } from "react";
import { COLOUR_PALETTE, DEFAULT_LAYER_COLOUR } from "@/lib/customLayers";
import type { CustomLayer, ColourOption } from "@/lib/customLayers";

export interface CustomLayerPanelProps {
  layers: CustomLayer[];
  enabledLayerIds: Set<string>;
  activeDrawingLayerId: string | null;
  onCreateLayer: (name: string, color: string) => void;
  onDeleteLayer: (id: string) => void;
  onToggleLayer: (id: string) => void;
  onSetActiveDrawingLayer: (id: string | null) => void;
}

// Inner content — no panel wrapper, no collapse toggle.
// Rendered inside LayerPanel as a section, and inside the legacy CustomLayerPanel wrapper.
export function CustomLayerSection({
  layers,
  enabledLayerIds,
  activeDrawingLayerId,
  onCreateLayer,
  onDeleteLayer,
  onToggleLayer,
  onSetActiveDrawingLayer,
}: CustomLayerPanelProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_LAYER_COLOUR);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onCreateLayer(trimmed, newColor);
    setNewName("");
    setNewColor(DEFAULT_LAYER_COLOUR);
    setShowCreate(false);
  }

  function handleDeleteConfirm(id: string) {
    if (activeDrawingLayerId === id) {
      onSetActiveDrawingLayer(null);
    }
    onDeleteLayer(id);
    setConfirmDeleteId(null);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Layer list */}
      {layers.length === 0 && !showCreate && (
        <p className="text-[10px] text-slate-600 font-mono py-1">
          No layers yet.
        </p>
      )}

      {layers.map((layer) => (
        <div key={layer.id} className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            {/* Colour dot */}
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: layer.color }}
            />

            {/* Name + pencil — click to activate drawing on this layer */}
            <button
              onClick={() =>
                onSetActiveDrawingLayer(
                  activeDrawingLayerId === layer.id ? null : layer.id,
                )
              }
              className={`flex-1 flex items-center gap-1 text-left text-xs font-mono truncate transition-colors ${
                activeDrawingLayerId === layer.id
                  ? "text-white"
                  : "text-slate-300 hover:text-white"
              }`}
              title={
                activeDrawingLayerId === layer.id
                  ? "Click to stop drawing on this layer"
                  : "Click to draw on this layer"
              }
              data-testid={`layer-name-${layer.id}`}
            >
              <span className="truncate">{layer.name}</span>
              <span
                className={`text-sm flex-shrink-0 transition-colors ${
                  activeDrawingLayerId === layer.id
                    ? "text-blue-400"
                    : "text-slate-500"
                }`}
                aria-label={
                  activeDrawingLayerId === layer.id
                    ? "Active drawing layer"
                    : "Click to draw"
                }
              >
                ✏
              </span>
            </button>

            {/* Delete */}
            <button
              onClick={() =>
                setConfirmDeleteId(
                  confirmDeleteId === layer.id ? null : layer.id,
                )
              }
              className="text-slate-600 hover:text-red-400 transition-colors text-xs"
              aria-label={`Delete layer ${layer.name}`}
              data-testid={`layer-delete-${layer.id}`}
            >
              ✕
            </button>

            {/* Visibility toggle — right side, matching regular layer rows */}
            <input
              type="checkbox"
              checked={enabledLayerIds.has(layer.id)}
              onChange={() => onToggleLayer(layer.id)}
              className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer flex-shrink-0"
              aria-label={`Toggle ${layer.name}`}
              data-testid={`layer-toggle-${layer.id}`}
            />
          </div>

          {/* Inline delete confirm */}
          {confirmDeleteId === layer.id && (
            <div className="ml-3 flex gap-1 items-center mt-0.5">
              <span className="text-[9px] text-red-400 font-mono">Delete?</span>
              <button
                onClick={() => handleDeleteConfirm(layer.id)}
                className="text-[9px] font-mono text-red-400 hover:text-red-300 border border-red-900/50 rounded px-1"
                data-testid={`layer-delete-confirm-${layer.id}`}
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="text-[9px] font-mono text-slate-500 hover:text-slate-300"
                data-testid={`layer-delete-cancel-${layer.id}`}
              >
                No
              </button>
            </div>
          )}
        </div>
      ))}

      {/* New layer form */}
      {showCreate ? (
        <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-700/60">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setShowCreate(false);
            }}
            placeholder="Layer name..."
            autoFocus
            className="w-full rounded bg-slate-800 border border-slate-600 px-2 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-400"
            data-testid="new-layer-name-input"
          />

          {/* Colour swatches */}
          <div
            className="flex flex-wrap gap-1"
            data-testid="new-layer-colour-palette"
          >
            {COLOUR_PALETTE.map((c: ColourOption) => (
              <button
                key={c.hex}
                title={c.label}
                aria-label={c.label}
                aria-pressed={newColor === c.hex}
                onClick={() => setNewColor(c.hex)}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  newColor === c.hex
                    ? "border-white scale-110"
                    : "border-transparent hover:border-slate-400"
                }`}
                style={{ backgroundColor: c.hex }}
                data-testid={`new-layer-colour-${c.label.toLowerCase()}`}
              />
            ))}
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="flex-1 text-[10px] font-mono py-1 rounded bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              data-testid="new-layer-create-btn"
            >
              Create
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="text-[10px] font-mono py-1 px-2 rounded text-slate-500 hover:text-slate-300 border border-slate-700 transition-colors"
              data-testid="new-layer-cancel-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="mt-1 w-full text-[10px] font-mono text-slate-500 hover:text-white border border-slate-700/60 hover:border-slate-500 rounded py-1 transition-colors"
          data-testid="new-layer-btn"
        >
          + New Layer
        </button>
      )}
    </div>
  );
}

// Legacy wrapper — keeps the standalone panel UI for backwards-compatible usage and tests.
export default function CustomLayerPanel(props: CustomLayerPanelProps) {
  const [open, setOpen] = useState(true);

  return (
    <div
      className="absolute right-4 bottom-10 z-10 w-52 rounded-lg border border-slate-700 bg-slate-900/90 backdrop-blur-sm shadow-xl select-none touch-none"
      data-testid="custom-layer-panel"
    >
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-slate-400 hover:text-white transition-colors"
        aria-expanded={open}
        aria-label="Toggle custom layer panel"
        data-testid="custom-layer-panel-toggle"
      >
        <span className="text-[10px] font-mono tracking-widest uppercase">
          Custom Layers
        </span>
        <span
          className="text-[10px] transition-transform duration-200"
          style={{ transform: open ? "rotate(0deg)" : "rotate(180deg)" }}
        >
          ▲
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3">
          <CustomLayerSection {...props} />
        </div>
      )}
    </div>
  );
}
