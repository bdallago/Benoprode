import { computePoints, sanitizeGroups } from "./points-calculation";
import { getUserBadges } from "./gamification";

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
  const sanitizedActualG = sanitizeGroups(actualData.groups ?? {});
  const actualSpecials: Record<string, string> = actualData.specials || {};
  const actualMatches: Record<string, any> = actualData.matches || {};

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
      const scored = computePoints(sanitizedActualG, actualSpecials, actualMatches, pred);

      userResults.push({
        userId,
        totalPoints: scored.totalPoints,
        userData,
        context: { ...scored, isGroupStageFinished, topPercentage: 100 },
      });
    }
  }

  userResults.sort((a, b) => b.totalPoints - a.totalPoints);
  const totalUsers = userResults.length;

  let currentRank = 1;
  let previousPoints = -1;
  for (let i = 0; i < totalUsers; i++) {
    if (userResults[i].totalPoints !== previousPoints) {
      currentRank = i + 1;
      previousPoints = userResults[i].totalPoints;
    }
    userResults[i].context.topPercentage = (currentRank / totalUsers) * 100;
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
