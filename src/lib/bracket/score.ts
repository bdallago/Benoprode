import { pointsForSlot, hasSlot } from "./tree";
import type { SlotId } from "./types";

// Puntaje del cuadro: por cada slot donde el equipo elegido coincide con el
// equipo que realmente avanzó, suma los puntos de esa ronda. Rondas independientes.
export function scoreBracket(
  predKnockouts: Record<SlotId, string>,
  resultKnockouts: Record<SlotId, string>
): number {
  let total = 0;
  for (const [slotId, actualTeam] of Object.entries(resultKnockouts)) {
    if (!actualTeam) continue;
    if (!hasSlot(slotId)) {
      console.warn(`[scoreBracket] slot desconocido en resultados, ignorado: ${slotId}`);
      continue;
    }
    const picked = predKnockouts[slotId];
    if (picked && picked === actualTeam) {
      total += pointsForSlot(slotId);
    }
  }
  return total;
}
