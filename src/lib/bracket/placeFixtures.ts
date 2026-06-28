import { BRACKET_TREE } from "./tree";
import { R32_MATCHUPS } from "./seedTable";
import type { Standings, KnockoutFixture, SlotId, GroupSeed } from "./types";

// Resuelve un GroupSeed ("1A","2D") al nombre concreto del equipo según standings.
function resolveSeed(seed: GroupSeed, standings: Standings): string | null {
  const pos = parseInt(seed[0], 10);   // 1 o 2
  const group = seed.slice(1);          // "A".."L"
  const ordered = standings[group];
  if (!ordered || ordered.length < pos) return null;
  return ordered[pos - 1] ?? null;
}

export interface PlacementResult {
  placements: Record<SlotId, [string, string]>;
  warnings: string[];
}

// Siembra los 16 cruces de R32 directamente desde los standings, usando el mapa
// oficial de cruces (R32_MATCHUPS). Sólo incluye un slot si AMBOS lados resuelven
// (es decir, los grupos involucrados ya están definidos). Sirve como base para no
// depender de que la API publique todos los fixtures KO.
export function seedBracketFromStandings(
  standings: Standings
): Record<SlotId, [string, string]> {
  const out: Record<SlotId, [string, string]> = {};
  for (const [slot, [fixed, opp]] of Object.entries(R32_MATCHUPS)) {
    const a = resolveSeed(fixed, standings);
    const b = resolveSeed(opp, standings);
    if (a && b) out[slot as SlotId] = [a, b];
  }
  return out;
}

// Ubica cada fixture de R32 en el slot cuyo lado fijo (fixedSeed → equipo via
// standings) coincide con uno de los dos equipos del cruce.
export function placeKnockoutFixtures(
  fixtures: KnockoutFixture[],
  standings: Standings
): PlacementResult {
  const placements: Record<SlotId, [string, string]> = {};
  const warnings: string[] = [];

  const r32Slots = BRACKET_TREE.filter(s => s.round === "R32");
  // Precalcular equipo concreto del lado fijo de cada slot.
  const fixedTeamBySlot = new Map<SlotId, string | null>();
  for (const slot of r32Slots) {
    fixedTeamBySlot.set(slot.id, slot.fixedSeed ? resolveSeed(slot.fixedSeed, standings) : null);
  }

  for (const fx of fixtures) {
    if (fx.round !== "R32") continue;
    const match = r32Slots.find(slot => {
      const fixedTeam = fixedTeamBySlot.get(slot.id);
      return fixedTeam != null && (fixedTeam === fx.teamA || fixedTeam === fx.teamB);
    });
    if (!match) {
      warnings.push(`No se pudo ubicar el cruce ${fx.teamA} vs ${fx.teamB}: ningún fixedSeed coincide.`);
      continue;
    }
    placements[match.id] = [fx.teamA, fx.teamB];
  }

  return { placements, warnings };
}
