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

// Sources REALES del cuadro FIFA 2026 (no la adyacencia estándar 2i-1/2i).
// Cada slot R16→F se alimenta de los cruces oficiales. El orden [a, b] define
// teamA/teamB según el cuadro publicado.
const KO_SOURCES: Partial<Record<SlotId, [SlotId, SlotId]>> = {
  "R16-1": ["R32-13", "R32-4"],  // Canadá vs Marruecos
  "R16-2": ["R32-3", "R32-5"],   // Paraguay vs Francia
  "R16-3": ["R32-15", "R32-11"], // [Por/Cro] vs [Esp/Aus]
  "R16-4": ["R32-7", "R32-8"],   // [EEUU/Bos] vs [Bél/Sen]
  "R16-5": ["R32-2", "R32-14"],  // Brasil vs Noruega
  "R16-6": ["R32-1", "R32-12"],  // México vs [Ing/RDC]
  "R16-7": ["R32-10", "R32-16"], // [Arg/CV] vs [Aus/Egi]
  "R16-8": ["R32-9", "R32-6"],   // [Sui/Arg] vs [Col/Gha]
  "QF-1": ["R16-2", "R16-1"],
  "QF-2": ["R16-3", "R16-4"],
  "QF-3": ["R16-5", "R16-6"],
  "QF-4": ["R16-7", "R16-8"],
  "SF-1": ["QF-1", "QF-2"],
  "SF-2": ["QF-3", "QF-4"],
  "F": ["SF-1", "SF-2"],
};

export const BRACKET_TREE: BracketSlot[] = [
  ...buildRound("R32", 16, null, 0),
  ...buildRound("R16", 8, "R32", 16),
  ...buildRound("QF", 4, "R16", 8),
  ...buildRound("SF", 2, "QF", 4),
  ...buildRound("F", 1, "SF", 2),
].map((slot) => (KO_SOURCES[slot.id] ? { ...slot, sources: KO_SOURCES[slot.id]! } : slot));

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
