"use client";

import { useState, useEffect, useRef } from "react";

import SymbolPicker from "./SymbolPicker";
import { MILITARY_SYMBOLS } from "@/lib/milsymbolData";

interface FeatureDialogProps {
  open: boolean;
  featureType?: "Point" | "LineString" | "Polygon" | "Rectangle";
  onSave: (name: string, description: string, sidc?: string) => void;
  onDiscard: () => void;
}

function DialogForm({
  featureType,
  onSave,
  onDiscard,
}: Omit<FeatureDialogProps, "open">) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sidc, setSidc] = useState(MILITARY_SYMBOLS[0].sidc);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(
      trimmed,
      description.trim(),
      featureType === "Point" ? sidc : undefined,
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      onDiscard();
    }
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDiscard();
      }}
      data-testid="feature-dialog-backdrop"
    >
      <div
        className="w-80 rounded-lg border border-slate-700 bg-slate-900 shadow-2xl p-4 flex flex-col gap-3"
        onKeyDown={handleKeyDown}
        data-testid="feature-dialog"
      >
        <h2 className="text-xs font-mono tracking-widest uppercase text-slate-400">
          Save Drawing
        </h2>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Name *
          </label>
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Observation Post Alpha"
            className="w-full rounded bg-slate-800 border border-slate-600 px-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-400"
            data-testid="feature-dialog-name"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes..."
            rows={2}
            className="w-full rounded bg-slate-800 border border-slate-600 px-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-400 resize-none"
            data-testid="feature-dialog-description"
          />
        </div>

        {featureType === "Point" && (
          <SymbolPicker selectedSidc={sidc} onChange={setSidc} />
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onDiscard}
            className="px-3 py-1.5 text-xs font-mono text-slate-400 hover:text-white border border-slate-700 rounded hover:border-slate-500 transition-colors"
            data-testid="feature-dialog-discard"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-3 py-1.5 text-xs font-mono bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            data-testid="feature-dialog-save"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FeatureDialog({
  open,
  featureType,
  onSave,
  onDiscard,
}: FeatureDialogProps) {
  if (!open) return null;
  return (
    <DialogForm
      featureType={featureType}
      onSave={onSave}
      onDiscard={onDiscard}
    />
  );
}
