import { describe, it, expect } from "vitest";
import { winnerOf } from "./winner";

describe("winnerOf", () => {
  it("usa el flag teams.*.winner cuando está presente (cubre AET/PEN)", () => {
    const fx = { teams: { home: { name: "ARG", winner: true }, away: { name: "JOR", winner: false } }, goals: { home: 1, away: 1 } };
    expect(winnerOf(fx)).toBe("ARG");
  });
  it("cae a goles cuando no hay flag de ganador", () => {
    const fx = { teams: { home: { name: "ARG" }, away: { name: "JOR" } }, goals: { home: 2, away: 0 } };
    expect(winnerOf(fx)).toBe("ARG");
  });
  it("devuelve null si empató sin flag (no debería pasar en KO, pero no inventamos)", () => {
    const fx = { teams: { home: { name: "ARG" }, away: { name: "JOR" } }, goals: { home: 1, away: 1 } };
    expect(winnerOf(fx)).toBeNull();
  });
  it("devuelve null si faltan goles y flags", () => {
    const fx = { teams: { home: { name: "ARG" }, away: { name: "JOR" } }, goals: { home: null, away: null } };
    expect(winnerOf(fx)).toBeNull();
  });
});
