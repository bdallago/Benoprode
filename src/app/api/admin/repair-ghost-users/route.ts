import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const adminAuth = getAdminAuth();
  if (!db || !adminAuth) return NextResponse.json({ error: "Server not available" }, { status: 500 });

  let callerUid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    callerUid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (callerDoc.data()?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const uids: string[] = body?.uids;
  if (!Array.isArray(uids) || uids.length === 0) {
    return NextResponse.json({ error: "uids array required" }, { status: 400 });
  }

  const repaired: string[] = [];
  const skipped: string[] = [];
  const notFoundInAuth: string[] = [];
  const errors: string[] = [];

  for (const uid of uids) {
    try {
      // Skip if Firestore document already exists
      const existing = await db.collection("users").doc(uid).get();
      if (existing.exists) {
        skipped.push(uid);
        continue;
      }

      // Fetch user from Firebase Auth to get their real data
      let authUser;
      try {
        authUser = await adminAuth.getUser(uid);
      } catch {
        notFoundInAuth.push(uid);
        continue;
      }

      const todayStr = new Date().toISOString().split("T")[0];

      await db.collection("users").doc(uid).set({
        uid,
        displayName: authUser.displayName || "Usuario",
        email: authUser.email || `${uid}@no-email.com`,
        photoURL: authUser.photoURL || "",
        role: "player",
        totalPoints: 0,
        referralsCount: 0,
        referredBy: null,
        createdAt: authUser.metadata.creationTime || new Date().toISOString(),
        lastLogin: authUser.metadata.lastSignInTime || new Date().toISOString(),
        activeDays: [todayStr],
        loginCount: 1,
        tourCompleted: false,
        chatWarnings: 0,
        isChatBanned: false,
        welcomeEmailSent: false,  // nunca recibieron el email por el bug
      });

      repaired.push(uid);
    } catch (e: any) {
      errors.push(`${uid}: ${e?.message || "unknown error"}`);
    }
  }

  return NextResponse.json({ repaired, skipped, notFoundInAuth, errors });
}
