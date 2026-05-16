export type RouteProfile =
  | "driving"
  | "walking"
  | "cycling"
  | "driving-traffic";

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
  walking: "#22c55e",
  cycling: "#eab308",
  "driving-traffic": "#f97316",
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
    case "driving-traffic":
      return "Driving (traffic)";
  }
}
