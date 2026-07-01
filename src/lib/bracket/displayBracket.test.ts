import { describe, it, expect } from "vitest";
import { buildDisplayBracket } from "./displayBracket";
import type { SlotId } from "./types";

const seedR32: Record<SlotId, [string, string]> = {
  "R32-1": ["Argentina", "Jordania"],
  // R16-1 se alimenta de R32-13 y R32-4 (cuadro real FIFA 2026).
  "R32-13": ["Sudáfrica", "Canadá"],
  "R32-4": ["Países Bajos", "Marruecos"],
};

describe("buildDisplayBracket", () => {
  it("R32 muestra el sembrado real y marca el pick válido del usuario", () => {
    const view = buildDisplayBracket(seedR32, { "R32-1": "Argentina" }, {});
    const s = view["R32-1"];
    expect(s.teamA).toBe("Argentina");
    expect(s.teamB).toBe("Jordania");
    expect(s.pick).toBe("Argentina");
    expect(s.resolved).toBe(false);
    expect(s.status).toBeNull();
  });

  it("colorea verde cuando el pick coincide con el ganador real", () => {
    const view = buildDisplayBracket(seedR32, { "R32-1": "Argentina" }, { "R32-1": "Argentina" });
    expect(view["R32-1"].resolved).toBe(true);
    expect(view["R32-1"].status).toBe("correct");
  });

  it("colorea rojo cuando el pick no coincide con el ganador real", () => {
    const view = buildDisplayBracket(seedR32, { "R32-1": "Argentina" }, { "R32-1": "Jordania" });
    expect(view["R32-1"].status).toBe("wrong");
  });

  it("NO proyecta los picks del usuario: R16 queda en TBD hasta que se resuelva R32", () => {
    const view = buildDisplayBracket(seedR32, { "R32-13": "Canadá", "R32-4": "Marruecos" }, {});
    expect(view["R16-1"].teamA).toBeNull();
    expect(view["R16-1"].teamB).toBeNull();
  });

  it("habilita R16 solo cuando AMBOS cruces previos de R32 tienen ganador real", () => {
    const partial = buildDisplayBracket(seedR32, {}, { "R32-13": "Canadá" });
    expect(partial["R16-1"].teamA).toBe("Canadá");
    expect(partial["R16-1"].teamB).toBeNull();

    const full = buildDisplayBracket(seedR32, {}, { "R32-13": "Canadá", "R32-4": "Marruecos" });
    expect(full["R16-1"].teamA).toBe("Canadá");
    expect(full["R16-1"].teamB).toBe("Marruecos");
  });

  it("reemplaza la proyección por el ganador real al resolverse la ronda previa", () => {
    const view = buildDisplayBracket(
      seedR32,
      { "R32-13": "Canadá", "R32-4": "Marruecos", "R16-1": "Canadá" },
      { "R32-13": "Sudáfrica", "R32-4": "Marruecos" }
    );
    expect(view["R16-1"].teamA).toBe("Sudáfrica");
    expect(view["R16-1"].teamB).toBe("Marruecos");
    expect(view["R16-1"].pick).toBeNull();
  });

  it("usa null cuando un equipo aún no está definido", () => {
    const view = buildDisplayBracket({}, {}, {});
    expect(view["R32-1"].teamA).toBeNull();
    expect(view["F"].teamA).toBeNull();
  });
});
