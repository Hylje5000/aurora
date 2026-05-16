export interface MilitarySymbol {
  name: string;
  sidc: string; // 15-character SIDC — MIL-STD-2525B / APP-6B
}

/**
 * Curated NATO military symbols with validated 15-character SIDCs.
 *
 * Format: S <affiliation> <battle-dimension> <status> <function-6-chars> <modifier-5-chars>
 *   e.g.  S  F             G                  P        UCI              --------
 *
 * Common values:
 *   Affiliation  F=Friend  H=Hostile  N=Neutral  U=Unknown
 *   Dimension    G=Ground  A=Air      S=Sea Surface  U=Sub-surface
 *   Status       P=Present  A=Anticipated
 */
export const MILITARY_SYMBOLS: MilitarySymbol[] = [
  // ── GROUND COMBAT UNITS ────────────────────────────────────────────────
  { name: "Infantry", sidc: "SFGPUCI--------" },
  { name: "Infantry (Mechanized)", sidc: "SFGPUCIM-------" },
  { name: "Infantry (Motorized)", sidc: "SFGPUCIT-------" },
  { name: "Armor / Tank", sidc: "SFGPUCV--------" },
  { name: "Artillery", sidc: "SFGPUCA--------" },
  { name: "Artillery (Self-Prop.)", sidc: "SFGPUCAS-------" },
  { name: "Artillery (Rocket)", sidc: "SFGPUCAR-------" },
  { name: "Air Defense Artillery", sidc: "SFGPUCAA-------" },
  { name: "Cavalry / Recon", sidc: "SFGPUCR--------" },
  { name: "Engineer", sidc: "SFGPUCE--------" },
  { name: "Medical", sidc: "SFGPUCM--------" },
  { name: "Signal / Comms", sidc: "SFGPUCS--------" },
  { name: "Logistics / Supply", sidc: "SFGPUCL--------" },
  { name: "Military Police", sidc: "SFGPUCMP-------" },
  { name: "Special Operations", sidc: "SFGPUCSO-------" },
  { name: "Electronic Warfare", sidc: "SFGPUCEW-------" },
  { name: "Aviation (Army Helo)", sidc: "SFGPUCAH-------" },

  // ── COMMAND & INSTALLATIONS ────────────────────────────────────────────
  { name: "Command Post / HQ", sidc: "SFGPUCI----H---" }, // Infantry unit + HQ modifier
  { name: "Observation Post", sidc: "SFGPUUI--------" },
  { name: "Checkpoint", sidc: "SFGPUCICP------" },
  { name: "Minefield", sidc: "SFGPOMH--------" },
  { name: "Bridge", sidc: "SFGPIMB--------" },

  // ── EQUIPMENT ──────────────────────────────────────────────────────────
  { name: "Radar", sidc: "SFGPUESR-------" },
  { name: "Radio", sidc: "SFGPUUSR-------" }, // same SIDC as cell-tower icon

  // ── AIR ────────────────────────────────────────────────────────────────
  { name: "Fighter Aircraft", sidc: "SFAPUPFF-------" },
  { name: "Bomber Aircraft", sidc: "SFAPUPFB-------" },
  { name: "Helicopter", sidc: "SFAPUPH--------" },
  { name: "UAV / Drone", sidc: "SFAPUPRU-------" },

  // ── SEA ────────────────────────────────────────────────────────────────
  { name: "Surface Warship", sidc: "SFSPU----------" },
  { name: "Submarine", sidc: "SFUPU----------" },
];

export const AFFILIATIONS = [
  { label: "Friend", code: "F", color: "#3b82f6" },
  { label: "Hostile", code: "H", color: "#ef4444" },
  { label: "Neutral", code: "N", color: "#22c55e" },
  { label: "Unknown", code: "U", color: "#eab308" },
];

/** Adjusts the identity (affiliation) of a 15-char SIDC — position index 1. */
export function setSidcAffiliation(sidc: string, affiliation: string): string {
  if (sidc.length < 2) return sidc;
  return sidc[0] + affiliation + sidc.substring(2);
}

/** Returns the current affiliation code from a SIDC. */
export function getSidcAffiliation(sidc: string): string {
  return sidc[1] || "U";
}
