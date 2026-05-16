"use client";

import {
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
  useRef,
} from "react";
import {
  type RouteProfile,
  type Waypoint,
  type PlannedRoute,
  PROFILE_COLORS,
  formatDuration,
  formatDistance,
  profileLabel,
} from "@/lib/routing";

export interface RoutePanelHandle {
  addWaypoint: (coords: [number, number]) => void;
}

interface RoutePanelProps {
  onAddingWaypointChange: (active: boolean) => void;
  onRouteChange: (
    route: PlannedRoute | null,
    profile: RouteProfile,
    waypoints: Waypoint[],
  ) => void;
  onClose: () => void;
}

const PROFILES: RouteProfile[] = ["driving", "walking", "cycling"];

const PROFILE_ICONS: Record<RouteProfile, string> = {
  driving: "🚗",
  walking: "🚶",
  cycling: "🚴",
};

function waypointLabel(index: number, total: number): string {
  if (index === 0) return "Start";
  if (index === total - 1) return "Destination";
  return `Stop ${index}`;
}

function relabel(wps: Waypoint[]): Waypoint[] {
  return wps.map((wp, i) => ({ ...wp, label: waypointLabel(i, wps.length) }));
}

export const RoutePanel = forwardRef<RoutePanelHandle, RoutePanelProps>(
  function RoutePanel({ onAddingWaypointChange, onRouteChange, onClose }, ref) {
    const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
    const [profile, setProfile] = useState<RouteProfile>("driving");
    const [route, setRoute] = useState<PlannedRoute | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedLeg, setExpandedLeg] = useState<number | null>(null);

    // Drag-and-drop state
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const abortRef = useRef<AbortController | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onRouteChangeRef = useRef(onRouteChange);
    onRouteChangeRef.current = onRouteChange;

    useImperativeHandle(ref, () => ({
      addWaypoint(coords: [number, number]) {
        setWaypoints((prev) => {
          const next = [
            ...prev,
            {
              id: crypto.randomUUID(),
              label: "",
              coordinates: coords,
            },
          ];
          return relabel(next);
        });
      },
    }));

    function removeWaypoint(id: string) {
      setWaypoints((prev) => relabel(prev.filter((w) => w.id !== id)));
    }

    function handleDragStart(e: React.DragEvent, index: number) {
      setDragIndex(index);
      e.dataTransfer.effectAllowed = "move";
      // Required for Firefox
      e.dataTransfer.setData("text/plain", String(index));
    }

    function handleDragOver(e: React.DragEvent, index: number) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (dragOverIndex !== index) setDragOverIndex(index);
    }

    function handleDrop(e: React.DragEvent, dropIndex: number) {
      e.preventDefault();
      const fromIndex = dragIndex;
      setDragIndex(null);
      setDragOverIndex(null);
      if (fromIndex === null || fromIndex === dropIndex) return;
      setWaypoints((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(dropIndex, 0, moved);
        return relabel(next);
      });
    }

    function handleDragEnd() {
      setDragIndex(null);
      setDragOverIndex(null);
    }

    function handleClear() {
      setWaypoints([]);
      setRoute(null);
      setError(null);
      onRouteChangeRef.current(null, profile, []);
    }

    // Auto-fetch route, debounced 400 ms
    useEffect(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (waypoints.length < 2) {
        abortRef.current?.abort();
        setRoute(null);
        setError(null);
        setLoading(false);
        onRouteChangeRef.current(null, profile, waypoints);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError(null);

        try {
          const res = await fetch("/api/route-plan", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              waypoints: waypoints.map((w) => w.coordinates),
              profile,
            }),
            signal: controller.signal,
          });

          if (!res.ok) {
            const body = (await res.json()) as { error?: string };
            throw new Error(body.error ?? `HTTP ${res.status}`);
          }

          const planned = (await res.json()) as PlannedRoute;
          setRoute(planned);
          onRouteChangeRef.current(planned, profile, waypoints);
        } catch (err) {
          if ((err as { name?: string }).name === "AbortError") return;
          setError((err as Error).message ?? "Failed to fetch route");
          setRoute(null);
          onRouteChangeRef.current(null, profile, waypoints);
        } finally {
          setLoading(false);
        }
      }, 400);

      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
      // waypoints and profile are the only triggers; onRouteChange is stable via ref
    }, [waypoints, profile]);

    return (
      <div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 w-96 rounded-lg border border-slate-700 bg-slate-900/90 backdrop-blur-sm shadow-xl select-none touch-none"
        data-testid="route-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/60">
          <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400">
            Route Planning
          </span>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-white transition-colors text-xs"
            aria-label="Close route panel"
          >
            ✕
          </button>
        </div>

        <div className="px-3 py-2 flex flex-col gap-2">
          {/* Profile selector */}
          <div className="flex gap-1" role="group" aria-label="Travel profile">
            {PROFILES.map((p) => (
              <button
                key={p}
                onClick={() => setProfile(p)}
                title={profileLabel(p)}
                aria-label={profileLabel(p)}
                aria-pressed={profile === p}
                className={`flex-1 text-sm rounded py-0.5 transition-colors border ${
                  profile === p
                    ? "bg-slate-700 text-white"
                    : "border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500"
                }`}
                style={
                  profile === p ? { borderColor: PROFILE_COLORS[p] } : undefined
                }
              >
                {PROFILE_ICONS[p]}
              </button>
            ))}
          </div>

          {/* Waypoint list */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase">
                Waypoints
              </span>
              {waypoints.length > 0 && (
                <button
                  onClick={handleClear}
                  className="text-[9px] font-mono text-slate-600 hover:text-red-400 transition-colors"
                  aria-label="Clear all waypoints"
                >
                  Clear
                </button>
              )}
            </div>

            {waypoints.length === 0 && (
              <p className="text-[10px] text-slate-600 font-mono py-0.5">
                Click &ldquo;Add Stop&rdquo; then click the map.
              </p>
            )}

            {waypoints.map((wp, i) => (
              <div
                key={wp.id}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={(e) => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
                className={[
                  "flex items-center gap-1.5 rounded px-0.5 py-0.5 transition-colors",
                  dragIndex === i ? "opacity-40" : "",
                  dragOverIndex === i && dragIndex !== i
                    ? "border-t-2 border-blue-400"
                    : "",
                ].join(" ")}
                data-testid={`waypoint-row-${i}`}
              >
                {/* Drag handle */}
                <span
                  className="cursor-grab text-slate-600 hover:text-slate-400 text-[11px] flex-shrink-0 leading-none"
                  aria-hidden="true"
                  title="Drag to reorder"
                >
                  ⠿
                </span>

                {/* Index badge */}
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ backgroundColor: PROFILE_COLORS[profile] }}
                >
                  {i + 1}
                </span>

                {/* Label */}
                <span className="flex-1 text-[10px] font-mono text-slate-300 truncate">
                  {wp.label}
                </span>

                {/* Remove */}
                <button
                  onClick={() => removeWaypoint(wp.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors text-[9px] flex-shrink-0"
                  aria-label={`Remove ${wp.label}`}
                >
                  ✕
                </button>
              </div>
            ))}

            <button
              onClick={() => onAddingWaypointChange(true)}
              disabled={waypoints.length >= 25}
              className="mt-1 w-full text-[10px] font-mono text-slate-500 hover:text-white border border-slate-700/60 hover:border-slate-500 rounded py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Add stop"
              data-testid="add-stop-btn"
            >
              + Add Stop
            </button>
          </div>

          {/* Loading / error */}
          {loading && (
            <p
              className="text-[10px] font-mono text-slate-400 text-center py-1"
              data-testid="route-loading"
            >
              Calculating route…
            </p>
          )}
          {error && !loading && (
            <p
              className="text-[10px] font-mono text-red-400 py-0.5"
              data-testid="route-error"
            >
              {error}
            </p>
          )}

          {/* Route summary + legs */}
          {route && !loading && (
            <div
              className="border-t border-slate-700/60 pt-1.5"
              data-testid="route-summary"
            >
              <p
                className="text-[10px] font-mono font-semibold"
                style={{ color: PROFILE_COLORS[profile] }}
              >
                {formatDistance(route.total_distance_m)} ·{" "}
                {formatDuration(route.total_duration_s)}
              </p>

              <div className="flex flex-col gap-0.5 mt-1 max-h-40 overflow-y-auto">
                {route.legs.map((leg, i) => (
                  <div key={i}>
                    <button
                      onClick={() =>
                        setExpandedLeg(expandedLeg === i ? null : i)
                      }
                      className="flex items-center gap-1 text-left text-[10px] font-mono text-slate-400 hover:text-white transition-colors w-full"
                      aria-expanded={expandedLeg === i}
                      aria-label={`Toggle leg ${i + 1} steps`}
                      data-testid={`leg-toggle-${i}`}
                    >
                      <span className="text-[8px]">
                        {expandedLeg === i ? "▼" : "▶"}
                      </span>
                      <span>
                        Leg {i + 1} — {formatDistance(leg.distance_m)} /{" "}
                        {formatDuration(leg.duration_s)}
                      </span>
                    </button>
                    {expandedLeg === i && (
                      <div
                        className="ml-3 flex flex-col gap-0.5 mt-0.5"
                        data-testid={`leg-steps-${i}`}
                      >
                        {leg.steps.map((step, j) => (
                          <p
                            key={j}
                            className="text-[9px] font-mono text-slate-500 leading-relaxed"
                          >
                            • {step.instruction}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

export default RoutePanel;
