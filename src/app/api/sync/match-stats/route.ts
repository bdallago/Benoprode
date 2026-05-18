import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
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

    // Preserve existing _comments metadata (comment activity indicators) before overwriting
    const existing = await db.collection("statistics").doc("matches").get();
    const existingComments = existing.exists ? (existing.data()!._comments ?? {}) : {};

    await db.collection("statistics").doc("matches").set({ ...stats, _comments: existingComments });

    return NextResponse.json({ success: true, message: "Stats synced." });
  } catch (error: any) {
    console.error("Error syncing stats in bg:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
