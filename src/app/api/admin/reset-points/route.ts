import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

// One-time endpoint: resets all user points/badges to 0 without touching predictions.
// Protected by CRON_SECRET. DELETE THIS FILE after use.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  let processed = 0;
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
      batch.update(doc.ref, {
        totalPoints: 0,
        earnedBadges: [],
        exactMatchCount: 0,
        correctMatchCount: 0,
        groupsPerfectCount: 0,
      });
      processed++;
    }
    await batch.commit();
  }

  return NextResponse.json({ ok: true, processed });
}
