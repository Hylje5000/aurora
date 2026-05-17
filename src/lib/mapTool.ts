export type MapTool = "grab" | "click" | "measure-distance" | "measure-area";

export const DEFAULT_MAP_TOOL: MapTool = "grab";

export interface MeasurementState {
  distance_km?: number;
  area_km2?: number;
}
