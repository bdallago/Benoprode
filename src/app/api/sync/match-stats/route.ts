import { NextResponse } from "next/server";
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

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

export async function POST(request: Request) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    // We synchronize the stats asynchronously.
    // In a real high-throughput prod env, we'd use Firebase Cloud Functions with FieldValue.increment()
    // Here, to guarantee data consistency, we recalculate the aggregates.
    const predictionsSnap = await db.collection("predictions").get();
    const stats: Record<string, any> = {};
    
    predictionsSnap.docs.forEach((doc: any) => {
      const data = doc.data();
      if (data.matches) {
        Object.entries(data.matches).forEach(([matchId, pred]: [string, any]) => {
          if (pred && (pred.outcome === 'A' || pred.outcome === 'B' || pred.outcome === 'DRAW')) {
            if (!stats[matchId]) {
              stats[matchId] = { A: 0, B: 0, DRAW: 0, total: 0 };
            }
            stats[matchId][pred.outcome]++;
            stats[matchId].total++;
          }
        });
      }
    });

    await db.collection("statistics").doc("matches").set(stats);
    
    return NextResponse.json({ success: true, message: "Stats synced." });
  } catch (error: any) {
    console.error("Error syncing stats in bg:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
