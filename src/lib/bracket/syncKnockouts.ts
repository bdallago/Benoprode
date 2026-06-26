import { placeKnockoutFixtures } from "./placeFixtures";
import { toKnockoutFixtures } from "./apiMapping";
import { winnerOf } from "./winner";
import { identifySlotByTeams } from "./identify";
import { propagateWinners } from "./propagate";
import { TEAM_NAME_MAP } from "./teamNames";
import { recalculatePoints } from "../recalculate-points";
import type { SlotId, Standings } from "./types";

const API_BASE = "https://v3.football.api-sports.io";
const LEAGUE = "1";
const SEASON = "2026";

const LIVE_OR_DONE = new Set(["FT", "AET", "PEN"]);

// Siembra el cuadro de eliminatorias a partir de los standings ya sincronizados
// y los fixtures KO que publica la API, identificando cada slot por identidad de
// equipos. Escribe results/actual y recalcula puntos. Pensado para correr en el
// mismo cron que syncStandings.
export async function syncKnockouts(
  database: any,
  apiKey: string
): Promise<{ seededSlots: number; resultsApplied: number }> {
  // 1. Leer resultados actuales (funciona con grupos parcialmente cerrados).
  const resultsSnap = await database.collection("results").doc("actual").get();
  const data = resultsSnap.exists ? resultsSnap.data() : {};

  // 2. Standings ya sincronizados (results/actual.groups: {grupo: [equipos ordenados]}).
  const standings: Standings = data.groups || {};

  // 3. Traer fixtures y filtrar KO.
  const res = await fetch(`${API_BASE}/fixtures?league=${LEAGUE}&season=${SEASON}`, {
    headers: { "x-apisports-key": apiKey },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API-Football responded ${res.status}`);
  const json = await res.json();
  const apiFixtures: any[] = json.response ?? [];

  const { fixtures: koFixtures } = toKnockoutFixtures(apiFixtures, TEAM_NAME_MAP);

  // 4. Sembrar R32 por lado fijo.
  const seed = placeKnockoutFixtures(koFixtures, standings);
  let matchups: Record<SlotId, [string, string]> = { ...seed.placements };

  // 5. Recolectar ganadores de fixtures KO finalizados, identificando el slot
  //    por identidad de equipos contra los matchups conocidos (en cascada).
  const winners: Record<SlotId, string> = { ...(data.knockouts || {}) };
  const kickoffs: Record<SlotId, number> = { ...(data.bracketKickoffs || {}) };

  for (let pass = 0; pass < 5; pass++) {
    matchups = propagateWinners(matchups, winners);
    for (const fx of apiFixtures) {
      const status = fx.fixture?.status?.short as string;
      const homeRaw = fx.teams?.home?.name ?? "";
      const awayRaw = fx.teams?.away?.name ?? "";
      const home = TEAM_NAME_MAP[homeRaw] ?? homeRaw;
      const away = TEAM_NAME_MAP[awayRaw] ?? awayRaw;
      const slotId = identifySlotByTeams(matchups, home, away);
      if (!slotId) continue;
      const ts = fx.fixture?.timestamp;
      if (typeof ts === "number") kickoffs[slotId] = ts * 1000;
      if (!LIVE_OR_DONE.has(status)) continue;
      const w = winnerOf({
        teams: {
          home: { name: home, winner: fx.teams?.home?.winner },
          away: { name: away, winner: fx.teams?.away?.winner },
        },
        goals: fx.goals,
      });
      if (w) winners[slotId] = w;
    }
  }
  matchups = propagateWinners(matchups, winners);

  // 6. Escribir resultados + meta.
  await database.collection("results").doc("actual").set(
    {
      knockouts: winners,
      bracketMatchups: matchups,
      bracketKickoffs: kickoffs,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  await database.collection("results").doc("knockoutSync").set({
    ranAt: new Date().toISOString(),
    seededSlots: Object.keys(seed.placements).length,
    resultsApplied: Object.keys(winners).length,
    seedWarnings: seed.warnings,
  });

  // 7. Recalcular puntos (incluye el scoring de knockouts integrado en computePoints).
  await recalculatePoints(database);

  return {
    seededSlots: Object.keys(seed.placements).length,
    resultsApplied: Object.keys(winners).length,
  };
}
