import { describe, it, expect } from "vitest";
import { propagateWinners } from "./propagate";
import type { SlotId } from "./types";

describe("propagateWinners", () => {
  it("arma el cruce de la ronda siguiente con los ganadores de sus dos sources", () => {
    const matchups: Record<SlotId, [string, string]> = {
      "R32-13": ["Sudáfrica", "Canadá"],
      "R32-4": ["Países Bajos", "Marruecos"],
    };
    const winners: Record<SlotId, string> = { "R32-13": "Canadá", "R32-4": "Marruecos" };
    const next = propagateWinners(matchups, winners);
    // R16-1 se alimenta de R32-13 y R32-4 (cuadro real)
    expect(next["R16-1"]).toEqual(["Canadá", "Marruecos"]);
  });
  it("no arma un cruce si falta alguno de los dos ganadores de origen", () => {
    const matchups: Record<SlotId, [string, string]> = { "R32-13": ["Sudáfrica", "Canadá"] };
    const winners: Record<SlotId, string> = { "R32-13": "Canadá" };
    const next = propagateWinners(matchups, winners);
    expect(next["R16-1"]).toBeUndefined();
  });
});
