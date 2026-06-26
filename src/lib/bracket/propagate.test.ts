import { describe, it, expect } from "vitest";
import { propagateWinners } from "./propagate";
import type { SlotId } from "./types";

describe("propagateWinners", () => {
  it("arma el cruce de la ronda siguiente con los ganadores de sus dos sources", () => {
    const matchups: Record<SlotId, [string, string]> = {
      "R32-1": ["Argentina", "Jordania"],
      "R32-2": ["Brasil", "Marruecos"],
    };
    const winners: Record<SlotId, string> = { "R32-1": "Argentina", "R32-2": "Brasil" };
    const next = propagateWinners(matchups, winners);
    // R16-1 se alimenta de R32-1 y R32-2
    expect(next["R16-1"]).toEqual(["Argentina", "Brasil"]);
  });
  it("no arma un cruce si falta alguno de los dos ganadores de origen", () => {
    const matchups: Record<SlotId, [string, string]> = { "R32-1": ["Argentina", "Jordania"] };
    const winners: Record<SlotId, string> = { "R32-1": "Argentina" };
    const next = propagateWinners(matchups, winners);
    expect(next["R16-1"]).toBeUndefined();
  });
});
