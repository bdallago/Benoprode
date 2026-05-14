import { getAdminDb } from "@/lib/firebase-admin";
import { getUserBadges } from "@/lib/gamification";
import { EARLY_LOCK_DEADLINE_ISO } from "@/lib/config";
import type * as FirebaseFirestore from "firebase-admin/firestore";

export interface RecalculateResult {
  processed: number;
  updated: number;
  failed: string[];
}

export async function recalculateAllBadges(): Promise<RecalculateResult> {
  const db = getAdminDb();
  if (!db) throw new Error("DB not available");

  const usersSnap = await db.collection("users").get();

  let processed = 0;
  let updated = 0;
  const failed: string[] = [];

  const BATCH_SIZE = 400;
  let batch = db.batch();
  let batchCount = 0;

  for (const userDoc of usersSnap.docs as FirebaseFirestore.QueryDocumentSnapshot[]) {
    const uid = userDoc.id;
    const userData = userDoc.data();

    try {
      const [predSnap, leaguesSnap] = await Promise.all([
        db.collection("predictions").doc(uid).get(),
        db.collection("leagues").where("members", "array-contains", uid).get(),
      ]);

      const currentEarnedIds: string[] = userData.earnedBadges ?? [];

      let hasSavedPredictions = !!userData.hasSavedPredictions;
      let lockedEarly = !!userData.lockedEarly;

      if (predSnap.exists) {
        const predData = predSnap.data()!;
        if (!hasSavedPredictions) {
          const hasMatches = predData.matches && Object.keys(predData.matches).length > 0;
          const hasGroups = predData.groups && Object.keys(predData.groups).length > 0;
          hasSavedPredictions = !!(hasMatches || hasGroups);
        }
        if (!lockedEarly && predData.isLocked && predData.updatedAt) {
          lockedEarly = new Date(predData.updatedAt) < new Date(EARLY_LOCK_DEADLINE_ISO);
        }
      }

      const inBenoliga = leaguesSnap.docs.some(
        (d: FirebaseFirestore.QueryDocumentSnapshot) =>
          d.id === "benoliga" || ((d.data().name as string) || "").toLowerCase().includes("beno")
      );
      const inPrivateLeague = leaguesSnap.docs.length > 0;

      const userStats = {
        referralsCount: (userData.referralsCount as number) ?? 0,
        hasSavedPredictions,
        lockedEarly,
        inBenoliga,
        inPrivateLeague,
        exactMatchCount: userData.exactMatchCount ?? 0,
        correctMatchCount: userData.correctMatchCount ?? 0,
        groupsPerfectCount: userData.groupsPerfectCount ?? 0,
        duelsWon: userData.duelsWon ?? 0,
        lockedLastMinute: userData.lockedLastMinute ?? false,
        failedClearFavorite: userData.failedClearFavorite ?? false,
        isChampionInLargeLeague: userData.isChampionInLargeLeague ?? false,
        guessedUnclearMatch: userData.guessedUnclearMatch ?? false,
        pointsFromLateGoal: userData.pointsFromLateGoal ?? false,
        inLargePrivateLeague: userData.inLargePrivateLeague ?? false,
        top30AfterDate3: userData.top30AfterDate3 ?? false,
        top10AfterDate3: userData.top10AfterDate3 ?? false,
        secondPlaceAfterGroups: userData.secondPlaceAfterGroups ?? false,
      };

      const newBadgeIds = getUserBadges(
        (userData.totalPoints as number) ?? 0,
        userStats,
        currentEarnedIds,
      );

      const newOnes = newBadgeIds.filter((id) => !currentEarnedIds.includes(id));

      if (newOnes.length > 0) {
        const writeUpdates: Record<string, unknown> = { earnedBadges: newBadgeIds };
        if (hasSavedPredictions !== !!userData.hasSavedPredictions) writeUpdates.hasSavedPredictions = hasSavedPredictions;
        if (lockedEarly !== !!userData.lockedEarly) writeUpdates.lockedEarly = lockedEarly;

        batch.update(userDoc.ref, writeUpdates);
        batchCount++;
        updated++;

        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }

      processed++;
    } catch (e) {
      console.error(`[recalculate-all-badges] uid=${uid}:`, e);
      failed.push(uid);
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return { processed, updated, failed };
}
