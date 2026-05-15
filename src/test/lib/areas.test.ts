import { describe, it, expect } from "vitest";
import { AREAS_OF_INTEREST } from "@/lib/areas";

describe("AREAS_OF_INTEREST", () => {
  it("contains exactly 3 areas", () => {
    expect(AREAS_OF_INTEREST).toHaveLength(3);
  });

  it("has unique ids", () => {
    const ids = AREAS_OF_INTEREST.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes lappi, karjala, and turku", () => {
    const ids = AREAS_OF_INTEREST.map((a) => a.id);
    expect(ids).toContain("lappi");
    expect(ids).toContain("karjala");
    expect(ids).toContain("turku");
  });

  it.each(AREAS_OF_INTEREST)("$name bbox is a valid 4-tuple", (area) => {
    const [minLng, minLat, maxLng, maxLat] = area.bbox;
    expect(area.bbox).toHaveLength(4);
    expect(typeof minLng).toBe("number");
    expect(typeof minLat).toBe("number");
    expect(typeof maxLng).toBe("number");
    expect(typeof maxLat).toBe("number");
    expect(minLng).toBeLessThan(maxLng);
    expect(minLat).toBeLessThan(maxLat);
  });

  it.each(AREAS_OF_INTEREST)("$name center is a valid 2-tuple", (area) => {
    expect(area.center).toHaveLength(2);
    expect(typeof area.center[0]).toBe("number");
    expect(typeof area.center[1]).toBe("number");
  });

  it.each(AREAS_OF_INTEREST)("$name center falls within its bbox", (area) => {
    const [minLng, minLat, maxLng, maxLat] = area.bbox;
    const [lng, lat] = area.center;
    expect(lng).toBeGreaterThanOrEqual(minLng);
    expect(lng).toBeLessThanOrEqual(maxLng);
    expect(lat).toBeGreaterThanOrEqual(minLat);
    expect(lat).toBeLessThanOrEqual(maxLat);
  });

  it.each(AREAS_OF_INTEREST)("$name has a non-empty description", (area) => {
    expect(area.description.length).toBeGreaterThan(20);
  });
});
