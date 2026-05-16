import { describe, it, expect } from "vitest";
import {
  COLOUR_PALETTE,
  DEFAULT_LAYER_COLOUR,
  type CustomLayer,
  type CustomFeature,
  type DrawingTool,
} from "@/lib/customLayers";

describe("COLOUR_PALETTE", () => {
  it("has exactly 8 colours", () => {
    expect(COLOUR_PALETTE).toHaveLength(8);
  });

  it("every entry has a non-empty label and a valid hex string", () => {
    for (const c of COLOUR_PALETTE) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("all hex values are unique", () => {
    const hexes = COLOUR_PALETTE.map((c) => c.hex);
    expect(new Set(hexes).size).toBe(hexes.length);
  });

  it("all labels are unique", () => {
    const labels = COLOUR_PALETTE.map((c) => c.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("DEFAULT_LAYER_COLOUR", () => {
  it("equals the first palette colour", () => {
    expect(DEFAULT_LAYER_COLOUR).toBe(COLOUR_PALETTE[0].hex);
  });

  it("is a valid hex string", () => {
    expect(DEFAULT_LAYER_COLOUR).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("DrawingTool type", () => {
  it("all expected values are accepted by the type (compile-time check via array)", () => {
    const tools: DrawingTool[] = [
      "Point",
      "LineString",
      "Polygon",
      "Rectangle",
    ];
    expect(tools).toHaveLength(4);
  });
});

describe("CustomLayer shape", () => {
  it("can be constructed with required fields", () => {
    const layer: CustomLayer = {
      id: "abc",
      name: "Sector Blue",
      color: "#3b82f6",
      created_at: "2026-05-16T00:00:00Z",
      updated_at: "2026-05-16T00:00:00Z",
    };
    expect(layer.id).toBe("abc");
    expect(layer.description).toBeUndefined();
  });
});

describe("CustomFeature shape", () => {
  it("can be constructed with required fields", () => {
    const feature: CustomFeature = {
      id: "f1",
      layer_id: "l1",
      feature_type: "Polygon",
      color: "#22c55e",
      properties: {},
      created_at: "2026-05-16T00:00:00Z",
      updated_at: "2026-05-16T00:00:00Z",
    };
    expect(feature.properties).toEqual({});
    expect(feature.name).toBeUndefined();
  });

  it("properties can hold arbitrary milsymbol data", () => {
    const feature: CustomFeature = {
      id: "f2",
      layer_id: "l1",
      feature_type: "Point",
      color: "#ef4444",
      properties: { sidc: "SFGPUUSR-------", designator: "3-7 INF" },
      created_at: "2026-05-16T00:00:00Z",
      updated_at: "2026-05-16T00:00:00Z",
    };
    expect(feature.properties.sidc).toBe("SFGPUUSR-------");
  });
});
