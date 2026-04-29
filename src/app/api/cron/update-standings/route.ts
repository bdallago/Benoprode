import { NextResponse } from "next/server";
import axios from "axios";
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { GROUPS } from "../../../../data";

// Initialize Firebase Admin
function getDb() {
  if (getApps().length === 0) {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    let credential;
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      credential = require("firebase-admin/app").cert(serviceAccount);
    } else {
      credential = applicationDefault();
    }

    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      const app = initializeApp({
        credential,
        projectId: config.projectId,
      });
      return getFirestore(app, config.firestoreDatabaseId);
    }
  } else {
    const app = getApps()[0];
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      return getFirestore(app, config.firestoreDatabaseId);
    }
    return getFirestore(app);
  }
  return null;
}

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
    const actualGroups = actualData.groups || {};
    const actualSpecials = actualData.specials || {};
    const actualMatches = actualData.matches || {};
    const isGroupStageFinished = actualData.isGroupStageFinished || false;

    // Fetch all users once to avoid loop querying
    const usersSnap = await database.collection("users").get();
    const userMap = new Map();
    usersSnap.docs.forEach((doc: any) => userMap.set(doc.id, doc.data()));

    // Fetch all leagues for badges
    const leaguesSnap = await database.collection("leagues").get();
    const leagues = leaguesSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    // Fetch all predictions
    const predictionsSnap = await database.collection("predictions").get();
    
    const userResults: any[] = [];

    predictionsSnap.docs.forEach((predDoc: any) => {
      const userId = predDoc.id;
      const pred = predDoc.data();
      const userData = userMap.get(userId);
      if (!userData) return;

      const userLeagues = leagues.filter((l: any) => l.members?.includes(userId) || l.createdBy === userId);
      const inBenoliga = userLeagues.some((l: any) => l.name?.toLowerCase().includes('beno') || l.id === 'benoliga');
      const inPrivateLeague = userLeagues.length > 0;
      
      // Inject into userData to pass to the gamification lib
      userData.inBenoliga = inBenoliga;
      userData.inPrivateLeague = inPrivateLeague;

      let totalPoints = 0;
      
      // Gamification metrics
      let exactMatchCount = 0;
      let correctMatchCount = 0;
      let groupsPerfectCount = 0;
      let zeroZeroPredictionsCount = 0;

      // Group Points
      const pGroups = pred.groups || {};
      for (const [groupLetter, actualTeams] of Object.entries(actualGroups)) {
        const predictedTeams = pGroups[groupLetter] || [];
        let exactGroupMatches = 0;
        for (let i = 0; i < 4; i++) {
          if ((actualTeams as string[])[i] && predictedTeams[i] === (actualTeams as string[])[i]) {
            totalPoints += 1;
            exactGroupMatches++;
          }
        }
        if (exactGroupMatches === 4) {
          totalPoints += 2;
          groupsPerfectCount++;
        }
      }

      // Special Points
      const pSpecials = pred.specials || {};
      for (const [qId, actualAnswer] of Object.entries(actualSpecials)) {
        const predictedAnswer = pSpecials[qId];
        if (predictedAnswer && actualAnswer && typeof actualAnswer === "string" && typeof predictedAnswer === "string") {
          if (predictedAnswer.trim().toLowerCase() === actualAnswer.trim().toLowerCase()) {
            totalPoints += 10;
          }
        }
      }

      // Match Points
      const pMatches = pred.matches || {};
      for (const [matchId, actualMatch] of Object.entries(actualMatches)) {
        const predictedMatch = pMatches[matchId];
        if (predictedMatch && actualMatch) {
          if ((predictedMatch as any).outcome && (actualMatch as any).outcome && (predictedMatch as any).outcome === (actualMatch as any).outcome) {
            totalPoints += 1;
            correctMatchCount++;
          }
          if (
            (predictedMatch as any).teamA !== '' && (predictedMatch as any).teamB !== '' &&
            (actualMatch as any).teamA !== '' && (actualMatch as any).teamB !== '' &&
            (predictedMatch as any).teamA === (actualMatch as any).teamA &&
            (predictedMatch as any).teamB === (actualMatch as any).teamB
          ) {
            totalPoints += 1; // Double points for exact match
            exactMatchCount++;
            if (predictedMatch.teamA === 0 && predictedMatch.teamB === 0) {
              zeroZeroPredictionsCount++;
            }
          }
        }
      }
      
      const context = {
        exactMatchCount,
        correctMatchCount,
        groupsPerfectCount,
        isGroupStageFinished,
        zeroZeroPredictionsCount,
        topPercentage: 100 // Updated below
      };

      userResults.push({
        userId,
        totalPoints,
        pred,
        userData,
        context
      });
    });

    // Sort by points to determine rankings for top 10% / top 30%
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

    // Batch write calculations to Firestore
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

        // Add notifications for newly unlocked badges
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
  const cronSecret = process.env.CRON_SECRET || "dev-secret-token";
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
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
