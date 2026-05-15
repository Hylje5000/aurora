export interface AreaOfInterest {
  id: string;
  name: string;
  /** [minLng, minLat, maxLng, maxLat] — EPSG:4326, usable in fitBounds & ST_MakeEnvelope */
  bbox: [number, number, number, number];
  /** Geographic center for label placement */
  center: [number, number];
  /** Hex color for map fill/stroke */
  color: string;
  /** Human-readable description — guides DB ingestion and the explainability panel */
  description: string;
}

export const AREAS_OF_INTEREST: AreaOfInterest[] = [
  {
    id: "lappi",
    name: "Lappi",
    bbox: [20.500488, 68.114293, 23.708496, 69.388049],
    center: [22.104492, 68.751171],
    color: "#ef4444",
    description:
      "Northern Lapland — sparse road network, extreme weather conditions, border zone with Norway and Sweden. " +
      "Key features: E8/E75 highway corridors, Saariselkä highlands, Inari lake system, Ivalo airfield.",
  },
  {
    id: "karjala",
    name: "Karjala",
    bbox: [29.289551, 62.283256, 31.256104, 63.1047],
    center: [30.272827, 62.693978],
    color: "#3b82f6",
    description:
      "North Karelia — Finnish-Russian border zone, lake-forest terrain with limited road network density. " +
      "Key features: Joensuu logistics hub, Niirala border crossing, Saimaa canal system, Pielinen lake barrier.",
  },
  {
    id: "turku",
    name: "Turku",
    bbox: [21.09375, 59.76746, 23.115234, 60.565379],
    center: [22.104492, 60.166419],
    color: "#22c55e",
    description:
      "Archipelago Sea / Turku region — maritime chokepoints, island chains, critical ferry routes. " +
      "Key features: Turku port and logistics node, Archipelago Sea national park, Stockholm and Tallinn ferry links, coastal bridge network.",
  },
];
