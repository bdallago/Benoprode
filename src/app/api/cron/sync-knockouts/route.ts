import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { syncKnockouts } from "@/lib/bracket/syncKnockouts";

// Siembra/actualiza el cuadro de eliminatorias y recalcula puntos.
// Disparable manualmente; además se invoca acoplado desde sync-football-api
// y update-standings (siempre después de syncStandings).
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
    const result = await syncKnockouts(db, process.env.API_FOOTBALL_KEY);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
