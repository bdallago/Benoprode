import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { getUserBadges } from "@/lib/gamification";
import { EARLY_LOCK_DEADLINE_ISO } from "@/lib/config";
import type * as FirebaseFirestore from "firebase-admin/firestore";

const COOLDOWN_MS = 60_000;

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const adminAuth = getAdminAuth();
  if (!db || !adminAuth) return NextResponse.json({ error: "Server not available" }, { status: 500 });

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Read user doc, predictions doc, and leagues in parallel
  const [userSnap, predSnap, leaguesSnap] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("predictions").doc(uid).get(),
    db.collection("leagues").where("members", "array-contains", uid).get(),
  ]);

  if (!userSnap.exists) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  const userData = userSnap.data()!;

  // Cooldown: skip full recalc if called within the last 60s
  const lastRecalcAt = userData.lastRecalcAt as string | undefined;
  if (lastRecalcAt && Date.now() - new Date(lastRecalcAt).getTime() < COOLDOWN_MS) {
    return NextResponse.json({
      newBadges: [],
      allBadges: userData.earnedBadges ?? [],
      cached: true,
    });
  }

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
      const updatedTime = new Date(predData.updatedAt).getTime();
      const deadlineTime = new Date(EARLY_LOCK_DEADLINE_ISO).getTime();
      lockedEarly = !isNaN(updatedTime) && updatedTime < deadlineTime;
    }
  }

  const inBenoliga = leaguesSnap.docs.some(
    (d: FirebaseFirestore.QueryDocumentSnapshot) => d.id === "benoliga" || ((d.data().name as string) || "").toLowerCase().includes("beno")
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

  const updates: Record<string, unknown> = {
    earnedBadges: newBadgeIds,
    lastRecalcAt: new Date().toISOString(),
  };
  if (hasSavedPredictions !== !!userData.hasSavedPredictions) updates.hasSavedPredictions = hasSavedPredictions;
  if (lockedEarly !== !!userData.lockedEarly) updates.lockedEarly = lockedEarly;

  await db.collection("users").doc(uid).update(updates);

  return NextResponse.json({ newBadges: newOnes, allBadges: newBadgeIds });
}
