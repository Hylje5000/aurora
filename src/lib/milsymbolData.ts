export interface MilitarySymbol {
  name: string;
  sidc: string; // 15-character SIDC — validated against milsymbol v3
}

/**
 * Curated NATO military symbols with SIDCs empirically validated against
 * milsymbol v3. Every entry was tested to produce a real icon (not the
 * fallback "?" glyph).
 *
 * Format: S <affiliation> <dimension> <status> <function (up to 11 chars)>
 *   Affiliation  F=Friend  H=Hostile  N=Neutral  U=Unknown
 *   Dimension    G=Ground  A=Air  S=Sea Surface  U=Subsurface  O=SOF
 *   Status       P=Present  A=Anticipated
 */
export const MILITARY_SYMBOLS: MilitarySymbol[] = [
  // ── GROUND COMBAT UNITS ───────────────────────────────────────────────
  { name: "Infantry", sidc: "SFGPUCI--------" },
  { name: "Infantry (Mechanized)", sidc: "SFGPUCIM-------" },
  { name: "Armor / Tank", sidc: "SFGPUCV--------" },
  { name: "Artillery", sidc: "SFGPUCA--------" },
  { name: "Air Defense Artillery", sidc: "SFGPUCAA-------" },
  { name: "Cavalry / Recon", sidc: "SFGPUCR--------" },
  { name: "Engineer", sidc: "SFGPUCE--------" },
  { name: "Medical", sidc: "SFGPUCM--------" },
  { name: "Signal / Comms", sidc: "SFGPUCS--------" },
  { name: "Logistics / Supply", sidc: "SFGPUS---------" },
  { name: "Military Police", sidc: "SFGPUSMP-------" },
  { name: "Electronic Warfare", sidc: "SFGPEWG--------" },
  { name: "Aviation (Helo)", sidc: "SFGPUH---------" },

  // ── COMMAND & INSTALLATIONS ───────────────────────────────────────────
  { name: "Command Post / HQ", sidc: "SFGPUCI----H---" },
  { name: "Observation Post", sidc: "SFGPUUI--------" },
  { name: "Bridge", sidc: "SFGPIB---------" },

  // ── EQUIPMENT ─────────────────────────────────────────────────────────
  { name: "Radar", sidc: "SFGPESR--------" },
  { name: "Radio", sidc: "SFGPUUSR-------" },

  // ── AIR ───────────────────────────────────────────────────────────────
  { name: "Fighter Aircraft", sidc: "SFAPMF---------" },
  { name: "Bomber Aircraft", sidc: "SFAPWB---------" },
  { name: "Helicopter", sidc: "SFAPMH---------" },
  { name: "UAV / Drone", sidc: "SFAPWD---------" },

  // ── SEA ───────────────────────────────────────────────────────────────
  { name: "Surface Warship", sidc: "SFSPCP---------" },
  { name: "Submarine", sidc: "SFUPNA---------" },
];

export const AFFILIATIONS = [
  { label: "Friend", code: "F", color: "#3b82f6" },
  { label: "Hostile", code: "H", color: "#ef4444" },
  { label: "Neutral", code: "N", color: "#22c55e" },
  { label: "Unknown", code: "U", color: "#eab308" },
];

/** Adjusts the affiliation (identity) of a 15-char SIDC — index 1. */
export function setSidcAffiliation(sidc: string, affiliation: string): string {
  if (sidc.length < 2) return sidc;
  return sidc[0] + affiliation + sidc.substring(2);
}

/** Returns the current affiliation code from a SIDC. */
export function getSidcAffiliation(sidc: string): string {
  return sidc[1] || "U";
}
