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

  const body = await req.json().catch(() => ({}));
  const fix = body.fix === true;

  // Query all users with a referredBy value (non-empty string)
  const referredSnap = await db.collection("users").where("referredBy", ">", "").get();

  // Group by referrer UID → actual count + list of referred display names
  const actualMap = new Map<string, { count: number; referredUsers: { uid: string; name: string; email: string }[] }>();
  for (const d of referredSnap.docs) {
    const data = d.data();
    const referrerId = data.referredBy as string;
    if (!actualMap.has(referrerId)) actualMap.set(referrerId, { count: 0, referredUsers: [] });
    const entry = actualMap.get(referrerId)!;
    entry.count++;
    entry.referredUsers.push({
      uid: d.id,
      name: (data.displayName as string) || d.id,
      email: (data.email as string) || "",
    });
  }

  // Fetch each referrer's stored referralsCount and build result rows
  const referrerUids = Array.from(actualMap.keys());
  const results: {
    uid: string;
    displayName: string;
    email: string | null;
    exists: boolean;
    storedCount: number;
    actualCount: number;
    referredUsers: { uid: string; name: string; email: string }[];
    status: "ok" | "mismatch" | "referrer_deleted";
    fixed?: boolean;
  }[] = [];

  const BATCH = 100;
  for (let i = 0; i < referrerUids.length; i += BATCH) {
    const chunk = referrerUids.slice(i, i + BATCH);
    const refs = chunk.map((uid) => db.collection("users").doc(uid));
    const snaps = await db.getAll(...refs);

    for (let j = 0; j < chunk.length; j++) {
      const uid = chunk[j];
      const snap = snaps[j];
      const { count: actualCount, referredUsers } = actualMap.get(uid)!;

      if (!snap.exists) {
        results.push({
          uid,
          displayName: "Usuario eliminado",
          email: null,
          exists: false,
          storedCount: 0,
          actualCount,
          referredUsers,
          status: "referrer_deleted",
        });
        continue;
      }

      const storedCount: number = (snap.data()?.referralsCount as number) ?? 0;
      const isMismatch = storedCount !== actualCount;

      let fixed = false;
      if (fix && isMismatch) {
        await db.collection("users").doc(uid).update({ referralsCount: actualCount });
        fixed = true;
      }

      results.push({
        uid,
        displayName: (snap.data()?.displayName as string) || uid,
        email: (snap.data()?.email as string) || null,
        exists: true,
        storedCount,
        actualCount,
        referredUsers,
        status: isMismatch ? "mismatch" : "ok",
        fixed,
      });
    }
  }

  // Sort: mismatches first, then by actualCount desc
  results.sort((a, b) => {
    if (a.status !== "ok" && b.status === "ok") return -1;
    if (a.status === "ok" && b.status !== "ok") return 1;
    return b.actualCount - a.actualCount;
  });

  const mismatchCount = results.filter((r) => r.status === "mismatch").length;

  return NextResponse.json({
    totalReferred: referredSnap.size,
    totalReferrers: referrerUids.length,
    mismatchCount,
    fixed: fix,
    results,
  });
}
