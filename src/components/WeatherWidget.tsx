"use client";

import { useEffect, useState } from "react";
import type { WeatherStats } from "@/app/api/weather/route";

interface WeatherWidgetProps {
  region: string;
  month: number;
  day: number;
}

function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

export default function WeatherWidget({
  region,
  month,
  day,
}: WeatherWidgetProps) {
  const [stats, setStats] = useState<WeatherStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 font-mono text-xs text-slate-400 shadow-lg backdrop-blur-sm">
        Loading…
      </div>
    );
  }

  if (!stats || stats.sampleSize === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 font-mono text-xs text-slate-400 shadow-lg backdrop-blur-sm">
        No data
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 font-mono text-xs text-slate-200 shadow-lg backdrop-blur-sm">
      <div className="text-slate-400 mb-1 text-[10px] uppercase tracking-widest">
        Historical avg · {stats.sampleSize} yr
      </div>
      <div className="mb-0.5">
        <span className="text-white">
          {fmt(stats.avgTemp)}°C ± {fmt(stats.tempSpread)}°
        </span>
        {"  "}
        <span className="text-slate-400">
          ↑{fmt(stats.maxTemp)}° ↓{fmt(stats.minTemp)}°
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
