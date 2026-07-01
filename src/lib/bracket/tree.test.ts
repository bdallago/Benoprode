import { describe, it, expect } from "vitest";
import { BRACKET_TREE, getSlot, pointsForSlot } from "./tree";

describe("BRACKET_TREE", () => {
  it("tiene 31 slots: 16 R32, 8 R16, 4 QF, 2 SF, 1 F", () => {
    const byRound = (r: string) => BRACKET_TREE.filter(s => s.round === r).length;
    expect(byRound("R32")).toBe(16);
    expect(byRound("R16")).toBe(8);
    expect(byRound("QF")).toBe(4);
    expect(byRound("SF")).toBe(2);
    expect(byRound("F")).toBe(1);
    expect(BRACKET_TREE.length).toBe(31);
  });

  it("cada slot no-R32 tiene exactamente 2 sources que existen", () => {
    const ids = new Set(BRACKET_TREE.map(s => s.id));
    for (const slot of BRACKET_TREE) {
      if (slot.round === "R32") {
        expect(slot.sources.length).toBe(0);
      } else {
        expect(slot.sources.length).toBe(2);
        for (const src of slot.sources) expect(ids.has(src)).toBe(true);
      }
    }
  });

  it("R16-1 se alimenta de los cruces reales R32-13 y R32-4 (cuadro FIFA)", () => {
    expect(getSlot("R16-1").sources).toEqual(["R32-13", "R32-4"]);
  });

  it("pointsForSlot devuelve el puntaje por ronda", () => {
    expect(pointsForSlot("R32-1")).toBe(2);
    expect(pointsForSlot("R16-1")).toBe(4);
    expect(pointsForSlot("QF-1")).toBe(6);
    expect(pointsForSlot("SF-1")).toBe(8);
    expect(pointsForSlot("F")).toBe(15);
  });
});
