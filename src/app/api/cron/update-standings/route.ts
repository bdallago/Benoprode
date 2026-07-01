import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { syncStandings } from "@/lib/sync-standings";
import { recalculatePoints } from "@/lib/recalculate-points";
import { syncKnockouts } from "@/lib/bracket/syncKnockouts";
import { isApiEnabled } from "@/lib/apiEnabled";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isApiEnabled()) {
    return NextResponse.json({ ok: true, skipped: "api_paused" });
  }

  const db = getAdminDb();
  if (!db || !process.env.API_FOOTBALL_KEY) {
    return NextResponse.json({ error: "Database or API key not configured" }, { status: 500 });
  }

  try {
    await syncStandings(db, process.env.API_FOOTBALL_KEY);
    await recalculatePoints(db);
    // Sembrar/actualizar el cuadro de eliminatorias con standings frescos
    // (vuelve a recalcular puntos internamente, incluyendo knockouts).
    await syncKnockouts(db, process.env.API_FOOTBALL_KEY);
    return NextResponse.json({ success: true, message: "Standings + knockouts updated and points recalculated." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
