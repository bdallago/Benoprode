import { describe, it, expect } from "vitest";
import { mapApiRound, toKnockoutFixtures } from "./apiMapping";

const NAME_MAP: Record<string, string> = { "Argentina": "Argentina", "Jordan": "Jordania" };

describe("mapApiRound", () => {
  it("mapea los labels de la API a nuestras rondas", () => {
    expect(mapApiRound("Round of 32")).toBe("R32");
    expect(mapApiRound("Round of 16")).toBe("R16");
    expect(mapApiRound("Quarter-finals")).toBe("QF");
    expect(mapApiRound("Semi-finals")).toBe("SF");
    expect(mapApiRound("Final")).toBe("F");
  });
  it("devuelve null para rondas de fase de grupos u otras", () => {
    expect(mapApiRound("Group A - 1")).toBeNull();
    expect(mapApiRound("3rd Place Final")).toBeNull();
  });
});

describe("toKnockoutFixtures", () => {
  it("convierte fixtures KO de la API a KnockoutFixture[], mapeando nombres", () => {
    const apiFixtures = [
      { league: { round: "Round of 32" }, teams: { home: { name: "Argentina" }, away: { name: "Jordan" } } },
      { league: { round: "Group A - 1" }, teams: { home: { name: "Argentina" }, away: { name: "Jordan" } } },
    ];
    const { fixtures, unmapped } = toKnockoutFixtures(apiFixtures, NAME_MAP);
    expect(fixtures).toEqual([{ round: "R32", teamA: "Argentina", teamB: "Jordania" }]);
    expect(unmapped).toHaveLength(0);
  });
  it("registra nombres no mapeados pero NO descarta el cruce (usa el nombre crudo)", () => {
    const apiFixtures = [
      { league: { round: "Final" }, teams: { home: { name: "Argentina" }, away: { name: "Xland" } } },
    ];
    const { fixtures, unmapped } = toKnockoutFixtures(apiFixtures, NAME_MAP);
    expect(fixtures[0]).toEqual({ round: "F", teamA: "Argentina", teamB: "Xland" });
    expect(unmapped).toContain("Xland");
  });
});
