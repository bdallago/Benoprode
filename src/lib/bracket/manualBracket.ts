import { getSlot } from "./tree";
import type { SlotId } from "./types";
import type { KoScheduleRow } from "../ko-schedule";

// Cuadro real FIFA 2026 — ORDEN VIEJO/REAL de slots R32 (el que viven las predicciones
// y los ganadores en Firestore). El emparejamiento de octavos→final NO depende de la
// adyacencia estándar: lo definen las KO_SOURCES reales en tree.ts. Esta constante ya no
// se usa en runtime (AdminResults lee bracketMatchups de Firestore); se conserva veraz
// como referencia del orden real de 16avos.
export const R32_ACTUAL_MATCHUPS: Record<SlotId, [string, string]> = {
  "R32-1":  ["México", "Ecuador"],
  "R32-2":  ["Brasil", "Japón"],
  "R32-3":  ["Alemania", "Paraguay"],
  "R32-4":  ["Países Bajos", "Marruecos"],
  "R32-5":  ["Francia", "Suecia"],
  "R32-6":  ["Colombia", "Ghana"],
  "R32-7":  ["Estados Unidos", "Bosnia y Herzegovina"],
  "R32-8":  ["Bélgica", "Senegal"],
  "R32-9":  ["Suiza", "Argelia"],
  "R32-10": ["Argentina", "Cabo Verde"],
  "R32-11": ["España", "Austria"],
  "R32-12": ["Inglaterra", "República Democrática del Congo"],
  "R32-13": ["Sudáfrica", "Canadá"],
  "R32-14": ["Costa de Marfil", "Noruega"],
  "R32-15": ["Portugal", "Croacia"],
  "R32-16": ["Australia", "Egipto"],
};

// Kickoffs confirmados (ms UTC). ART = UTC−3, por eso se suma 3h.
export const KO_KICKOFFS: Record<SlotId, number> = {
  "R16-1": Date.UTC(2026, 6, 4, 17, 0),   // M90 Sáb 4/7 14:00 ART
  "R16-2": Date.UTC(2026, 6, 4, 21, 0),   // M89 Sáb 4/7 18:00 ART
  "R16-3": Date.UTC(2026, 6, 6, 19, 0),   // M93 Lun 6/7 16:00 ART
  "R16-4": Date.UTC(2026, 6, 7, 0, 0),    // M94 Lun 6/7 21:00 ART
  "R16-5": Date.UTC(2026, 6, 5, 20, 0),   // M91 Dom 5/7 17:00 ART
  "R16-6": Date.UTC(2026, 6, 6, 0, 0),    // M92 Dom 5/7 21:00 ART
  "R16-7": Date.UTC(2026, 6, 7, 16, 0),   // M95 Mar 7/7 13:00 ART
  "R16-8": Date.UTC(2026, 6, 7, 20, 0),   // M96 Mar 7/7 17:00 ART
  "QF-1":  Date.UTC(2026, 6, 9, 20, 0),   // M97 Jue 9/7 17:00 ART
  "QF-2":  Date.UTC(2026, 6, 10, 19, 0),  // M98 Vie 10/7 16:00 ART
  "QF-3":  Date.UTC(2026, 6, 11, 21, 0),  // M99 Sáb 11/7 18:00 ART
  "QF-4":  Date.UTC(2026, 6, 12, 1, 0),   // M100 Sáb 11/7 22:00 ART
  "SF-1":  Date.UTC(2026, 6, 14, 19, 0),  // SF1 Mar 14/7 16:00 ART
  "SF-2":  Date.UTC(2026, 6, 15, 19, 0),  // SF2 Mié 15/7 16:00 ART
  "F":     Date.UTC(2026, 6, 19, 19, 0),  // Final Dom 19/7 16:00 ART
};

// Construye koSchedule (para el mensaje diario) desde los cruces conocidos + kickoffs.
// Solo incluye slots con ambos equipos definidos y kickoff en KO_KICKOFFS.
export function buildManualKoSchedule(
  matchups: Record<SlotId, [string, string]>,
  kickoffs: Record<SlotId, number>
): Record<SlotId, KoScheduleRow> {
  const out: Record<SlotId, KoScheduleRow> = {};
  for (const [slotId, pair] of Object.entries(matchups)) {
    const kickoff = kickoffs[slotId];
    if (kickoff == null) continue;
    const [teamA, teamB] = pair;
    if (!teamA || !teamB) continue;
    out[slotId] = {
      fixtureId: slotId,
      round: getSlot(slotId).round,
      teamA,
      teamB,
      date: new Date(kickoff).toISOString(),
      statusCode: "NS",
      goalsA: null,
      goalsB: null,
    };
  }
  return out;
}
