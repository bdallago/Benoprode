import { describe, it, expect } from "vitest";
import { inActiveWindow, extractUpcomingKickoffs, extractKoSchedule } from "./ko-schedule";

const NAME_MAP: Record<string, string> = { Spain: "España", Austria: "Austria" };
const T = (iso: string) => new Date(iso).getTime();

describe("inActiveWindow", () => {
  const ko = T("2026-07-01T19:00:00.000Z");
  it("activa 5 min antes del kickoff", () => {
    expect(inActiveWindow([ko], ko - 4 * 60_000)).toBe(true);
    expect(inActiveWindow([ko], ko - 6 * 60_000)).toBe(false);
  });
  it("activa hasta 210 min después", () => {
    expect(inActiveWindow([ko], ko + 200 * 60_000)).toBe(true);
    expect(inActiveWindow([ko], ko + 211 * 60_000)).toBe(false);
  });
  it("false con lista vacía", () => {
    expect(inActiveWindow([], ko)).toBe(false);
  });
});

describe("extractUpcomingKickoffs", () => {
  const now = T("2026-07-01T12:00:00.000Z");
  const fixtures = [
    { fixture: { date: "2026-07-01T19:00:00.000Z" } }, // futuro
    { fixture: { date: "2026-07-01T10:00:00.000Z" } }, // hace 2h → dentro de POST
    { fixture: { date: "2026-06-30T10:00:00.000Z" } }, // ayer → fuera de POST
    { fixture: {} }, // sin fecha → ignorado
  ];
  it("mantiene futuros y recientes, descarta viejos y sin fecha", () => {
    const out = extractUpcomingKickoffs(fixtures, now);
    expect(out).toContain("2026-07-01T19:00:00.000Z");
    expect(out).toContain("2026-07-01T10:00:00.000Z");
    expect(out).not.toContain("2026-06-30T10:00:00.000Z");
    expect(out).toHaveLength(2);
  });
});

describe("extractKoSchedule", () => {
  const fixtures = [
    { fixture: { id: 2, date: "2026-07-05T19:00:00.000Z", status: { short: "NS" } },
      league: { round: "Round of 16" }, teams: { home: { name: "Spain" }, away: { name: "Austria" } },
      goals: { home: null, away: null } },
    { fixture: { id: 1, date: "2026-07-04T19:00:00.000Z", status: { short: "FT" } },
      league: { round: "Round of 32" }, teams: { home: { name: "Spain" }, away: { name: "Austria" } },
      goals: { home: 2, away: 1 } },
    { fixture: { id: 9, date: "2026-06-20T19:00:00.000Z" },
      league: { round: "Group Stage" }, teams: { home: { name: "Spain" }, away: { name: "Austria" } } },
  ];
  it("solo rondas KO, mapea nombres y ordena por kickoff", () => {
    const rows = extractKoSchedule(fixtures, NAME_MAP);
    expect(rows).toHaveLength(2); // descarta Group Stage
    expect(rows[0].round).toBe("R32"); // 04/07 antes que 05/07
    expect(rows[0].teamA).toBe("España");
    expect(rows[0].statusCode).toBe("FT");
    expect(rows[0].goalsA).toBe(2);
    expect(rows[1].round).toBe("R16");
  });
});
