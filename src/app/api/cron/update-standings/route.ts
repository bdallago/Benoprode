import { NextResponse } from "next/server";
import axios from "axios";
import { getAdminDb } from "@/lib/firebase-admin";
import { GROUPS } from "../../../../data";
import { computePoints, sanitizeGroups } from "@/lib/points-calculation";

const TEAM_NAME_MAPPING: Record<string, string> = {
  "Korea Republic": "South Korea",
  "Côte d'Ivoire": "Ivory Coast",
};

import { getUserBadges } from "../../../../lib/gamification";

function assignUserBadges(docData: any, totalPoints: number, currentEarnedIds: string[] = [], context: any = {}): string[] {
  // Use existing helper and pass any relevant user statistics you have.
  return getUserBadges(totalPoints, docData, currentEarnedIds, context);
}

async function calculatePoints(database: any) {
  try {
    const resultsDoc = await database.collection("results").doc("actual").get();
    if (!resultsDoc.exists) return;

    const actualData = resultsDoc.data();
    const isGroupStageFinished: boolean = actualData.isGroupStageFinished || false;
    const sanitizedActualG = sanitizeGroups(actualData.groups ?? {});
    const actualSpecials: Record<string, string> = actualData.specials || {};
    const actualMatches: Record<string, any> = actualData.matches || {};

    // Leagues fetched upfront — small collection, needed for badge context
    const leaguesSnap = await database.collection("leagues").get();
    const leagues = leaguesSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    const userResults: any[] = [];

    // Paginate users in chunks of 50 to avoid full-table memory load
    let lastDoc: any = null;
    let hasMore = true;
    let chunkCount = 0;
    while (hasMore && chunkCount < 500) {
      chunkCount++;
      let q = database.collection("users").orderBy("__name__").limit(50);
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
        userData.inBenoliga = userLeagues.some((l: any) => l.name?.toLowerCase().includes('beno') || l.id === 'benoliga');
        userData.inPrivateLeague = userLeagues.length > 0;

        const pred = predMap.get(userId) ?? {};
        const scored = computePoints(sanitizedActualG, actualSpecials, actualMatches, pred);

        userResults.push({
          userId,
          totalPoints: scored.totalPoints,
          userData,
          context: { ...scored, isGroupStageFinished, topPercentage: 100 }
        });
      }
    }

    // Sort to determine rankings for badge topPercentage context
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

    // Leaderboard Aggregation - Top 1000 in one doc
    const top1000 = userResults.slice(0, 1000).map(r => ({
      uid: r.userId,
      displayName: r.userData.displayName || "Anónimo",
      photoURL: r.userData.photoURL || null,
      totalPoints: r.totalPoints
    }));
    await database.collection("system_stats").doc("leaderboard_top_1000").set({
      players: top1000,
      totalCount: totalUsers,
      updatedAt: new Date().toISOString()
    });

    // Batch write user points, badges, and badge notifications (450 per batch)
    const chunks: any[][] = [];
    let currentChunk: any[] = [];
    for (const res of userResults) {
      currentChunk.push(res);
      if (currentChunk.length === 450) {
        chunks.push(currentChunk);
        currentChunk = [];
      }
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
          earnedBadges: unlockedBadges
        }, { merge: true });

        if (unlockedBadges.length > currentEarnedIds.length) {
          const newBadges = unlockedBadges.filter((b: string) => !currentEarnedIds.includes(b));
          for (const newBadge of newBadges) {
            const notifRef = database.collection("notifications").doc();
            batch.set(notifRef, {
              userId: res.userId,
              type: 'badge_earned',
              title: '¡Medalla Desbloqueada!',
              message: `Has desbloqueado la medalla: ${newBadge}`,
              read: false,
              createdAt: new Date().toISOString(),
              actionUrl: '/profile?tab=stats',
              badgeId: newBadge
            });
          }
        }
      }

      await batch.commit();
    }
  } catch (error) {
    console.error("Error calculating points:", error);
  }
}

async function fetchAndUpdateStandings(database: any, apiKey: string) {
  if (!apiKey) return;

  try {
    const response = await axios.get("https://v3.football.api-sports.io/standings", {
      params: { league: 1, season: 2026 },
      headers: { "x-apisports-key": apiKey },
    });

    const data = response.data;
    if (!data || !data.response || data.response.length === 0) return;

    const standings = data.response[0].league.standings;
    const newGroups: Record<string, string[]> = {};

    standings.forEach((groupStandings: any[]) => {
      if (!groupStandings || groupStandings.length === 0) return;
      
      const groupName = groupStandings[0].group; 
      const groupLetter = groupName.replace("Group ", "").trim();
      
      if (groupLetter in GROUPS) {
        groupStandings.sort((a: any, b: any) => a.rank - b.rank);
        
        const teams = groupStandings.map((s: any) => {
          let name = s.team.name;
          if (TEAM_NAME_MAPPING[name]) {
            name = TEAM_NAME_MAPPING[name];
          }
          return name;
        });
        
        newGroups[groupLetter] = teams;
      }
    });

    if (Object.keys(newGroups).length > 0) {
      await database.collection("results").doc("actual").set({ groups: newGroups }, { merge: true });
      await calculatePoints(database);
    }

  } catch (error: any) {
    console.error("Error fetching standings:", error.message);
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db || !process.env.API_FOOTBALL_KEY) {
    return NextResponse.json({ error: "Database or API key not configured" }, { status: 500 });
  }

  try {
    await fetchAndUpdateStandings(db, process.env.API_FOOTBALL_KEY);
    return NextResponse.json({ success: true, message: "Standings updated and points recalculated." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
