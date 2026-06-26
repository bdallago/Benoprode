import { describe, it, expect } from "vitest";
import { isSlotLocked } from "./lock";

const HOUR = 60 * 60 * 1000;

describe("isSlotLocked", () => {
  it("no está bloqueado si falta más de 1h para el kickoff", () => {
    const now = 1000_000_000_000;
    expect(isSlotLocked(now + 2 * HOUR, now)).toBe(false);
  });
  it("se bloquea exactamente 1h antes del kickoff", () => {
    const now = 1000_000_000_000;
    expect(isSlotLocked(now + HOUR, now)).toBe(true);
    expect(isSlotLocked(now + HOUR - 1, now)).toBe(true);
  });
  it("no está bloqueado si el kickoff es desconocido (undefined)", () => {
    const now = 1000_000_000_000;
    expect(isSlotLocked(undefined, now)).toBe(false);
  });
});
