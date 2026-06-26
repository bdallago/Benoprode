import { SlotId, GroupSeed } from "./types";

// Lado fijo (1° o 2° de grupo, nunca 3°) de cada cruce de R32, según el
// cuadro oficial del Mundial 2026. El rival de cada slot lo aporta la API.
// VALORES PROVISIONALES — se validan contra la API en el Plan 2 (cross-check).
export const R32_FIXED_SEEDS: Record<SlotId, GroupSeed> = {
  "R32-1":  "1A",
  "R32-2":  "1C",
  "R32-3":  "1E",
  "R32-4":  "1F",
  "R32-5":  "1I",
  "R32-6":  "1K",
  "R32-7":  "1D",
  "R32-8":  "1G",
  "R32-9":  "1B",
  "R32-10": "1J",
  "R32-11": "1H",
  "R32-12": "1L",
  "R32-13": "2A",
  "R32-14": "2C",
  "R32-15": "2B",
  "R32-16": "2D",
};
