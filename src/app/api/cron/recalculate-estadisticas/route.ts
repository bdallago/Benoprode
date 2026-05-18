import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { recalculateGlobalStats } from "@/lib/recalculate-global-stats";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "DB not available" }, { status: 500 });

  try {
    const result = await recalculateGlobalStats(db);
    console.log("[cron/recalculate-estadisticas] ok:", result.actualizadoEn);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("[cron/recalculate-estadisticas] Error:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
