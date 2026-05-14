import { getAdminDb } from "@/lib/firebase-admin";
import { getUserBadges } from "@/lib/gamification";
import { EARLY_LOCK_DEADLINE_ISO } from "@/lib/config";
import type * as FirebaseFirestore from "firebase-admin/firestore";

export interface RecalculateResult {
  processed: number;
  updated: number;
  failed: string[];
}

interface WriteUpdate {
  ref: FirebaseFirestore.DocumentReference;
  data: Record<string, unknown>;
}

const CHUNK_SIZE = 10;
const BATCH_WRITE_SIZE = 400;

async function processUser(
  db: FirebaseFirestore.Firestore,
  userDoc: FirebaseFirestore.QueryDocumentSnapshot
): Promise<WriteUpdate | null> {
  const uid = userDoc.id;
  const userData = userDoc.data();

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
  if (newOnes.length === 0) return null;

  const writeData: Record<string, unknown> = { earnedBadges: newBadgeIds };
  if (hasSavedPredictions !== !!userData.hasSavedPredictions) writeData.hasSavedPredictions = hasSavedPredictions;
  if (lockedEarly !== !!userData.lockedEarly) writeData.lockedEarly = lockedEarly;

  return { ref: userDoc.ref, data: writeData };
}

export async function recalculateAllBadges(): Promise<RecalculateResult> {
  const db = getAdminDb();
  if (!db) throw new Error("DB not available");

  const usersSnap = await db.collection("users").get();
  const allDocs = usersSnap.docs as FirebaseFirestore.QueryDocumentSnapshot[];

  const allWrites: WriteUpdate[] = [];
  const failed: string[] = [];
  let processed = 0;

  // Process users in parallel chunks to balance speed vs Firestore concurrency
  for (let i = 0; i < allDocs.length; i += CHUNK_SIZE) {
    const chunk = allDocs.slice(i, i + CHUNK_SIZE);
    const results = await Promise.allSettled(chunk.map((doc) => processUser(db, doc)));

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === "fulfilled") {
        if (result.value) allWrites.push(result.value);
        processed++;
      } else {
        failed.push(chunk[j].id);
      }
    }
  }

  // Batch-write all badge updates
  for (let i = 0; i < allWrites.length; i += BATCH_WRITE_SIZE) {
    const batch = db.batch();
    for (const { ref, data } of allWrites.slice(i, i + BATCH_WRITE_SIZE)) {
      batch.update(ref, data);
    }
    await batch.commit();
  }

  return { processed, updated: allWrites.length, failed };
}
