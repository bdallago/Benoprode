import { describe, it, expect } from "vitest";
import { R32_ACTUAL_MATCHUPS, KO_KICKOFFS, buildManualKoSchedule } from "./manualBracket";
import { propagateWinners } from "./propagate";
import type { SlotId } from "./types";

describe("R32_ACTUAL_MATCHUPS", () => {
  it("tiene los 16 slots R32 en el orden de adyacencia correcto", () => {
    expect(R32_ACTUAL_MATCHUPS["R32-1"]).toEqual(["Sudáfrica", "Canadá"]);
    expect(R32_ACTUAL_MATCHUPS["R32-2"]).toEqual(["Países Bajos", "Marruecos"]);
    expect(R32_ACTUAL_MATCHUPS["R32-3"]).toEqual(["Alemania", "Paraguay"]);
    expect(R32_ACTUAL_MATCHUPS["R32-4"]).toEqual(["Francia", "Suecia"]);
    expect(R32_ACTUAL_MATCHUPS["R32-12"]).toEqual(["Inglaterra", "RD Congo"]);
    expect(Object.keys(R32_ACTUAL_MATCHUPS)).toHaveLength(16);
  });

  it("propaga a octavos según el cuadro real (P90=R16-1, P89=R16-2)", () => {
    const winners: Record<SlotId, string> = {
      "R32-1": "Canadá", "R32-2": "Marruecos",
      "R32-3": "Paraguay", "R32-4": "Francia",
    };
    const out = propagateWinners({ ...R32_ACTUAL_MATCHUPS }, winners);
    expect(out["R16-1"]).toEqual(["Canadá", "Marruecos"]);   // M90
    expect(out["R16-2"]).toEqual(["Paraguay", "Francia"]);   // M89
  });
});

describe("KO_KICKOFFS", () => {
  it("tiene kickoff para R16-1..R16-8, QF-1..QF-4, SF-1, SF-2 y F", () => {
    for (const id of ["R16-1","R16-2","R16-3","R16-4","R16-5","R16-6","R16-7","R16-8","QF-1","QF-2","QF-3","QF-4","SF-1","SF-2","F"]) {
      expect(typeof KO_KICKOFFS[id]).toBe("number");
    }
  });

  it("R16-1 (M90) es Sáb 4/7 14:00 ART = 17:00 UTC", () => {
    expect(KO_KICKOFFS["R16-1"]).toBe(Date.UTC(2026, 6, 4, 17, 0));
  });
});

describe("buildManualKoSchedule", () => {
  it("arma filas solo para slots con ambos equipos y kickoff conocido", () => {
    const matchups: Record<SlotId, [string, string]> = {
      "R16-1": ["Canadá", "Marruecos"],
    };
    const sched = buildManualKoSchedule(matchups, KO_KICKOFFS);
    expect(sched["R16-1"]).toMatchObject({
      fixtureId: "R16-1",
      round: "R16",
      teamA: "Canadá",
      teamB: "Marruecos",
      date: new Date(Date.UTC(2026, 6, 4, 17, 0)).toISOString(),
      statusCode: "NS",
      goalsA: null,
      goalsB: null,
    });
  });

  it("ignora slots sin kickoff en KO_KICKOFFS (ej. un R32)", () => {
    const matchups: Record<SlotId, [string, string]> = {
      "R32-1": ["Sudáfrica", "Canadá"],
    };
    const sched = buildManualKoSchedule(matchups, KO_KICKOFFS);
    expect(sched["R32-1"]).toBeUndefined();
  });
});
