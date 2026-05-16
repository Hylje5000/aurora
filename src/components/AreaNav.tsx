"use client";

import { AREAS_OF_INTEREST } from "@/lib/areas";

interface AreaNavProps {
  selectedAreaId: string | null;
  onSelect: (id: string) => void;
}

export default function AreaNav({ selectedAreaId, onSelect }: AreaNavProps) {
  return (
    <div className="absolute top-4 left-1/2 z-10 flex -translate-x-1/2 gap-2 touch-none">
      {AREAS_OF_INTEREST.map((area) => {
        const isActive = selectedAreaId === area.id;
        return (
          <button
            key={area.id}
            onClick={() => onSelect(area.id)}
            className={[
              "rounded px-4 py-1.5 text-sm font-semibold text-white transition-all",
              "bg-black/60 backdrop-blur-sm hover:bg-black/80",
              isActive
                ? "border border-blue-400 shadow-[0_0_0_2px_#38bdf8]"
                : "border border-white/30",
            ].join(" ")}
          >
            {area.name}
          </button>
        );
      })}
    </div>
  );
}
