import { describe, it, expect } from "vitest";
import { placeKnockoutFixtures } from "./placeFixtures";
import type { Standings, KnockoutFixture } from "./types";

// Standings mínimos: para los grupos que tocan en el test.
const standings: Standings = {
  A: ["Equipo1A", "Equipo2A", "Tercero", "Cuarto"],
  C: ["Equipo1C", "Equipo2C", "x", "y"],
};

describe("placeKnockoutFixtures", () => {
  it("ubica un cruce en el slot cuyo fixedSeed (1A) coincide con un equipo", () => {
    const fixtures: KnockoutFixture[] = [
      { round: "R32", teamA: "TerceroXYZ", teamB: "Equipo1A" },
    ];
    const { placements, warnings } = placeKnockoutFixtures(fixtures, standings);
    expect(placements["R32-1"]).toEqual(["TerceroXYZ", "Equipo1A"]);
    expect(warnings).toHaveLength(0);
  });

  it("registra warning si ningún equipo del cruce matchea un fixedSeed conocido", () => {
    const fixtures: KnockoutFixture[] = [
      { round: "R32", teamA: "Desconocido1", teamB: "Desconocido2" },
    ];
    const { placements, warnings } = placeKnockoutFixtures(fixtures, standings);
    expect(Object.keys(placements)).toHaveLength(0);
    expect(warnings[0]).toMatch(/no se pudo ubicar/i);
  });

  it("ignora fixtures de rondas que no son R32 (esos no se siembran por seed)", () => {
    const fixtures: KnockoutFixture[] = [
      { round: "R16", teamA: "Equipo1A", teamB: "Equipo1C" },
    ];
    const { placements } = placeKnockoutFixtures(fixtures, standings);
    expect(Object.keys(placements)).toHaveLength(0);
  });
});
