import { describe, it, expect } from "vitest";
import {
  DEFAULT_LAYER_VISIBILITY,
  LAYER_GROUPS,
  type LayerKey,
} from "@/lib/layers";

const ALL_KEYS: LayerKey[] = [
  "terrain3d",
  "hillshade",
  "contours",
  "landcover",
  "cellGSM",
  "cellUMTS",
  "cellLTE",
  "cellCDMA",
];

describe("DEFAULT_LAYER_VISIBILITY", () => {
  it("contains all layer keys", () => {
    for (const key of ALL_KEYS) {
      expect(key in DEFAULT_LAYER_VISIBILITY).toBe(true);
    }
  });

  it("has terrain3d off by default", () => {
    expect(DEFAULT_LAYER_VISIBILITY.terrain3d).toBe(false);
  });

  it("has hillshade, contours, landcover on by default", () => {
    expect(DEFAULT_LAYER_VISIBILITY.hillshade).toBe(true);
    expect(DEFAULT_LAYER_VISIBILITY.contours).toBe(true);
    expect(DEFAULT_LAYER_VISIBILITY.landcover).toBe(true);
  });

  it("has all cell tower types on by default", () => {
    expect(DEFAULT_LAYER_VISIBILITY.cellGSM).toBe(true);
    expect(DEFAULT_LAYER_VISIBILITY.cellUMTS).toBe(true);
    expect(DEFAULT_LAYER_VISIBILITY.cellLTE).toBe(true);
    expect(DEFAULT_LAYER_VISIBILITY.cellCDMA).toBe(true);
  });
});

describe("LAYER_GROUPS", () => {
  it("contains all layer keys", () => {
    for (const key of ALL_KEYS) {
      expect(key in LAYER_GROUPS).toBe(true);
    }
  });

  it("terrain3d maps to no layer IDs (uses setTerrain instead)", () => {
    expect(LAYER_GROUPS.terrain3d).toEqual([]);
  });

  it("hillshade maps to hillshading layer", () => {
    expect(LAYER_GROUPS.hillshade).toEqual(["hillshading"]);
  });

  it("contours maps to three contour layers", () => {
    expect(LAYER_GROUPS.contours).toEqual([
      "contours-minor",
      "contours-major",
      "contours-labels",
    ]);
  });

  it("landcover maps to landcover-military layer", () => {
    expect(LAYER_GROUPS.landcover).toEqual(["landcover-military"]);
  });

  it("cellGSM maps to cell-towers-gsm layer", () => {
    expect(LAYER_GROUPS.cellGSM).toEqual(["cell-towers-gsm"]);
  });

  it("cellUMTS maps to cell-towers-umts layer", () => {
    expect(LAYER_GROUPS.cellUMTS).toEqual(["cell-towers-umts"]);
  });

  it("cellLTE maps to cell-towers-lte layer", () => {
    expect(LAYER_GROUPS.cellLTE).toEqual(["cell-towers-lte"]);
  });

  it("cellCDMA maps to cell-towers-cdma layer", () => {
    expect(LAYER_GROUPS.cellCDMA).toEqual(["cell-towers-cdma"]);
  });
});
