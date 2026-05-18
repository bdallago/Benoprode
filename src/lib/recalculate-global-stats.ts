import type { Firestore } from 'firebase-admin/firestore';

export async function recalculateGlobalStats(db: Firestore): Promise<{ actualizadoEn: string }> {
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
    // referredBy > "" filtra solo strings non-empty (usuarios invitados)
    db.collection("users").where("referredBy", ">", "").count().get().then(n),
    db.collection("users").where("loginCount", ">=", 2).count().get().then(n),
    db.collection("users").where("loginCount", ">=", 3).count().get().then(n),
    db.collection("leagues").count().get().then(n),
    db.collection("leagues").where("isPublic", "==", false).count().get().then(n),
    db.collection("leagues").where("isPublic", "==", true).count().get().then(n),
    db.collection("duels_v2").count().get().then(n),
    db.collection("duels_v2").where("status", "==", "accepted").count().get().then(n),
    db.collection("predictions").where("hasSavedPredictions", "==", true).count().get().then(n),
    db.collection("predictions").where("specials.topScorer", ">", "").count().get().then(n),
    db.collection("predictions").where("isLocked", "==", true).count().get().then(n),
  ]);

  const actualizadoEn = now.toISOString();
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
    participacion: { conPrediccion, conEspeciales, prodeCompleto },
    torneos:       { total: totalLeagues, privadas, publicas },
    duelos:        { creados: duelsCreados, aceptados: duelsAceptados },
    actualizadoEn,
  });

  return { actualizadoEn };
}
