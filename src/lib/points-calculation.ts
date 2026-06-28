import { GROUPS } from "../data";
import { scoreBracket } from "./bracket/score";

export interface PointsResult {
  totalPoints: number;
  exactMatchCount: number;
  correctMatchCount: number;
  groupsPerfectCount: number;
  zeroZeroPredictionsCount: number;
  mufaGroupCount: number;
  argentinaPerfectGroup: boolean;
  knockoutPoints: number;
}

export function sanitizeGroups(
  raw: Record<string, any>,
  validGroups: Record<string, string[]> = GROUPS
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [letter, validTeams] of Object.entries(validGroups)) {
    const saved = (raw[letter] || []) as string[];
    // Filtrar a equipos válidos y deduplicar: la API a veces repite filas por
    // equipo, lo que correría las posiciones y rompería el scoring por posición.
    const valid: string[] = [];
    for (const t of saved) {
      if (validTeams.includes(t) && !valid.includes(t)) valid.push(t);
    }
    const missing = validTeams.filter(t => !valid.includes(t));
    result[letter] = [...valid, ...missing];
  }
  return result;
}

// Scoring rules (canonical):
//   Groups:   +1 per correct position, +3 bonus if all 4 exact
//   Specials: +10 per exact answer (case-insensitive, trimmed)
//   Matches:  +1 correct outcome, +1 exact score (max 2 per match)
export function computePoints(
  actualGroups: Record<string, string[]>,
  actualSpecials: Record<string, string>,
  actualMatches: Record<string, any>,
  pred: { groups?: any; specials?: any; matches?: any; knockouts?: any },
  actualKnockouts: Record<string, string> = {}
): PointsResult {
  let totalPoints = 0;
  let exactMatchCount = 0;
  let correctMatchCount = 0;
  let groupsPerfectCount = 0;
  let zeroZeroPredictionsCount = 0;
  let mufaGroupCount = 0;
  let argentinaPerfectGroup = false;

  const predGroups = sanitizeGroups(pred.groups ?? {});
  const predSpecials = pred.specials ?? {};
  const predMatches = pred.matches ?? {};

  for (const [letter, actualTeams] of Object.entries(actualGroups)) {
    const predictedTeams = predGroups[letter] ?? [];
    let exact = 0;
    for (let i = 0; i < 4; i++) {
      if (actualTeams[i] && predictedTeams[i] === actualTeams[i]) {
        totalPoints += 1;
        exact++;
      }
    }
    if (exact === 4) {
      totalPoints += 3;
      groupsPerfectCount++;
      if (letter === "J") argentinaPerfectGroup = true;
    }
    // mufa: group is fully resolved (all 4 positions filled) and user got 0 correct
    const groupResolved = actualTeams.every(t => t && t !== "");
    if (groupResolved && exact === 0) mufaGroupCount++;
  }

  for (const [qId, actualAnswer] of Object.entries(actualSpecials)) {
    const predicted = predSpecials[qId];
    if (
      predicted && actualAnswer &&
      typeof predicted === "string" && typeof actualAnswer === "string" &&
      predicted.trim().toLowerCase() === actualAnswer.trim().toLowerCase()
    ) {
      totalPoints += 10;
    }
  }

  const normScore = (v: any): number =>
    v === "" || v === null || v === undefined ? 0 : Number(v);

  for (const [matchId, actualMatch] of Object.entries(actualMatches)) {
    const pm = predMatches[matchId];
    if (!pm || !actualMatch) continue;

    const predA = normScore(pm.teamA);
    const predB = normScore(pm.teamB);

    // Re-derive outcome from normalized scores when the stored outcome is missing
    // (happens when a user filled only one score and the auto-derive didn't run)
    let effectiveOutcome = pm.outcome;
    if (!effectiveOutcome) {
      if (predA > predB) effectiveOutcome = "A";
      else if (predA < predB) effectiveOutcome = "B";
      else effectiveOutcome = "DRAW";
    }

    // Derive actual outcome from scores when the field is missing (manual results entry)
    let actualOutcome = actualMatch.outcome;
    const hasActualScores = actualMatch.teamA !== "" && actualMatch.teamA !== null && actualMatch.teamA !== undefined &&
      actualMatch.teamB !== "" && actualMatch.teamB !== null && actualMatch.teamB !== undefined;
    if (!actualOutcome && hasActualScores) {
      const a = normScore(actualMatch.teamA);
      const b = normScore(actualMatch.teamB);
      actualOutcome = a > b ? "A" : a < b ? "B" : "DRAW";
    }

    if (effectiveOutcome && actualOutcome && effectiveOutcome === actualOutcome) {
      totalPoints += 1;
      correctMatchCount++;
    }
    const actualA = normScore(actualMatch.teamA);
    const actualB = normScore(actualMatch.teamB);
    if (hasActualScores && predA === actualA && predB === actualB) {
      totalPoints += 1;
      exactMatchCount++;
      if (predA === 0 && predB === 0) zeroZeroPredictionsCount++;
    }
  }

  // Knockouts (fase eliminatoria): cada acierto de equipo que avanza suma los
  // puntos de su ronda. Independiente del resto del scoring.
  const knockoutPoints = scoreBracket(pred.knockouts ?? {}, actualKnockouts);
  totalPoints += knockoutPoints;

  return { totalPoints, exactMatchCount, correctMatchCount, groupsPerfectCount, zeroZeroPredictionsCount, mufaGroupCount, argentinaPerfectGroup, knockoutPoints };
}
