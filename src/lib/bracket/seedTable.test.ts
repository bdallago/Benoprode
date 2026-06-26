import { describe, it, expect } from "vitest";
import { R32_FIXED_SEEDS } from "./seedTable";
import { GROUPS } from "../../data";

describe("R32_FIXED_SEEDS", () => {
  it("tiene exactamente 16 entradas, una por slot R32", () => {
    const keys = Object.keys(R32_FIXED_SEEDS);
    expect(keys.length).toBe(16);
    for (let i = 1; i <= 16; i++) expect(keys).toContain(`R32-${i}`);
  });

  it("cada seed es 1° o 2° de un grupo válido (nunca 3°)", () => {
    const validGroups = Object.keys(GROUPS);
    for (const seed of Object.values(R32_FIXED_SEEDS)) {
      const pos = seed[0];
      const group = seed.slice(1);
      expect(["1", "2"]).toContain(pos);
      expect(validGroups).toContain(group);
    }
  });

  it("no hay seeds duplicados", () => {
    const seeds = Object.values(R32_FIXED_SEEDS);
    expect(new Set(seeds).size).toBe(seeds.length);
  });
});
