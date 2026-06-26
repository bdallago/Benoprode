import { describe, it, expect, vi } from "vitest";
import { scoreBracket } from "./score";

describe("scoreBracket", () => {
  it("suma los puntos de la ronda por cada slot acertado", () => {
    const pred = { "R32-1": "Argentina", "R16-1": "Argentina" };
    const actual = { "R32-1": "Argentina", "R16-1": "Brasil" };
    // R32-1 acertado (+2), R16-1 errado (+0)
    expect(scoreBracket(pred, actual)).toBe(2);
  });

  it("cada ronda puntúa independiente (errar R32 no anula R16)", () => {
    const pred = { "R32-1": "Jordania", "R16-1": "Argentina" };
    const actual = { "R32-1": "Argentina", "R16-1": "Argentina" };
    // R32-1 errado (+0), R16-1 acertado (+4)
    expect(scoreBracket(pred, actual)).toBe(4);
  });

  it("campeón (slot F) vale 15", () => {
    expect(scoreBracket({ F: "Argentina" }, { F: "Argentina" })).toBe(15);
  });

  it("ignora slots sin resultado o sin pick", () => {
    expect(scoreBracket({ "R32-1": "Argentina" }, {})).toBe(0);
    expect(scoreBracket({}, { "R32-1": "Argentina" })).toBe(0);
  });

  it("loguea un warning por cada slot desconocido en los resultados", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    scoreBracket({ "R32-1": "Argentina" }, { "R32-1": "Argentina", "BOGUS-99": "x" });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0].join(" ")).toContain("BOGUS-99");
    warnSpy.mockRestore();
  });

  it("ignora slot ids desconocidos en los resultados sin tirar excepción", () => {
    const pred = { "R32-1": "Argentina", "BOGUS-99": "Argentina" };
    const actual = { "R32-1": "Argentina", "BOGUS-99": "Argentina" };
    // R32-1 acertado (+2); el slot inválido se ignora, no rompe.
    expect(() => scoreBracket(pred, actual)).not.toThrow();
    expect(scoreBracket(pred, actual)).toBe(2);
  });
});
