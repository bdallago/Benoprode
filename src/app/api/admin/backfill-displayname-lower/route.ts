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

  // Find all users missing displayNameLower
  const snap = await db.collection("users").get();
  const missing = snap.docs.filter((d: FirebaseFirestore.QueryDocumentSnapshot) => !d.data().displayNameLower);

  let updated = 0;
  const BATCH_SIZE = 400;

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = missing.slice(i, i + BATCH_SIZE);
    for (const d of chunk) {
      const displayName = (d.data().displayName as string) || "";
      batch.update(d.ref, { displayNameLower: displayName.toLowerCase() });
    }
    await batch.commit();
    updated += chunk.length;
  }

  return NextResponse.json({ total: snap.size, updated, skipped: snap.size - missing.length });
}
