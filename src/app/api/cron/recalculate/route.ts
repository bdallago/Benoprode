import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { recalculatePoints } from "@/lib/recalculate-points";

// Recálculo de puntos desacoplado de la API. Corre cada minuto y reparte puntos
// a partir de results/actual (datos cargados manualmente por el superadmin).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    await recalculatePoints(db);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[recalculate]", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
