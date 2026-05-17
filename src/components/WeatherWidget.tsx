"use client";

import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import type { WeatherStats } from "@/app/api/weather/route";

interface WeatherWidgetProps {
  region: string;
  month: number;
  day: number;
  bare?: boolean;
}

function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

export default function WeatherWidget({
  region,
  month,
  day,
  bare = false,
}: WeatherWidgetProps) {
  const [stats, setStats] = useState<WeatherStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    setStats(null);

    const controller = new AbortController();

    fetch(`/api/weather?region=${region}&month=${month}&day=${day}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: WeatherStats) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        // Ignore abort errors on cleanup
        setLoading(false);
      });

    return () => controller.abort();
  }, [region, month, day]);

  const panelClass = bare
    ? "px-3 py-2 font-mono text-xs text-slate-400"
    : "rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 font-mono text-xs text-slate-400 shadow-lg backdrop-blur-sm";

  if (loading) {
    return <div className={panelClass}>Loading…</div>;
  }

  if (!stats || stats.sampleSize === 0) {
    return <div className={panelClass}>No data</div>;
  }

  return (
    <div
      className={
        bare
          ? "px-3 py-2 font-mono text-xs text-slate-200"
          : "rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 font-mono text-xs text-slate-200 shadow-lg backdrop-blur-sm"
      }
    >
      <div className="text-slate-400 mb-0.5 text-[10px] uppercase tracking-widest">
        Historical avg · {stats.sampleSize} yr
      </div>
      <div className="mb-0.5">
        <span className="text-white">
          {fmt(stats.avgTemp)}°C ± {fmt(stats.tempSpread)}°
        </span>
        {"  "}
        <span className="inline-flex items-center gap-0.5 text-slate-400">
          <ArrowUp className="w-3 h-3" />{fmt(stats.maxTemp)}°
          <ArrowDown className="w-3 h-3 ml-1" />{fmt(stats.minTemp)}°
        </span>
      </div>
      <div>
        <span className="text-slate-300">
          {fmt(stats.rainProbability, 0)}% rain
        </span>
        {stats.rainProbability > 0 && (
          <span className="text-slate-400">
            {" · "}avg {fmt(stats.avgRainMm)} mm
          </span>
        )}
      </div>
    </div>
  );
}
