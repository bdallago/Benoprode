import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import matchesJson from "../../../../lib/matches.json";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "DB not available" }, { status: 500 });

  const adminAuth = getAdminAuth();
  if (!adminAuth) return NextResponse.json({ error: "Auth not available" }, { status: 500 });

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const userDoc = await db.collection("users").doc(uid).get();
  if (userDoc.data()?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const batch = db.batch();

    matchesJson.forEach((match: any) => {
      const matchRef = db.collection("matches").doc(match.id);
      batch.set(matchRef, {
        id: match.id,
        teamA: match.teamA,
        teamB: match.teamB,
        startTime: admin.firestore.Timestamp.fromDate(new Date(match.date)),
        status: "scheduled",
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    });

    await batch.commit();

    return NextResponse.json({ ok: true, count: matchesJson.length });
  } catch (e: any) {
    console.error("[admin/sync-matches] Error:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
