import type { SlotId } from "./types";

// Dado el mapa de cruces conocidos {slotId: [a,b]}, devuelve el slotId cuyo par
// de equipos es exactamente {a,b} (orden indistinto), o null.
export function identifySlotByTeams(
  matchups: Record<SlotId, [string, string]>,
  teamA: string,
  teamB: string
): SlotId | null {
  for (const [slotId, [a, b]] of Object.entries(matchups)) {
    if ((a === teamA && b === teamB) || (a === teamB && b === teamA)) return slotId as SlotId;
  }
  return null;
}
