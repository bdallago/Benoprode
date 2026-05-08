import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "DB not available" }, { status: 500 });

  const adminAuth = getAdminAuth();
  if (!adminAuth) return NextResponse.json({ error: "Auth not available" }, { status: 500 });

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (e) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const userDoc = await db.collection("users").doc(uid).get();
  if (userDoc.data()?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const now = new Date();
    const iso = (offsetMs: number) => new Date(now.getTime() - offsetMs).toISOString();
    const d1  = iso(1  * 24 * 60 * 60 * 1000);
    const d7  = iso(7  * 24 * 60 * 60 * 1000);
    const d14 = iso(14 * 24 * 60 * 60 * 1000);
    const d30 = iso(30 * 24 * 60 * 60 * 1000);

    const n = (snap: { data(): { count: number } }) => snap.data().count;

    const [
      totalUsers,
      nuevos7d,
      activosHoy,
      activosSemana,
      activosMes,
      inactivos14d,
      referidos,
      regresaron1vez,
      regresaronVarias,
      totalLeagues,
      privadas,
      publicas,
      duelsCreados,
      duelsAceptados,
      conPrediccion,
      conEspeciales,
      prodeCompleto,
    ] = await Promise.all([
      db.collection("users").count().get().then(n),
      db.collection("users").where("createdAt", ">=", d7).count().get().then(n),
      db.collection("users").where("lastLogin", ">=", d1).count().get().then(n),
      db.collection("users").where("lastLogin", ">=", d7).count().get().then(n),
      db.collection("users").where("lastLogin", ">=", d30).count().get().then(n),
      db.collection("users").where("lastLogin", "<", d14).count().get().then(n),
      // referredBy es string uid o null — ">" filtra sólo los strings non-empty (invitados)
      db.collection("users").where("referredBy", ">", "").count().get().then(n),
      db.collection("users").where("loginCount", ">=", 2).count().get().then(n),
      db.collection("users").where("loginCount", ">=", 3).count().get().then(n),
      db.collection("leagues").count().get().then(n),
      db.collection("leagues").where("isPublic", "==", false).count().get().then(n),
      db.collection("leagues").where("isPublic", "==", true).count().get().then(n),
      db.collection("duels_v2").count().get().then(n),
      db.collection("duels_v2").where("status", "==", "accepted").count().get().then(n),
      db.collection("predictions").where("hasSavedPredictions", "==", true).count().get().then(n),
      // ">" en campo anidado evita el índice compuesto que requiere "!="
      db.collection("predictions").where("specials.topScorer", ">", "").count().get().then(n),
      db.collection("predictions").where("isLocked", "==", true).count().get().then(n),
    ]);

    await db.collection("estadisticas_globales").doc("actual").set({
      usuarios: {
        total:           totalUsers,
        nuevos7d,
        organicos:       totalUsers - referidos,
        referidos,
        activosHoy,
        activosSemana,
        activosMes,
        inactivos14d,
        regresaron1vez,
        regresaronVarias,
      },
      participacion: {
        conPrediccion,
        conEspeciales,
        prodeCompleto,
      },
      torneos: {
        total:   totalLeagues,
        privadas,
        publicas,
      },
      duelos: {
        creados:   duelsCreados,
        aceptados: duelsAceptados,
      },
      actualizadoEn: now.toISOString(),
    });

    return NextResponse.json({ ok: true, actualizadoEn: now.toISOString() });
  } catch (e: any) {
    console.error("[recalcular-estadisticas] Error:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
