import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
let db: any = null;

try {
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
    db = getFirestore(app, config.firestoreDatabaseId);
    console.log("Firebase Admin initialized successfully.");
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
  process.exit(1);
}

async function clearResults() {
  if (!db) {
    console.error("Database not initialized.");
    return;
  }

  try {
    console.log("Clearing results/actual...");
    await db.collection("results").doc("actual").set({
      groups: {},
      specials: {},
      knockouts: {},
      standings: {},
      updatedAt: new Date().toISOString()
    });
    console.log("results/actual cleared.");

    console.log("Resetting user points...");
    const usersSnap = await db.collection("users").get();
    const batch = db.batch();
    usersSnap.forEach((doc: any) => {
      batch.set(doc.ref, { totalPoints: 0 }, { merge: true });
    });
    await batch.commit();
    console.log("User points reset to 0.");
  } catch (error) {
    console.error("Error clearing results:", error);
  }
}

clearResults();
