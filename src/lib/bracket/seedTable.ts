import { SlotId, GroupSeed } from "./types";

// Lado fijo (1° o 2° de grupo, nunca 3°) de cada cruce de R32, según el
// cuadro oficial del Mundial 2026. El rival de cada slot lo aporta la API.
// VALORES PROVISIONALES — se validan contra la API en el Plan 2 (cross-check).
// Cruce completo de cada slot de R32 según el cuadro oficial del Mundial 2026
// (FIFA): [lado fijo, rival]. Permite sembrar el bracket directo desde standings
// sin depender de que la API publique todos los fixtures KO.
export const R32_MATCHUPS: Record<SlotId, [GroupSeed, GroupSeed]> = {
  "R32-1":  ["1A", "3E"],
  "R32-2":  ["1C", "2F"],
  "R32-3":  ["1E", "3D"],
  "R32-4":  ["1F", "2C"],
  "R32-5":  ["1I", "3F"],
  "R32-6":  ["1K", "3L"],
  "R32-7":  ["1D", "3B"],
  "R32-8":  ["1G", "3I"],
  "R32-9":  ["1B", "3J"],
  "R32-10": ["1J", "2H"],
  "R32-11": ["1H", "2J"],
  "R32-12": ["1L", "3K"],
  "R32-13": ["2A", "2B"],
  "R32-14": ["2E", "2I"],
  "R32-15": ["2K", "2L"],
  "R32-16": ["2D", "2G"],
};

// Lado fijo de cada cruce (primer elemento del matchup). Lo usa placeFixtures
// para ubicar los fixtures KO de la API por identidad de equipos.
export const R32_FIXED_SEEDS: Record<SlotId, GroupSeed> = Object.fromEntries(
  Object.entries(R32_MATCHUPS).map(([slot, [fixed]]) => [slot, fixed])
) as Record<SlotId, GroupSeed>;
