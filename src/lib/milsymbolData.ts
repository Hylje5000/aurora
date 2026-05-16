export interface MilitarySymbol {
  name: string;
  sidc: string; // 15-character SIDC (usually Friend Present)
}

/**
 * A curated list of common NATO military symbols (APP-6 / MIL-STD-2525).
 * We use 'F' (Friend) and 'P' (Present) as the defaults for the stored SIDC.
 */
export const MILITARY_SYMBOLS: MilitarySymbol[] = [
  // UNITS - LAND
  { name: "Infantry", sidc: "SFG-UCI--------" },
  { name: "Infantry (Mechanized)", sidc: "SFG-UCIM-------" },
  { name: "Infantry (Motorized)", sidc: "SFG-UCIT-------" },
  { name: "Armor / Tank", sidc: "SFG-UCV--------" },
  { name: "Armor (Light)", sidc: "SFG-UCVL-------" },
  { name: "Artillery", sidc: "SFG-UCA--------" },
  { name: "Artillery (Self-Propelled)", sidc: "SFG-UCAS-------" },
  { name: "Artillery (Rocket)", sidc: "SFG-UCAR-------" },
  { name: "Artillery (Anti-Aircraft)", sidc: "SFG-UCAA-------" },
  { name: "Cavalry / Recon", sidc: "SFG-UCR--------" },
  { name: "Engineer", sidc: "SFG-UCE--------" },
  { name: "Medical", sidc: "SFG-UCM--------" },
  { name: "Signal / Comm", sidc: "SFG-UCS--------" },
  { name: "Supply / Logistics", sidc: "SFG-UCL--------" },
  { name: "Maintenance", sidc: "SFG-UCMN-------" },
  { name: "Military Police", sidc: "SFG-UCMP-------" },
  { name: "Special Operations (SOF)", sidc: "SFG-UCSO-------" },
  { name: "Aviation (Rotary Wing)", sidc: "SFG-UCAR-------" },

  // INSTALLATIONS / EQUIPMENT
  { name: "Observation Post", sidc: "SFG-GPP--------" },
  { name: "Command Post / HQ", sidc: "SFG-UC----H----" },
  { name: "Electronic Warfare (EW)", sidc: "SFG-UCW--------" },
  { name: "Radar", sidc: "SFG-ESR--------" },
  { name: "Radio Unit", sidc: "SFG-USR--------" },
  { name: "Bridge", sidc: "SFG-EHB--------" },
  { name: "Minefield", sidc: "SFG-OPM--------" },
  { name: "Checkpoint", sidc: "SFG-GPC--------" },

  // AIR
  { name: "Fighter Aircraft", sidc: "SFA-UPFF-------" },
  { name: "Bomber Aircraft", sidc: "SFA-UPFB-------" },
  { name: "UAV / Drone", sidc: "SFA-UPRU-------" },
  { name: "Helicopter", sidc: "SFA-UPH--------" },

  // SEA
  { name: "Surface Combatant", sidc: "SFS-UP---------" },
  { name: "Submarine", sidc: "SS--UP---------" },

  // EMERGENCY / CIVILIAN (using neutral/unknown identity often)
  { name: "Police", sidc: "SNG-UCMP-------" },
  { name: "Fire", sidc: "SNG-UCFR-------" },
];

export const AFFILIATIONS = [
  { label: "Friend", code: "F", color: "#3b82f6" }, // Blue
  { label: "Hostile", code: "H", color: "#ef4444" }, // Red
  { label: "Neutral", code: "N", color: "#22c55e" }, // Green
  { label: "Unknown", code: "U", color: "#eab308" }, // Yellow
];

/**
 * Adjusts the identity (affiliation) of a 15-char SIDC.
 * Position 2 in SIDC is the identity.
 */
export function setSidcAffiliation(sidc: string, affiliation: string): string {
  if (sidc.length < 2) return sidc;
  return sidc[0] + affiliation + sidc.substring(2);
}

/**
 * Gets the current affiliation code from a SIDC.
 */
export function getSidcAffiliation(sidc: string): string {
  return sidc[1] || "U";
}
