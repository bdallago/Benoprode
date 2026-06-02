import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "DB not available" }, { status: 500 });

  const date = new Date().toISOString().split("T")[0];
  const snapshot = await db.collection("predictions").get();

  const data: Record<string, any> = {};
  snapshot.forEach((doc) => {
    data[doc.id] = doc.data();
  });

  await db.collection("backups").doc(date).set({
    predictions: data,
    count: snapshot.size,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, date, count: snapshot.size });
}
