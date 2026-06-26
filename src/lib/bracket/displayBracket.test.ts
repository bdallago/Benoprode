import { describe, it, expect } from "vitest";
import { buildDisplayBracket } from "./displayBracket";
import type { SlotId } from "./types";

const seedR32: Record<SlotId, [string, string]> = {
  "R32-1": ["Argentina", "Jordania"],
  "R32-2": ["Brasil", "Marruecos"],
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

  it("proyecta a R16 el pick del usuario mientras la ronda previa no esté resuelta", () => {
    const view = buildDisplayBracket(seedR32, { "R32-1": "Argentina", "R32-2": "Brasil" }, {});
    expect(view["R16-1"].teamA).toBe("Argentina");
    expect(view["R16-1"].teamB).toBe("Brasil");
  });

  it("reemplaza la proyección por el ganador real al resolverse la ronda previa", () => {
    const view = buildDisplayBracket(
      seedR32,
      { "R32-1": "Argentina", "R32-2": "Brasil", "R16-1": "Argentina" },
      { "R32-1": "Jordania", "R32-2": "Brasil" }
    );
    expect(view["R16-1"].teamA).toBe("Jordania");
    expect(view["R16-1"].teamB).toBe("Brasil");
    expect(view["R16-1"].pick).toBeNull();
  });

  it("usa null cuando un equipo aún no está definido", () => {
    const view = buildDisplayBracket({}, {}, {});
    expect(view["R32-1"].teamA).toBeNull();
    expect(view["F"].teamA).toBeNull();
  });
});
