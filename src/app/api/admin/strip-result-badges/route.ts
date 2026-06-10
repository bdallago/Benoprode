import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

// One-time endpoint: removes result-dependent badges from all users while keeping
// social/behavioral badges (referrals, leagues, duels, predictions saved).
// Callable by admin users via Firebase ID token. DELETE THIS FILE after use.

const SAFE_BADGES = new Set([
  "primer_paso",
  "confiado",
  "sobre_hora",
  "sociable",
  "influencer",
  "embajador",
  "rival_beno",
  "competitivo",
  "muchachos",
  "primera_sangre",
  "duelista",
  "gladiador",
  "invencible",
]);

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  // Accept either CRON_SECRET or a valid Firebase admin ID token
  const isCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  let isAdmin = isCron;

  if (!isAdmin && authHeader?.startsWith("Bearer ")) {
    const idToken = authHeader.slice(7);
    try {
      const adminAuth = getAdminAuth();
      if (!adminAuth) throw new Error("Auth not configured");
      const decoded = await adminAuth.verifyIdToken(idToken);
      const db = getAdminDb();
      const userDoc = await db!.collection("users").doc(decoded.uid).get();
      isAdmin = userDoc.exists && userDoc.data()?.role === "admin";
    } catch {
      isAdmin = false;
    }
  }

  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  let processed = 0;
  let stripped = 0;
  let lastDoc: any = null;
  let hasMore = true;

  while (hasMore) {
    let q: any = db.collection("users").orderBy("__name__").limit(400);
    if (lastDoc) q = q.startAfter(lastDoc);
    const chunk = await q.get();
    if (chunk.empty) { hasMore = false; break; }
    lastDoc = chunk.docs[chunk.docs.length - 1];

    const batch = db.batch();
    for (const doc of chunk.docs) {
      const current: string[] = doc.data().earnedBadges || [];
      const filtered = current.filter((b) => SAFE_BADGES.has(b));
      if (filtered.length !== current.length) {
        batch.update(doc.ref, { earnedBadges: filtered });
        stripped++;
      }
      processed++;
    }
    await batch.commit();
  }

  return NextResponse.json({ ok: true, processed, stripped });
}
