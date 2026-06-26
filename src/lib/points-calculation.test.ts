import { describe, it, expect } from "vitest";
import { computePoints } from "./points-calculation";

describe("computePoints — knockouts", () => {
  const empty = {};

  it("suma los puntos de ronda por cada acierto del cuadro", () => {
    // R32 vale 2 puntos por acierto (ver ROUND_POINTS en bracket/tree).
    const actualKnockouts = { "R32-1": "México", "R32-13": "Sudáfrica" };
    const pred = { knockouts: { "R32-1": "México", "R32-13": "Brasil" } };

    const res = computePoints(empty, empty, empty, pred, actualKnockouts);

    expect(res.knockoutPoints).toBe(2); // acierta R32-1, falla R32-13
    expect(res.totalPoints).toBe(2);
  });

  it("knockoutPoints es 0 cuando no hay picks ni resultados", () => {
    const res = computePoints(empty, empty, empty, {});
    expect(res.knockoutPoints).toBe(0);
    expect(res.totalPoints).toBe(0);
  });

  it("no rompe si la predicción no trae knockouts", () => {
    const actualKnockouts = { "R32-1": "México" };
    const res = computePoints(empty, empty, empty, { groups: {} }, actualKnockouts);
    expect(res.knockoutPoints).toBe(0);
  });
});
