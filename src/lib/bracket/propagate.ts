import { BRACKET_TREE } from "./tree";
import type { SlotId } from "./types";

// A partir de los cruces conocidos y los ganadores por slot, deriva los cruces
// de las rondas siguientes: cada slot no-R32 cuyos dos sources tienen ganador
// queda armado con esos dos ganadores. Devuelve un nuevo mapa de matchups que
// incluye los originales más los derivados.
export function propagateWinners(
  matchups: Record<SlotId, [string, string]>,
  winners: Record<SlotId, string>
): Record<SlotId, [string, string]> {
  const result: Record<SlotId, [string, string]> = { ...matchups };
  // Procesar en orden de rondas para que QF/SF/F se completen en cascada.
  for (const slot of BRACKET_TREE) {
    if (slot.sources.length !== 2) continue;
    const [s1, s2] = slot.sources;
    const w1 = winners[s1];
    const w2 = winners[s2];
    if (w1 && w2) result[slot.id] = [w1, w2];
  }
  return result;
}
