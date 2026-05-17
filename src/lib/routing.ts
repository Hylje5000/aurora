export type RouteProfile = "driving" | "walking" | "cycling";

export interface VehicleProfile {
  label: string;
  mass_t: number;
  axle_mass_t: number;
  bogie_mass_t: number;
  height_m: number;
  width_m: number;
}

export const VEHICLE_PRESETS: VehicleProfile[] = [
  {
    label: "Infantry",
    mass_t: 0,
    axle_mass_t: 0,
    bogie_mass_t: 0,
    height_m: 2.0,
    width_m: 0.8,
  },
  {
    label: "Wheeled APC",
    mass_t: 18,
    axle_mass_t: 9,
    bogie_mass_t: 0,
    height_m: 2.7,
    width_m: 2.7,
  },
  {
    label: "IFV (BMP-type)",
    mass_t: 22,
    axle_mass_t: 0,
    bogie_mass_t: 6,
    height_m: 2.4,
    width_m: 3.2,
  },
  {
    label: "MBT (tank)",
    mass_t: 60,
    axle_mass_t: 0,
    bogie_mass_t: 15,
    height_m: 2.9,
    width_m: 3.6,
  },
  {
    label: "Custom",
    mass_t: 0,
    axle_mass_t: 0,
    bogie_mass_t: 0,
    height_m: 2.0,
    width_m: 1.0,
  },
];

export type HazardSeverity = "critical" | "warning" | "info";

export interface RouteHazard {
  id: string;
  type: "road" | "bridge";
  severity: HazardSeverity;
  message: string;
  coordinates: [number, number];
  properties: Record<string, unknown>;
}

export interface CoverageAnalysis {
  route_length_m: number;
  covered_pct: number;
  gap_count: number;
  longest_gap_m: number;
  gap_geometry: GeoJSON.Geometry | null;
}

export interface RouteIntelligence {
  hazards: RouteHazard[];
  summary: {
    critical: number;
    warning: number;
    info: number;
    passable: boolean;
  };
  coverage?: CoverageAnalysis | null;
}

export interface Waypoint {
  id: string;
  label: string;
  coordinates: [number, number];
}

export interface RouteStep {
  instruction: string;
  distance_m: number;
  duration_s: number;
}

export interface RouteLeg {
  distance_m: number;
  duration_s: number;
  steps: RouteStep[];
}

export interface PlannedRoute {
  geometry: GeoJSON.LineString;
  total_distance_m: number;
  total_duration_s: number;
  legs: RouteLeg[];
}

export const PROFILE_COLORS: Record<RouteProfile, string> = {
  driving: "#3b82f6",
  walking: "#4ade80",
  cycling: "#fbbf24",
};

export function formatDuration(s: number): string {
  if (s < 60) return `${Math.round(s)} s`;
  const totalMin = Math.round(s / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  return min > 0 ? `${h} h ${min} min` : `${h} h`;
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export function profileLabel(p: RouteProfile): string {
  switch (p) {
    case "driving":
      return "Driving";
    case "walking":
      return "Walking";
    case "cycling":
      return "Cycling";
  }
}
