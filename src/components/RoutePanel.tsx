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
  type VehicleProfile,
  type RouteHazard,
  type RouteIntelligence,
  VEHICLE_PRESETS,
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
  onHazardsChange?: (intel: RouteIntelligence | null) => void;
  onHazardFocus?: (hazard: RouteHazard) => void;
  onClose: () => void;
  /** When provided, expanded state is controlled externally. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  summaryLoading?: boolean;
  onSummaryLoadingChange?: (loading: boolean) => void;
  routeSummary?: string | null;
  onSummaryChange?: (summary: string | null) => void;
  onSummaryModalOpen?: () => void;
}

const PROFILES: RouteProfile[] = ["driving", "walking", "cycling"];

const PROFILE_ICONS: Record<RouteProfile, string> = {
  driving: "🚗",
  walking: "🚶",
  cycling: "🚴",
};

const SEVERITY_COLOR: Record<RouteHazard["severity"], string> = {
  critical: "#ef4444",
  warning: "#eab308",
  info: "#94a3b8",
};

const SEVERITY_BG: Record<RouteHazard["severity"], string> = {
  critical: "bg-red-900/30 hover:bg-red-900/50",
  warning: "bg-amber-900/20 hover:bg-amber-900/40",
  info: "hover:bg-slate-800/60",
};

function waypointLabel(index: number, total: number): string {
  if (index === 0) return "Start";
  if (index === total - 1) return "Destination";
  return `Stop ${index}`;
}

function relabel(wps: Waypoint[]): Waypoint[] {
  return wps.map((wp, i) => ({ ...wp, label: waypointLabel(i, wps.length) }));
}

function VehicleField({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
        {label} ({unit})
      </span>
      <input
        type="number"
        min="0"
        step="0.1"
        value={value}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (!isNaN(n) && n >= 0) onChange(n);
        }}
        className="w-full rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-200 px-1.5 py-0.5 focus:outline-none focus:border-slate-500"
      />
    </label>
  );
}

export const RoutePanel = forwardRef<RoutePanelHandle, RoutePanelProps>(
  function RoutePanel(
    {
      onAddingWaypointChange,
      onRouteChange,
      onHazardsChange,
      onHazardFocus,
      onClose,
      expanded: expandedProp,
      onExpandedChange,
      summaryLoading,
      onSummaryLoadingChange,
      routeSummary,
      onSummaryChange,
      onSummaryModalOpen,
    },
    ref,
  ) {
    const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
    const [profile, setProfile] = useState<RouteProfile>("driving");
    const [route, setRoute] = useState<PlannedRoute | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedLeg, setExpandedLeg] = useState<number | null>(null);
    const [panelExpandedLocal, setPanelExpandedLocal] = useState(true);

    const controlledExpanded = expandedProp !== undefined;
    const panelExpanded = controlledExpanded
      ? expandedProp
      : panelExpandedLocal;

    function setPanelExpanded(next: boolean) {
      if (controlledExpanded) {
        onExpandedChange?.(next);
      } else {
        setPanelExpandedLocal(next);
      }
    }

    // Vehicle state — index into VEHICLE_PRESETS + editable fields
    const [presetIndex, setPresetIndex] = useState(0);
    const [vehicle, setVehicle] = useState<VehicleProfile>({
      ...VEHICLE_PRESETS[0],
    });

    // Intelligence state
    const [intelligence, setIntelligence] = useState<RouteIntelligence | null>(
      null,
    );
    const [intelligenceLoading, setIntelligenceLoading] = useState(false);

    // Drag-and-drop state
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const abortRef = useRef<AbortController | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intelAbortRef = useRef<AbortController | null>(null);
    const intelDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const aiAbortRef = useRef<AbortController | null>(null);

    const onRouteChangeRef = useRef(onRouteChange);
    // eslint-disable-next-line react-hooks/refs
    onRouteChangeRef.current = onRouteChange;
    const onHazardsChangeRef = useRef(onHazardsChange);
    // eslint-disable-next-line react-hooks/refs
    onHazardsChangeRef.current = onHazardsChange;

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
      setIntelligence(null);
      onRouteChangeRef.current(null, profile, []);
      onHazardsChangeRef.current?.(null);
      onSummaryChange?.(null);
      onSummaryLoadingChange?.(false);
    }

    function applyPreset(index: number) {
      setPresetIndex(index);
      setVehicle({ ...VEHICLE_PRESETS[index] });
    }

    function updateVehicleField(field: keyof VehicleProfile, value: number) {
      // Switch to Custom preset (last one) when user edits a field
      const customIndex = VEHICLE_PRESETS.length - 1;
      setPresetIndex(customIndex);
      setVehicle((prev) => ({ ...prev, [field]: value }));
    }

    // Auto-fetch route, debounced 400 ms
    useEffect(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (waypoints.length < 2) {
        abortRef.current?.abort();
        /* eslint-disable react-hooks/set-state-in-effect */
        setRoute(null);
        setError(null);
        setLoading(false);
        /* eslint-enable react-hooks/set-state-in-effect */
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
    }, [waypoints, profile]);

    // Fetch route intelligence, debounced 600 ms after route or vehicle changes.
    useEffect(() => {
      if (intelDebounceRef.current) clearTimeout(intelDebounceRef.current);
      if (!route) {
        onHazardsChangeRef.current?.(null);
        return;
      }

      intelDebounceRef.current = setTimeout(async () => {
        intelAbortRef.current?.abort();
        const controller = new AbortController();
        intelAbortRef.current = controller;

        setIntelligenceLoading(true);
        setIntelligence(null);

        try {
          const res = await fetch("/api/route-intelligence", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ routeGeometry: route.geometry, vehicle }),
            signal: controller.signal,
          });

          if (!res.ok) return;

          const intel = (await res.json()) as RouteIntelligence;
          setIntelligence(intel);
          onHazardsChangeRef.current?.(intel);
        } catch (err) {
          if ((err as { name?: string }).name === "AbortError") return;
        } finally {
          setIntelligenceLoading(false);
        }
      }, 600);

      return () => {
        if (intelDebounceRef.current) clearTimeout(intelDebounceRef.current);
      };
    }, [route, vehicle]);

    // Fetch AI Summary when Intelligence changes
    useEffect(() => {
      if (!intelligence || !route) {
        onSummaryChange?.(null);
        return;
      }

      aiAbortRef.current?.abort();
      const controller = new AbortController();
      aiAbortRef.current = controller;

      onSummaryLoadingChange?.(true);

      const fetchAI = async () => {
        try {
          const prompt = `You are a Senior Military Planning Officer (G3/S3). Provide a high-level tactical executive summary for the following route analysis.
          
          Route Overview:
          - Profile: ${profileLabel(profile)}
          - Distance: ${formatDistance(route.total_distance_m)}
          - Duration: ${formatDuration(route.total_duration_s)}

          Vehicle:
          - Type: ${vehicle.label}
          - Mass: ${vehicle.mass_t}t
          - Dimensions: ${vehicle.width_m}m (W) x ${vehicle.height_m}m (H)

          Hazards (Critical: ${intelligence.summary.critical}, Warning: ${intelligence.summary.warning}, Info: ${intelligence.summary.info}):
          ${intelligence.hazards.map(h => `- [${h.severity.toUpperCase()}] ${h.message}`).join('\n')}

          Comms Coverage:
          ${intelligence.coverage ? `- Covered: ${intelligence.coverage.covered_pct}%\n- Gaps: ${intelligence.coverage.gap_count} (Max: ${intelligence.coverage.longest_gap_m}m)` : "- No data"}

          REQUIRED STRUCTURE:
          
          1. TACTICAL SCOREBOARD (Table format)
          | Metric | Status / Score |
          | :--- | :--- |
          | Route Suitability | 1-10 score |
          | Travel Speed Est. | Estimated speed for this unit type |
          | Obstacle Impact | Low/Med/High impact on timeline |
          | Risk Level | Overall operational risk |
          | Logistical Support | Recommended maneuvers at destination |

          2. MOBILITY ASSESSMENT
          (Concise explanation of the suitability score and speed estimate)

          3. CRITICAL CONSTRAINTS & RISKS
          (Detailed impact of obstacles and cellular gaps)

          4. TACTICAL RECOMMENDATIONS
          (Actionable advice for the planning officer)
          
          Keep it professional, tactical, and format nicely with markdown. Use a strict military tone.`;

          const res = await fetch("/api/ai", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              messages: [{ role: "user", content: prompt }],
              temperature: 0.1,
            }),
            signal: controller.signal,
          });

          if (!res.ok) return;

          const data = await res.json();
          onSummaryChange?.(data.content);
        } catch (err) {
          if ((err as { name?: string }).name === "AbortError") return;
        } finally {
          onSummaryLoadingChange?.(false);
        }
      };

      fetchAI();
    }, [intelligence, route, profile, vehicle, onSummaryChange, onSummaryLoadingChange]);

    return (
      <div
        className="absolute right-4 bottom-10 z-20 w-80 rounded-lg border border-slate-700 bg-slate-900/90 backdrop-blur-sm shadow-xl select-none touch-none"
        data-testid="route-panel"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/60">
          <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400 flex-1">
            Route Planning
          </span>
          <button
            onClick={() => setPanelExpanded(!panelExpanded)}
            aria-label={
              panelExpanded ? "collapse route panel" : "expand route panel"
            }
            className="text-slate-600 hover:text-white transition-colors text-[10px]"
          >
            {panelExpanded ? "▾" : "▸"}
          </button>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-white transition-colors text-xs"
            aria-label="Close route panel"
          >
            ✕
          </button>
        </div>

        {panelExpanded && (
          <div className="px-3 py-2 flex flex-col gap-2">
            {/* Profile selector */}
            <div
              className="flex gap-1"
              role="group"
              aria-label="Travel profile"
            >
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
                    profile === p
                      ? { borderColor: PROFILE_COLORS[p] }
                      : undefined
                  }
                >
                  {PROFILE_ICONS[p]}
                </button>
              ))}
            </div>

            {/* Vehicle selector */}
            <div className="flex flex-col gap-1.5 border border-slate-700/60 rounded p-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase">
                  Vehicle
                </span>
              </div>
              <select
                value={presetIndex}
                onChange={(e) => applyPreset(Number(e.target.value))}
                className="w-full rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-200 px-1.5 py-1 focus:outline-none focus:border-slate-500"
                aria-label="Vehicle preset"
                data-testid="vehicle-preset-select"
              >
                {VEHICLE_PRESETS.map((v, i) => (
                  <option key={v.label} value={i}>
                    {v.label}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-1.5">
                <VehicleField
                  label="Mass"
                  unit="t"
                  value={vehicle.mass_t}
                  onChange={(v) => updateVehicleField("mass_t", v)}
                />
                <VehicleField
                  label="Axle"
                  unit="t"
                  value={vehicle.axle_mass_t}
                  onChange={(v) => updateVehicleField("axle_mass_t", v)}
                />
                <VehicleField
                  label="Bogie"
                  unit="t"
                  value={vehicle.bogie_mass_t}
                  onChange={(v) => updateVehicleField("bogie_mass_t", v)}
                />
                <VehicleField
                  label="Height"
                  unit="m"
                  value={vehicle.height_m}
                  onChange={(v) => updateVehicleField("height_m", v)}
                />
                <VehicleField
                  label="Width"
                  unit="m"
                  value={vehicle.width_m}
                  onChange={(v) => updateVehicleField("width_m", v)}
                />
              </div>
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
                  <span
                    className="cursor-grab text-slate-600 hover:text-slate-400 text-[11px] flex-shrink-0 leading-none"
                    aria-hidden="true"
                    title="Drag to reorder"
                  >
                    ⠿
                  </span>
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ backgroundColor: PROFILE_COLORS[profile] }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-[10px] font-mono text-slate-300 truncate">
                    {wp.label}
                  </span>
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

                <div className="flex flex-col gap-0.5 mt-1 max-h-32 overflow-y-auto">
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

            {/* Route Assessment */}
            {route && !loading && (
              <div
                className="border-t border-slate-700/60 pt-1.5 flex flex-col gap-1"
                data-testid="route-assessment"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase">
                    Route Assessment
                  </span>
                  {(summaryLoading || routeSummary) && (
                    <button
                      onClick={onSummaryModalOpen}
                      disabled={summaryLoading}
                      className="text-[9px] font-mono px-2 py-0.5 rounded border border-blue-500/50 bg-blue-900/30 text-blue-300 hover:bg-blue-800/50 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="ai-summary-btn"
                    >
                      {summaryLoading ? "Generating..." : "AI Summary"}
                    </button>
                  )}
                </div>

                {intelligenceLoading && (
                  <p
                    className="text-[9px] font-mono text-slate-500"
                    data-testid="intel-loading"
                  >
                    Analysing route…
                  </p>
                )}

                {!intelligenceLoading && intelligence && (
                  <>
                    {/* Summary line */}
                    {intelligence.summary.passable ? (
                      <p
                        className="text-[10px] font-mono font-semibold text-green-400"
                        data-testid="assessment-passable"
                      >
                        ✓ Route passable ({vehicle.label})
                        {intelligence.summary.warning > 0 ||
                        intelligence.summary.info > 0
                          ? ` · ${intelligence.summary.warning + intelligence.summary.info} notice${intelligence.summary.warning + intelligence.summary.info > 1 ? "s" : ""}`
                          : ""}
                      </p>
                    ) : (
                      <p
                        className="text-[10px] font-mono font-semibold text-red-400"
                        data-testid="assessment-impassable"
                      >
                        ✗ IMPASSABLE — {intelligence.summary.critical} critical
                        hazard{intelligence.summary.critical > 1 ? "s" : ""}
                      </p>
                    )}

                    {/* Hazard list */}
                    {intelligence.hazards.length > 0 && (
                      <div
                        className="flex flex-col gap-0.5 max-h-48 overflow-y-auto"
                        data-testid="hazard-list"
                      >
                        {intelligence.hazards.map((hazard) => (
                          <button
                            key={hazard.id}
                            onClick={() => onHazardFocus?.(hazard)}
                            className={[
                              "flex items-start gap-1.5 text-left rounded px-1.5 py-1 transition-colors w-full",
                              SEVERITY_BG[hazard.severity],
                            ].join(" ")}
                            data-testid={`hazard-row-${hazard.id}`}
                          >
                            <span
                              className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor:
                                  SEVERITY_COLOR[hazard.severity],
                              }}
                              aria-hidden="true"
                            />
                            <span className="text-[9px] font-mono text-slate-300 leading-relaxed">
                              {hazard.message}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {!intelligenceLoading && !intelligence && (
                  <p className="text-[9px] font-mono text-slate-600">
                    No infrastructure data available.
                  </p>
                )}

                {/* COMMS Coverage */}
              {!intelligenceLoading && (
                <div
                  className="border-t border-slate-700/40 pt-1.5 mt-0.5"
                  data-testid="coverage-section"
                >
                  <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase">
                    Comms Coverage
                  </span>
                  {intelligence?.coverage &&
                  intelligence.coverage.covered_pct > 0 ? (
                    <div className="mt-0.5">
                      {intelligence.coverage.covered_pct === 100 ? (
                        <p
                          className="text-[10px] font-mono font-semibold text-green-400"
                          data-testid="coverage-full"
                        >
                          ✓ Full cellular coverage
                        </p>
                      ) : (
                        <>
                          <p
                            className="text-[10px] font-mono text-slate-300"
                            data-testid="coverage-bar"
                          >
                            {Array.from({ length: 12 }, (_, i) =>
                              i <
                              Math.round(
                                intelligence.coverage!.covered_pct / (100 / 12),
                              )
                                ? "▓"
                                : "░",
                            ).join("")}{" "}
                            {intelligence.coverage.covered_pct}%
                          </p>
                          <p
                            className="text-[9px] font-mono text-slate-500"
                            data-testid="coverage-gaps"
                          >
                            {intelligence.coverage.gap_count} gap
                            {intelligence.coverage.gap_count !== 1 ? "s" : ""} ·
                            longest{" "}
                            {intelligence.coverage.longest_gap_m >= 1000
                              ? `${(intelligence.coverage.longest_gap_m / 1000).toFixed(1)} km`
                              : `${intelligence.coverage.longest_gap_m} m`}
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
                    <p
                      className="text-[10px] font-mono font-semibold text-red-400"
                      data-testid="coverage-unavailable"
                    >
                      ✗ No cellular coverage
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </div>

    );
  },
);

export default RoutePanel;

