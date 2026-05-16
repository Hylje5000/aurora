import { describe, it, expect } from "vitest";
import {
  formatDuration,
  formatDistance,
  profileLabel,
  PROFILE_COLORS,
} from "@/lib/routing";

describe("formatDuration", () => {
  it("returns seconds for values under 60", () => {
    expect(formatDuration(0)).toBe("0 s");
    expect(formatDuration(30)).toBe("30 s");
    expect(formatDuration(59)).toBe("59 s");
  });

  it("returns minutes for values 60–3599 s", () => {
    expect(formatDuration(60)).toBe("1 min");
    expect(formatDuration(90)).toBe("2 min");
    expect(formatDuration(3540)).toBe("59 min");
  });

  it("returns hours only when minutes remainder is 0", () => {
    expect(formatDuration(3600)).toBe("1 h");
    expect(formatDuration(7200)).toBe("2 h");
  });

  it("returns hours and minutes when remainder is non-zero", () => {
    expect(formatDuration(3660)).toBe("1 h 1 min");
    expect(formatDuration(5040)).toBe("1 h 24 min");
  });
});

describe("formatDistance", () => {
  it("returns metres for values under 1 km", () => {
    expect(formatDistance(0)).toBe("0 m");
    expect(formatDistance(340)).toBe("340 m");
    expect(formatDistance(999)).toBe("999 m");
  });

  it("returns km with one decimal for 1 km and above", () => {
    expect(formatDistance(1000)).toBe("1.0 km");
    expect(formatDistance(12400)).toBe("12.4 km");
    expect(formatDistance(500)).toBe("500 m");
  });
});

describe("profileLabel", () => {
  it("returns the correct label for each profile", () => {
    expect(profileLabel("driving")).toBe("Driving");
    expect(profileLabel("walking")).toBe("Walking");
    expect(profileLabel("cycling")).toBe("Cycling");
    expect(profileLabel("driving-traffic")).toBe("Driving (traffic)");
  });
});

describe("PROFILE_COLORS", () => {
  it("has an entry for every profile", () => {
    const profiles = [
      "driving",
      "walking",
      "cycling",
      "driving-traffic",
    ] as const;
    for (const p of profiles) {
      expect(PROFILE_COLORS[p]).toBeDefined();
    }
  });

  it("all values are valid hex color strings", () => {
    for (const color of Object.values(PROFILE_COLORS)) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("all color values are unique", () => {
    const colors = Object.values(PROFILE_COLORS);
    expect(new Set(colors).size).toBe(colors.length);
  });
});
