import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { recalculatePoints } from "@/lib/recalculate-points";
import { syncStandings } from "@/lib/sync-standings";
import { recalculateGlobalStats } from "@/lib/recalculate-global-stats";
import matchesJson from "../../../../lib/matches.json";

const API_BASE = "https://v3.football.api-sports.io";
const LEAGUE = 1;
const SEASON = 2026;

const TEAM_MAP: Record<string, string> = {
  "Mexico": "México",
  "South Korea": "Corea del Sur",
  "Czech Republic": "República Checa",
  "Czechia": "República Checa",
  "Canada": "Canadá",
  "Bosnia and Herzegovina": "Bosnia y Herzegovina",
  "Switzerland": "Suiza",
  "Brazil": "Brasil",
  "Morocco": "Marruecos",
  "Haiti": "Haití",
  "Scotland": "Escocia",
  "United States": "Estados Unidos",
  "USA": "Estados Unidos",
  "Turkey": "Turquía",
  "Türkiye": "Turquía",
  "Germany": "Alemania",
  "Curacao": "Curazao",
  "Curaçao": "Curazao",
  "Ivory Coast": "Costa de Marfil",
  "Côte d'Ivoire": "Costa de Marfil",
  "Netherlands": "Países Bajos",
  "Japan": "Japón",
  "Sweden": "Suecia",
  "Tunisia": "Túnez",
  "Belgium": "Bélgica",
  "Egypt": "Egipto",
  "Iran": "Irán",
  "New Zealand": "Nueva Zelanda",
  "Spain": "España",
  "Cape Verde": "Cabo Verde",
  "Saudi Arabia": "Arabia Saudita",
  "France": "Francia",
  "Iraq": "Irak",
  "Norway": "Noruega",
  "Algeria": "Argelia",
  "Austria": "Austria",
  "Jordan": "Jordania",
  "DR Congo": "República Democrática del Congo",
  "Congo DR": "República Democrática del Congo",
  "Democratic Republic of Congo": "República Democrática del Congo",
  "Uzbekistan": "Uzbekistán",
  "England": "Inglaterra",
  "Croatia": "Croacia",
  "Panama": "Panamá",
  "South Africa": "Sudáfrica",
};

// Build lookup: "teamA|teamB" → matchId (supports both directions)
const matchLookup = new Map<string, string>();
for (const m of matchesJson as { id: string; teamA: string; teamB: string; date: string }[]) {
  matchLookup.set(`${m.teamA}|${m.teamB}`, m.id);
  matchLookup.set(`${m.teamB}|${m.teamA}`, m.id + "_reversed");
}

function resolveMatchId(homeApi: string, awayApi: string): { matchId: string; reversed: boolean } | null {
  const home = TEAM_MAP[homeApi] ?? homeApi;
  const away = TEAM_MAP[awayApi] ?? awayApi;
  const direct = matchLookup.get(`${home}|${away}`);
  if (direct && !direct.endsWith("_reversed")) return { matchId: direct, reversed: false };
  const rev = matchLookup.get(`${away}|${home}`);
  if (rev && !rev.endsWith("_reversed")) return { matchId: rev, reversed: true };
  return null;
}

// Returns true if any match is currently in its active window (kickoff -5 to +185 min)
function hasActiveWindow(): boolean {
  const now = Date.now();
  return (matchesJson as { date: string }[]).some((m) => {
    const ko = new Date(m.date).getTime();
    return now >= ko - 5 * 60_000 && now <= ko + 210 * 60_000;
  });
}

const FINISHED = new Set(["FT", "AET", "PEN"]);

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasActiveWindow()) {
    return NextResponse.json({ ok: true, skipped: "no_active_window" });
  }

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "DB Error" }, { status: 500 });

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return NextResponse.json({ error: "API_FOOTBALL_KEY not configured" }, { status: 500 });

  // Rate limit: max once every 30s across instances
  const rateLimitRef = db.collection("system_stats").doc("sync_rate_limit");
  try {
    const snap = await rateLimitRef.get();
    if (snap.exists) {
      const elapsed = Date.now() - new Date(snap.data()?.lastCalledAt ?? 0).getTime();
      if (elapsed < 30_000) {
        return NextResponse.json({ ok: true, skipped: "rate_limited" });
      }
    }
    await rateLimitRef.set({ lastCalledAt: new Date().toISOString() }, { merge: true });
  } catch {
    // non-fatal — proceed
  }

  const today = new Date().toISOString().split("T")[0];
  const res = await fetch(`${API_BASE}/fixtures?league=${LEAGUE}&season=${SEASON}&date=${today}`, {
    headers: { "x-apisports-key": apiKey },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: `API-Football error ${res.status}` }, { status: 500 });
  }

  const data = await res.json();
  const fixtures: any[] = data.response ?? [];

  const batch = db.batch();
  const resultsUpdates: Record<string, any> = {};
  let liveCount = 0;
  let finishedCount = 0;

  for (const item of fixtures) {
    const fixtureId = item.fixture.id.toString();
    const statusCode: string = item.fixture.status.short;
    const goalsHome: number = item.goals.home ?? 0;
    const goalsAway: number = item.goals.away ?? 0;

    // Always update the matches collection with live data for the UI
    const matchRef = db.collection("matches").doc(fixtureId);
    batch.set(matchRef, {
      api_fixture_id: fixtureId,
      date: item.fixture.date,
      statusLabel: item.fixture.status.long,
      statusCode,
      elapsed: item.fixture.status.elapsed,
      team_home: item.teams.home.name,
      team_away: item.teams.away.name,
      goals_home: goalsHome,
      goals_away: goalsAway,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    liveCount++;

    // Only write to results/actual when the match is definitively over
    if (!FINISHED.has(statusCode)) continue;

    const resolved = resolveMatchId(item.teams.home.name, item.teams.away.name);
    if (!resolved) continue;

    const { matchId, reversed } = resolved;
    const teamA = reversed ? goalsAway : goalsHome;
    const teamB = reversed ? goalsHome : goalsAway;
    const outcome = teamA > teamB ? "A" : teamB > teamA ? "B" : "DRAW";

    resultsUpdates[`matches.${matchId}`] = { teamA, teamB, outcome };
    finishedCount++;
  }

  await batch.commit();

  if (Object.keys(resultsUpdates).length > 0) {
    resultsUpdates.updatedAt = new Date().toISOString();
    const resultsRef = db.collection("results").doc("actual");
    try {
      await resultsRef.update(resultsUpdates);
    } catch (err: any) {
      if (err.code === 5) {
        await resultsRef.set({ groups: {}, specials: {}, matches: {}, updatedAt: new Date().toISOString() });
        await resultsRef.update(resultsUpdates);
      } else {
        throw err;
      }
    }

    // Recalculate points with the new match results first
    await recalculatePoints(db);

    // Then update standings (1 extra API call) + global stats in parallel
    // Use allSettled so a standings API failure doesn't block stats
    const apiKey = process.env.API_FOOTBALL_KEY!;
    await Promise.allSettled([
      syncStandings(db, apiKey),
      recalculateGlobalStats(db),
    ]);
  }

  return NextResponse.json({ ok: true, liveCount, finishedCount });
}
