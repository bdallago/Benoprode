import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { logError } from "@/lib/error-logger";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const adminAuth = getAdminAuth();
  if (!db || !adminAuth) return NextResponse.json({ error: "Server not available" }, { status: 500 });

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userData = userSnap.data()!;
  const todayStr = new Date().toISOString().split("T")[0];

  const updates: Record<string, unknown> = {
    lastLogin: new Date().toISOString(),
    loginCount: FieldValue.increment(1),
    activeDays: FieldValue.arrayUnion(todayStr),
    uid,
  };

  // Backfill fields that may be missing on older profiles
  if (!userData.displayNameLower) {
    updates.displayNameLower = ((userData.displayName as string) || "usuario").toLowerCase();
  }
  if (userData.totalPoints == null) updates.totalPoints = 0;
  if (userData.chatWarnings == null) updates.chatWarnings = 0;
  if (userData.isChatBanned == null) updates.isChatBanned = false;

  try {
    await userRef.update(updates);
  } catch (e) {
    await logError({
      message: `login-activity: Firestore update failed`,
      stack: e instanceof Error ? e.stack : String(e),
      context: "login-activity",
      uid,
    });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
