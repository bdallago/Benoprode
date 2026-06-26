import { BracketSlot, Round, SlotId } from "./types";
import { R32_FIXED_SEEDS } from "./seedTable";

const ROUND_POINTS: Record<Round, number> = { R32: 2, R16: 4, QF: 6, SF: 8, F: 15 };

// Genera la conectividad estándar de single-elimination:
// R16-i se alimenta de R32-(2i-1) y R32-(2i), y así sucesivamente.
function buildRound(round: Round, count: number, prevPrefix: string | null, prevCount: number): BracketSlot[] {
  const prefix = round;
  const slots: BracketSlot[] = [];
  for (let i = 1; i <= count; i++) {
    const id = count === 1 ? "F" : `${prefix}-${i}`;
    const sources: SlotId[] = prevPrefix
      ? [
          prevCount === 1 ? prevPrefix : `${prevPrefix}-${2 * i - 1}`,
          prevCount === 1 ? prevPrefix : `${prevPrefix}-${2 * i}`,
        ]
      : [];
    const slot: BracketSlot = { id, round, sources };
    if (round === "R32") slot.fixedSeed = R32_FIXED_SEEDS[id];
    slots.push(slot);
  }
  return slots;
}

export const BRACKET_TREE: BracketSlot[] = [
  ...buildRound("R32", 16, null, 0),
  ...buildRound("R16", 8, "R32", 16),
  ...buildRound("QF", 4, "R16", 8),
  ...buildRound("SF", 2, "QF", 4),
  ...buildRound("F", 1, "SF", 2),
];

const SLOT_BY_ID = new Map(BRACKET_TREE.map(s => [s.id, s]));

export function getSlot(id: SlotId): BracketSlot {
  const slot = SLOT_BY_ID.get(id);
  if (!slot) throw new Error(`Unknown slot id: ${id}`);
  return slot;
}

export function hasSlot(id: SlotId): boolean {
  return SLOT_BY_ID.has(id);
}

export function pointsForSlot(id: SlotId): number {
  return ROUND_POINTS[getSlot(id).round];
}
