/**
 * One-time script: removes zona_copas and en_cima from all users.
 * Run once before the first post-matchday recalculate (after Uzbekistán vs Colombia).
 *
 * Usage: node scripts/reset-ranking-badges.mjs
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load service account from .env FIREBASE_ADMIN_KEY
const envContent = readFileSync(join(__dirname, "../.env"), "utf8");
const envLocalContent = readFileSync(join(__dirname, "../.env.local"), "utf8");
const combined = envContent + "\n" + envLocalContent;

const match = combined.match(/^FIREBASE_ADMIN_KEY=(.+)$/m);
if (!match) throw new Error("FIREBASE_ADMIN_KEY not found in .env");
const serviceAccount = JSON.parse(match[1]);

const dbIdMatch = combined.match(/^NEXT_PUBLIC_FIREBASE_DATABASE_ID=(.+)$/m);
const databaseId = dbIdMatch ? dbIdMatch[1].trim() : "(default)";
console.log("Connecting to project:", serviceAccount.project_id, "| database:", databaseId);

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app, databaseId);

const BADGES_TO_REMOVE = ["zona_copas", "en_cima"];
const BATCH_SIZE = 400;

async function run() {
  let lastDoc = null;
  let totalReset = 0;

  while (true) {
    let q = db.collection("users").orderBy("__name__").limit(BATCH_SIZE);
    if (lastDoc) q = q.startAfter(lastDoc);

    const snap = await q.get();
    if (snap.empty) break;

    const batch = db.batch();
    let batchCount = 0;

    for (const doc of snap.docs) {
      const badges = doc.data().earnedBadges || [];
      const filtered = badges.filter((b) => !BADGES_TO_REMOVE.includes(b));
      if (filtered.length !== badges.length) {
        batch.update(doc.ref, { earnedBadges: filtered });
        batchCount++;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      totalReset += batchCount;
      console.log(`Reset ${batchCount} users in this batch (total: ${totalReset})`);
    }

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.docs.length < BATCH_SIZE) break;
  }

  console.log(`Done. Total users with badges removed: ${totalReset}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
