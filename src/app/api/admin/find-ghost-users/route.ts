import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import type * as FirebaseFirestore from "firebase-admin/firestore";

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

  // Paginate through ALL Firebase Auth users
  const allAuthUsers: { uid: string; displayName: string; email: string; createdAt: string }[] = [];
  let pageToken: string | undefined;

  do {
    const result = await adminAuth.listUsers(1000, pageToken);
    for (const u of result.users) {
      allAuthUsers.push({
        uid: u.uid,
        displayName: u.displayName || "Sin nombre",
        email: u.email || `${u.uid}@no-email.com`,
        createdAt: u.metadata.creationTime || "",
      });
    }
    pageToken = result.pageToken;
  } while (pageToken);

  // Check in batches of 100 which UIDs have no Firestore document
  const ghosts: typeof allAuthUsers = [];
  const BATCH = 100;

  for (let i = 0; i < allAuthUsers.length; i += BATCH) {
    const chunk = allAuthUsers.slice(i, i + BATCH);
    const refs = chunk.map((u) => db.collection("users").doc(u.uid));
    const snaps = await db.getAll(...refs);

    snaps.forEach((snap: FirebaseFirestore.DocumentSnapshot, idx: number) => {
      if (!snap.exists) ghosts.push(chunk[idx]);
    });
  }

  return NextResponse.json({
    totalInAuth: allAuthUsers.length,
    ghostCount: ghosts.length,
    ghosts,
  });
}
