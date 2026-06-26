import { BRACKET_TREE } from "./tree";
import type { SlotId } from "./types";

export interface SlotView {
  id: SlotId;
  round: string;
  teamA: string | null;
  teamB: string | null;
  pick: string | null;
  actualWinner: string | null;
  resolved: boolean;
  status: "correct" | "wrong" | null;
}

// Equipo que "ocupa" la salida de un slot desde la perspectiva del usuario:
// el ganador real si la ronda ya se resolvió, si no la proyección (pick) del usuario.
function advancer(
  slotId: SlotId,
  userPicks: Record<SlotId, string>,
  actualWinners: Record<SlotId, string>
): string | null {
  return actualWinners[slotId] ?? userPicks[slotId] ?? null;
}

// Calcula el view-model por casillero. R32 se siembra desde `seedR32`; las rondas
// siguientes se proyectan emparejando los advancers de sus dos sources.
export function buildDisplayBracket(
  seedR32: Record<SlotId, [string, string]>,
  userPicks: Record<SlotId, string>,
  actualWinners: Record<SlotId, string>
): Record<SlotId, SlotView> {
  const view: Record<SlotId, SlotView> = {};
  for (const slot of BRACKET_TREE) {
    let teamA: string | null;
    let teamB: string | null;
    if (slot.round === "R32") {
      const seed = seedR32[slot.id];
      teamA = seed?.[0] ?? null;
      teamB = seed?.[1] ?? null;
    } else {
      const [s1, s2] = slot.sources;
      teamA = advancer(s1, userPicks, actualWinners);
      teamB = advancer(s2, userPicks, actualWinners);
    }
    const rawPick = userPicks[slot.id] ?? null;
    const pick = rawPick && (rawPick === teamA || rawPick === teamB) ? rawPick : null;
    const actualWinner = actualWinners[slot.id] ?? null;
    const resolved = actualWinner != null;
    const status = resolved && pick ? (pick === actualWinner ? "correct" : "wrong") : null;
    view[slot.id] = { id: slot.id, round: slot.round, teamA, teamB, pick, actualWinner, resolved, status };
  }
  return view;
}
