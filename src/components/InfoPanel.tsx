"use client";

export interface InfoPanelData {
  title: string;
  rows: [string, string | null | undefined][];
}

interface InfoPanelProps {
  data: InfoPanelData | null;
  onClose: () => void;
}

export default function InfoPanel({ data, onClose }: InfoPanelProps) {
  if (!data) return null;

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 min-w-48 rounded-lg border border-slate-700 bg-slate-900/90 p-4 font-mono text-xs text-slate-200 shadow-lg backdrop-blur-sm">
      <div className="mb-3 flex items-start justify-between gap-4">
        <span className="text-sm font-bold tracking-wide text-white">
          {data.title}
        </span>
        <button
          onClick={onClose}
          aria-label="close info panel"
          className="ml-2 shrink-0 text-slate-400 hover:text-white"
        >
          ×
        </button>
      </div>
      <div className="space-y-1 leading-relaxed">
        {data.rows.map(([label, value]) => (
          <div key={label}>
            <span className="text-slate-500">{label}</span>
            {"  "}
            {value ?? "—"}
          </div>
        ))}
      </div>
    </div>
  );
}
