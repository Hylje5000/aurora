import { describe, it, expect } from "vitest";
import { DEFAULT_MAP_TOOL } from "@/lib/mapTool";
import type { MapTool, MeasurementState } from "@/lib/mapTool";

describe("mapTool module", () => {
  it("DEFAULT_MAP_TOOL is grab", () => {
    expect(DEFAULT_MAP_TOOL).toBe("grab");
  });

  it("MapTool union includes all four values", () => {
    const values: MapTool[] = [
      "grab",
      "click",
      "measure-distance",
      "measure-area",
    ];
    expect(values).toHaveLength(4);
    expect(values).toContain("grab");
    expect(values).toContain("click");
    expect(values).toContain("measure-distance");
    expect(values).toContain("measure-area");
  });

  it("MeasurementState allows optional fields", () => {
    const empty: MeasurementState = {};
    const dist: MeasurementState = { distance_km: 3.2 };
    const area: MeasurementState = { area_km2: 1.4 };
    const both: MeasurementState = { distance_km: 1, area_km2: 2 };
    expect(empty).toBeDefined();
    expect(dist.distance_km).toBe(3.2);
    expect(area.area_km2).toBe(1.4);
    expect(both.distance_km).toBe(1);
    expect(both.area_km2).toBe(2);
  });
});
