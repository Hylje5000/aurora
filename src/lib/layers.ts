export type LayerKey = "terrain3d" | "hillshade" | "contours" | "landcover";

export interface LayerVisibility extends Record<LayerKey, boolean> {
  terrain3d: boolean;
  hillshade: boolean;
  contours: boolean;
  landcover: boolean;
}

export const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  terrain3d: false,
  hillshade: true,
  contours: true,
  landcover: true,
};

// Maps each toggle key to the Mapbox layer IDs it controls.
// terrain3d has no layer IDs — it's controlled via map.setTerrain().
export const LAYER_GROUPS: Record<LayerKey, string[]> = {
  terrain3d: [],
  hillshade: ["hillshading"],
  contours: ["contours-minor", "contours-major", "contours-labels"],
  landcover: ["landcover-military"],
};
