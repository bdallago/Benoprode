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

  const { ghostUid, realUid } = await req.json().catch(() => ({}));
  if (!ghostUid || !realUid) {
    return NextResponse.json({ error: "ghostUid and realUid are required" }, { status: 400 });
  }
  if (ghostUid === realUid) {
    return NextResponse.json({ error: "ghostUid and realUid must be different" }, { status: 400 });
  }

  // Verify the real user exists
  const realUserSnap = await db.collection("users").doc(realUid).get();
  if (!realUserSnap.exists) {
    return NextResponse.json({ error: "realUid has no Firestore profile" }, { status: 404 });
  }

  // Find all users with referredBy === ghostUid
  const referredSnap = await db.collection("users").where("referredBy", "==", ghostUid).get();

  if (referredSnap.empty) {
    return NextResponse.json({ error: "No users found with referredBy pointing to ghostUid" }, { status: 404 });
  }

  const actualCount = referredSnap.size;
  const oldReferralsCount = (realUserSnap.data()?.referralsCount as number) ?? 0;

  // Batch: update referredBy on all referred users + set referralsCount on real user
  const BATCH_SIZE = 400; // Firestore batch limit is 500
  const allDocs = referredSnap.docs;

  for (let i = 0; i < allDocs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = allDocs.slice(i, i + BATCH_SIZE);
    for (const d of chunk) {
      batch.update(d.ref, { referredBy: realUid });
    }
    if (i === 0) {
      // Only set referralsCount once, in the first batch
      const newCount = Math.max(oldReferralsCount, actualCount);
      batch.update(db.collection("users").doc(realUid), { referralsCount: newCount });
    }
    await batch.commit();
  }

  const newReferralsCount = Math.max(oldReferralsCount, actualCount);

  return NextResponse.json({
    ghostUid,
    realUid,
    realUserName: realUserSnap.data()?.displayName ?? realUid,
    referredCount: actualCount,
    oldReferralsCount,
    newReferralsCount,
    updatedReferredBy: actualCount,
  });
}
