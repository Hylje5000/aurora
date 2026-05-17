"use client";

import React, { useState } from "react";
import { ChevronRight, ChevronDown, X } from "lucide-react";

export interface InfoPanelData {
  title: string;
  rows: [string, string | null | undefined][];
  component?: React.ReactNode;
}

interface InfoPanelProps {
  data: InfoPanelData | null;
  onClose: () => void;
  /** When provided, collapse state is controlled externally. */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export default function InfoPanel({
  data,
  onClose,
  collapsed: collapsedProp,
  onCollapsedChange,
}: InfoPanelProps) {
  const [collapsedLocal, setCollapsedLocal] = useState(false);

  const controlled = collapsedProp !== undefined;
  const collapsed = controlled ? collapsedProp : collapsedLocal;

  function toggleCollapsed() {
    const next = !collapsed;
    if (controlled) {
      onCollapsedChange?.(next);
    } else {
      setCollapsedLocal(next);
    }
  }

  if (!data) return null;

  return (
    <div className="absolute right-4 top-10 z-20 w-72 max-h-[60vh] overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/90 font-mono text-xs text-slate-200 shadow-lg backdrop-blur-sm">
      {/* Header row — always visible */}
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="text-sm font-bold tracking-wide text-white flex-1 truncate">
          {data.title}
        </span>
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "expand info panel" : "collapse info panel"}
          className="shrink-0 text-slate-400 hover:text-white"
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={onClose}
          aria-label="close info panel"
          className="shrink-0 text-slate-400 hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Collapsible body */}
      {!collapsed && (
        <div className="px-4 pb-4">
          <div className="space-y-1 leading-relaxed">
            {data.rows.map(([label, value]) => (
              <div key={label}>
                <span className="text-slate-500">{label}</span>
                {"  "}
                {value ?? "—"}
              </div>
            ))}
          </div>
          {data.component}
        </div>
      )}
    </div>
  );
}
