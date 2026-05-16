export interface CustomLayer {
  id: string;
  name: string;
  description?: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CustomFeature {
  id: string;
  layer_id: string;
  name?: string;
  description?: string;
  feature_type: DrawingTool;
  color: string;
  /** Reserved for future milsymbol / SIDC data */
  properties: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type DrawingTool = "Point" | "LineString" | "Polygon" | "Rectangle";

export interface ColourOption {
  label: string;
  hex: string;
}

export const COLOUR_PALETTE: ColourOption[] = [
  { label: "Red", hex: "#ef4444" },
  { label: "Orange", hex: "#f97316" },
  { label: "Yellow", hex: "#eab308" },
  { label: "Green", hex: "#22c55e" },
  { label: "Blue", hex: "#3b82f6" },
  { label: "Cyan", hex: "#06b6d4" },
  { label: "White", hex: "#f8fafc" },
  { label: "Purple", hex: "#a855f7" },
];

export const DEFAULT_LAYER_COLOUR = COLOUR_PALETTE[0].hex;
