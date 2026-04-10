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

async function calculatePoints(database: any) {
  try {
    const resultsDoc = await database.collection("results").doc("actual").get();
    if (!resultsDoc.exists) return;
    
    const actualData = resultsDoc.data();
    const actualGroups = actualData.groups || {};
    const actualSpecials = actualData.specials || {};

    const usersSnap = await database.collection("users").get();
    const batch = database.batch();

    usersSnap.forEach((doc: any) => {
      const pred = doc.data();
      let totalPoints = 0;

      // Group Points
      const pGroups = pred.groups || {};
      for (const [groupLetter, actualTeams] of Object.entries(actualGroups)) {
        const predictedTeams = pGroups[groupLetter] || [];
        let exactMatches = 0;
        for (let i = 0; i < 4; i++) {
          if ((actualTeams as string[])[i] && predictedTeams[i] === (actualTeams as string[])[i]) {
            totalPoints += 1;
            exactMatches++;
          }
        }
        if (exactMatches === 4) {
          totalPoints += 2;
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
      const actualMatches = actualData.matches || {};
      for (const [matchId, actualMatch] of Object.entries(actualMatches)) {
        const predictedMatch = pMatches[matchId];
        if (predictedMatch && actualMatch) {
          if ((predictedMatch as any).outcome && (actualMatch as any).outcome && (predictedMatch as any).outcome === (actualMatch as any).outcome) {
            totalPoints += 1;
          }
          if (
            (predictedMatch as any).teamA !== '' && (predictedMatch as any).teamB !== '' &&
            (actualMatch as any).teamA !== '' && (actualMatch as any).teamB !== '' &&
            (predictedMatch as any).teamA === (actualMatch as any).teamA &&
            (predictedMatch as any).teamB === (actualMatch as any).teamB
          ) {
            totalPoints += 1;
          }
        }
      }

      batch.set(doc.ref, { totalPoints }, { merge: true });
    });

    await batch.commit();
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
