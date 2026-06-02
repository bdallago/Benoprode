import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { syncStandings } from "@/lib/sync-standings";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db || !process.env.API_FOOTBALL_KEY) {
    return NextResponse.json({ error: "Database or API key not configured" }, { status: 500 });
  }

  try {
    await syncStandings(db, process.env.API_FOOTBALL_KEY);
    return NextResponse.json({ success: true, message: "Standings updated and points recalculated." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
