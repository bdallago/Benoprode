import { mapApiRound } from "./bracket/apiMapping";
import type { Round } from "./bracket/types";

// Ventana activa de un partido: desde 5 min antes del kickoff hasta 210 min después
// (cubre 90' + entretiempo + alargue + penales + margen).
const PRE_MS = 5 * 60_000;
const POST_MS = 210 * 60_000;

// ¿Hay algún kickoff cuya ventana activa contenga a `now`?
export function inActiveWindow(kickoffsMs: number[], now: number = Date.now()): boolean {
  return kickoffsMs.some((ko) => now >= ko - PRE_MS && now <= ko + POST_MS);
}

interface ApiFixtureLike {
  fixture?: { id?: number; date?: string; status?: { short?: string } };
  league?: { round?: string };
  teams?: { home?: { name?: string }; away?: { name?: string } };
  goals?: { home?: number | null; away?: number | null };
}

// Kickoffs (ISO) relevantes para gatear el cron: futuros + recientes (dentro de la
// ventana POST). Cubre grupos y KO por igual. Se cachean en Firestore para que el
// gate sepa cuándo arranca el próximo partido sin depender de matches.json estático.
export function extractUpcomingKickoffs(
  apiFixtures: ApiFixtureLike[],
  now: number = Date.now()
): string[] {
  const out: string[] = [];
  for (const fx of apiFixtures) {
    const iso = fx.fixture?.date;
    if (!iso) continue;
    const ko = new Date(iso).getTime();
    if (Number.isNaN(ko)) continue;
    // Mantener futuros y los que todavía caen dentro de su ventana POST.
    if (ko + POST_MS >= now) out.push(iso);
  }
  return out;
}

export interface KoScheduleRow {
  fixtureId: string;
  round: Round;
  teamA: string;
  teamB: string;
  date: string; // ISO kickoff
  statusCode: string; // NS, 1H, HT, FT, AET, PEN, ...
  goalsA: number | null;
  goalsB: number | null;
}

// Filas de partidos de eliminatoria (rondas principales) para la lista por día/hora.
// Nombres mapeados a ES. Ordenadas por kickoff ascendente.
export function extractKoSchedule(
  apiFixtures: ApiFixtureLike[],
  nameMap: Record<string, string>
): KoScheduleRow[] {
  const rows: KoScheduleRow[] = [];
  for (const fx of apiFixtures) {
    const round = mapApiRound(fx.league?.round ?? "");
    if (!round) continue;
    const iso = fx.fixture?.date;
    if (!iso) continue;
    const rawA = fx.teams?.home?.name ?? "";
    const rawB = fx.teams?.away?.name ?? "";
    rows.push({
      fixtureId: String(fx.fixture?.id ?? ""),
      round,
      teamA: nameMap[rawA] ?? rawA,
      teamB: nameMap[rawB] ?? rawB,
      date: iso,
      statusCode: fx.fixture?.status?.short ?? "NS",
      goalsA: fx.goals?.home ?? null,
      goalsB: fx.goals?.away ?? null,
    });
  }
  rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return rows;
}
