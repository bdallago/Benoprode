import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { recalculatePoints } from "@/lib/recalculate-points";

// Recálculo de puntos desacoplado de la API. Autenticado por CRON_SECRET (cron diario
// de red de seguridad) o por un ID token de admin (lo dispara el botón Guardar del panel).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  const isCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  let authorized = Boolean(isCron);

  if (!authorized && authHeader?.startsWith("Bearer ")) {
    const idToken = authHeader.slice(7);
    try {
      const adminAuth = getAdminAuth();
      if (!adminAuth) throw new Error("Auth not configured");
      const decoded = await adminAuth.verifyIdToken(idToken);
      const db = getAdminDb();
      const userDoc = await db!.collection("users").doc(decoded.uid).get();
      authorized = userDoc.exists && userDoc.data()?.role === "admin";
    } catch {
      authorized = false;
    }
  }

  if (!authorized) {
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
