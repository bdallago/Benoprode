import { computePoints, sanitizeGroups } from "./points-calculation";
import { getUserBadges } from "./gamification";
import matchesData from "./matches.json";

// Group match IDs by ART date (UTC-3)
const matchIdsByARTDate: Record<string, string[]> = {};
for (const m of matchesData as { id: string; date: string }[]) {
  const artDate = new Date(new Date(m.date).getTime() - 3 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  if (!matchIdsByARTDate[artDate]) matchIdsByARTDate[artDate] = [];
  matchIdsByARTDate[artDate].push(m.id);
}

function assignUserBadges(
  docData: any,
  totalPoints: number,
  currentEarnedIds: string[] = [],
  context: any = {}
): string[] {
  return getUserBadges(totalPoints, docData, currentEarnedIds, context);
}

export async function recalculatePoints(database: any): Promise<void> {
  const resultsDoc = await database.collection("results").doc("actual").get();
  if (!resultsDoc.exists) return;

  const actualData = resultsDoc.data();
  const isGroupStageFinished: boolean = actualData.isGroupStageFinished || false;
  const finishedGroups: string[] = actualData.finishedGroups || [];

  // Only score groups explicitly marked as finished (all 12 matches played).
  // Prevents awarding points from partial or pre-tournament default standings.
  const rawGroups: Record<string, string[]> = actualData.groups ?? {};
  const sanitizedActualG: Record<string, string[]> = {};
  for (const letter of finishedGroups) {
    if (rawGroups[letter]) sanitizedActualG[letter] = rawGroups[letter];
  }

  const actualSpecials: Record<string, string> = actualData.specials || {};
  const actualMatches: Record<string, any> = actualData.matches || {};
  const actualKnockouts: Record<string, string> = actualData.knockouts || {};

  // zona_copas/en_cima only unlock after the first matchday is fully played (match_24: Uzbekistán vs Colombia)
  const m24 = actualMatches["match_24"];
  const rankingBadgesEnabled =
    m24 && m24.teamA !== "" && m24.teamA !== null && m24.teamA !== undefined &&
    m24.teamB !== "" && m24.teamB !== null && m24.teamB !== undefined;

  const leaguesSnap = await database.collection("leagues").get();
  const leagues = leaguesSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

  const userResults: any[] = [];

  let lastDoc: any = null;
  let hasMore = true;
  let chunkCount = 0;
  while (hasMore && chunkCount < 500) {
    chunkCount++;
    let q = database.collection("users").orderBy("__name__").limit(29);
    if (lastDoc) q = q.startAfter(lastDoc);
    const chunk = await q.get();
    if (chunk.empty) { hasMore = false; break; }
    lastDoc = chunk.docs[chunk.docs.length - 1];

    const uids: string[] = chunk.docs.map((d: any) => d.id);
    const pSnap = await database.collection("predictions").where("__name__", "in", uids).get();
    const predMap = new Map<string, any>(pSnap.docs.map((d: any) => [d.id, d.data()]));

    for (const userDoc of chunk.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      const userLeagues = leagues.filter((l: any) => l.members?.includes(userId) || l.createdBy === userId);
      userData.inBenoliga = userLeagues.some((l: any) => l.name?.toLowerCase().includes("beno") || l.id === "benoliga");
      userData.inPrivateLeague = userLeagues.length > 0;
      userData.inLargePrivateLeague = userLeagues.some((l: any) =>
        l.id !== "benoliga" && !l.name?.toLowerCase().includes("beno") && (l.members?.length || 0) >= 10
      );

      const pred = predMap.get(userId) ?? {};
      const scored = computePoints(sanitizedActualG, actualSpecials, actualMatches, pred, actualKnockouts);

      // Compute perfectDaysCount: days where ALL matches with results were predicted exactly
      const predMatches = pred.matches ?? {};
      let perfectDaysCount = 0;
      for (const [artDate, matchIds] of Object.entries(matchIdsByARTDate)) {
        const resolvedIds = matchIds.filter((id) => {
          const am = actualMatches[id];
          return am && am.teamA !== "" && am.teamA !== null && am.teamA !== undefined &&
                 am.teamB !== "" && am.teamB !== null && am.teamB !== undefined;
        });
        if (resolvedIds.length === 0) continue;
        const allExact = resolvedIds.every((id) => {
          const am = actualMatches[id];
          const pm = predMatches[id];
          if (!pm) return false;
          const normScore = (v: any): number => (v === "" || v === null || v === undefined ? 0 : Number(v));
          return normScore(pm.teamA) === normScore(am.teamA) && normScore(pm.teamB) === normScore(am.teamB);
        });
        if (allExact) perfectDaysCount++;
      }

      userResults.push({
        userId,
        totalPoints: scored.totalPoints,
        userData,
        context: { ...scored, isGroupStageFinished, topPercentage: 100, perfectDaysCount },
      });
    }
  }

  userResults.sort((a, b) => b.totalPoints - a.totalPoints);
  const totalUsers = userResults.length;

  // Use pessimistic rank (last position in tie group) so badges like zona_copas/en_cima
  // require genuine separation from the pack, not just tying for first.
  for (let i = 0; i < totalUsers; i++) {
    const pts = userResults[i].totalPoints;
    let lastSameIdx = i;
    while (lastSameIdx + 1 < totalUsers && userResults[lastSameIdx + 1].totalPoints === pts) {
      lastSameIdx++;
    }
    // If first matchday isn't done yet, set topPercentage to 100 so zona_copas/en_cima are never awarded
    userResults[i].context.topPercentage = rankingBadgesEnabled
      ? ((lastSameIdx + 1) / totalUsers) * 100
      : 100;
  }

  const top1000 = userResults.slice(0, 1000).map((r) => ({
    uid: r.userId,
    displayName: r.userData.displayName || "Anónimo",
    photoURL: r.userData.photoURL || null,
    totalPoints: r.totalPoints,
  }));
  await database.collection("system_stats").doc("leaderboard_top_1000").set({
    players: top1000,
    totalCount: totalUsers,
    updatedAt: new Date().toISOString(),
  });

  const pendingNotifs: { userId: string; badgeId: string }[] = [];
  const chunks: any[][] = [];
  let currentChunk: any[] = [];
  for (const res of userResults) {
    currentChunk.push(res);
    if (currentChunk.length === 450) { chunks.push(currentChunk); currentChunk = []; }
  }
  if (currentChunk.length > 0) chunks.push(currentChunk);

  for (const chunk of chunks) {
    const batch = database.batch();
    for (const res of chunk) {
      const userRef = database.collection("users").doc(res.userId);
      const currentEarnedIds = res.userData.earnedBadges || [];
      const unlockedBadges = assignUserBadges(res.userData, res.totalPoints, currentEarnedIds, res.context);

      batch.set(userRef, {
        totalPoints: res.totalPoints,
        earnedBadges: unlockedBadges,
        exactMatchCount: res.context.exactMatchCount ?? 0,
        correctMatchCount: res.context.correctMatchCount ?? 0,
        groupsPerfectCount: res.context.groupsPerfectCount ?? 0,
      }, { merge: true });

      if (unlockedBadges.length > currentEarnedIds.length) {
        const newBadges = unlockedBadges.filter((b: string) => !currentEarnedIds.includes(b));
        for (const newBadge of newBadges) pendingNotifs.push({ userId: res.userId, badgeId: newBadge });
      }
    }
    await batch.commit();
  }

  const createdAt = new Date().toISOString();
  for (let i = 0; i < pendingNotifs.length; i += 499) {
    const batch = database.batch();
    for (const { userId, badgeId } of pendingNotifs.slice(i, i + 499)) {
      const notifRef = database.collection("notifications").doc();
      batch.set(notifRef, {
        userId,
        type: "badge_earned",
        title: "¡Medalla Desbloqueada!",
        message: `Has desbloqueado la medalla: ${badgeId}`,
        read: false,
        createdAt,
        actionUrl: "/profile?tab=stats",
        badgeId,
      });
    }
    await batch.commit();
  }
}
