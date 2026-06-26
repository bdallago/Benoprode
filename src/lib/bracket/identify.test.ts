import { describe, it, expect } from "vitest";
import { identifySlotByTeams } from "./identify";
import type { SlotId } from "./types";

const matchups: Record<SlotId, [string, string]> = {
  "R32-1": ["Argentina", "Jordania"],
  "R32-2": ["Brasil", "Marruecos"],
};

describe("identifySlotByTeams", () => {
  it("encuentra el slot cuyos dos equipos coinciden (en cualquier orden)", () => {
    expect(identifySlotByTeams(matchups, "Jordania", "Argentina")).toBe("R32-1");
    expect(identifySlotByTeams(matchups, "Brasil", "Marruecos")).toBe("R32-2");
  });
  it("devuelve null si no hay un slot con exactamente esos dos equipos", () => {
    expect(identifySlotByTeams(matchups, "Argentina", "Brasil")).toBeNull();
    expect(identifySlotByTeams(matchups, "Argentina", "Equipo X")).toBeNull();
  });
});
