export type LayerKey =
  | "terrain3d"
  | "hillshade"
  | "contours"
  | "landcover"
  | "cellGSM"
  | "cellUMTS"
  | "cellLTE"
  | "cellCDMA"
  | "roads"
  | "bridges"
  | "railways"
  | "municipalities";

export interface LayerVisibility extends Record<LayerKey, boolean> {
  terrain3d: boolean;
  hillshade: boolean;
  contours: boolean;
  landcover: boolean;
  cellGSM: boolean;
  cellUMTS: boolean;
  cellLTE: boolean;
  cellCDMA: boolean;
  roads: boolean;
  bridges: boolean;
  railways: boolean;
  municipalities: boolean;
}

export const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  terrain3d: false,
  hillshade: true,
  contours: true,
  landcover: true,
  cellGSM: true,
  cellUMTS: true,
  cellLTE: true,
  cellCDMA: true,
  roads: true,
  bridges: true,
  railways: true,
  municipalities: false,
};

// Maps each toggle key to the Mapbox layer IDs it controls.
// terrain3d has no layer IDs — it's controlled via map.setTerrain().
export const LAYER_GROUPS: Record<LayerKey, string[]> = {
  terrain3d: [],
  hillshade: ["hillshading"],
  contours: ["contours-minor", "contours-major", "contours-labels"],
  landcover: ["landcover-military"],
  cellGSM: ["cell-towers-gsm"],
  cellUMTS: ["cell-towers-umts"],
  cellLTE: ["cell-towers-lte"],
  cellCDMA: ["cell-towers-cdma"],
  roads: ["roads-line"],
  bridges: ["bridges-symbol"],
  railways: ["railways-line"],
  municipalities: ["municipalities-fill", "municipalities-outline"],
};
