export type LayerKey =
  | "satellite"
  | "terrain3d"
  | "hillshade"
  | "contours"
  | "landcover"
  | "cellGSM"
  | "cellUMTS"
  | "cellLTE"
  | "cellCDMA";

export interface LayerVisibility extends Record<LayerKey, boolean> {
  satellite: boolean;
  terrain3d: boolean;
  hillshade: boolean;
  contours: boolean;
  landcover: boolean;
  cellGSM: boolean;
  cellUMTS: boolean;
  cellLTE: boolean;
  cellCDMA: boolean;
}

export const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  satellite: false,
  terrain3d: false,
  hillshade: true,
  contours: true,
  landcover: true,
  cellGSM: true,
  cellUMTS: true,
  cellLTE: true,
  cellCDMA: true,
};

// Maps each toggle key to the Mapbox layer IDs it controls.
// terrain3d has no layer IDs — it's controlled via map.setTerrain().
// satellite has no layer IDs — it's controlled via map.setStyle().
export const LAYER_GROUPS: Record<LayerKey, string[]> = {
  satellite: [],
  terrain3d: [],
  hillshade: ["hillshading"],
  contours: ["contours-minor", "contours-major", "contours-labels"],
  landcover: ["landcover-military"],
  cellGSM: ["cell-towers-gsm"],
  cellUMTS: ["cell-towers-umts"],
  cellLTE: ["cell-towers-lte"],
  cellCDMA: ["cell-towers-cdma"],
};
