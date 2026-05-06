import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import matchesJson from "../../../../lib/matches.json";

export async function GET(req: Request) {
  // Verificación de seguridad
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "DB Error" }, { status: 500 });

  try {
    /** 
     * CONFIGURACIÓN FUTURA DE API DE FÚTBOL:
     * Una vez pagues la API, aquí haremos:
     * const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
     *   headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY }
     * });
     * const data = await res.json();
     */
    
    // Por ahora, sincronizamos desde nuestro matches.json local para tener 
    // la colección de Firebase poblada y que las reglas de seguridad funcionen.
    const batch = db.batch();
    
    matchesJson.forEach(match => {
      const matchRef = db.collection("matches").doc(match.id);
      batch.set(matchRef, {
        id: match.id,
        teamA: match.teamA,
        teamB: match.teamB,
        startTime: match.date, // ISO Format
        status: "scheduled",
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });

    await batch.commit();

    return NextResponse.json({ success: true, count: matchesJson.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
