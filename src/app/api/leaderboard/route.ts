import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const revalidate = 60; // Cache de 1 minuto para el ISR

export async function GET() {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    // 1. Intentar leer el documento consolidado "Top 1000" para velocidad máxima
    const topDoc = await db.collection("system_stats").doc("leaderboard_top_1000").get();
    
    let allPlayers: any[] = [];

    if (topDoc.exists) {
      const data = topDoc.data();
      if (data && data.players) {
        allPlayers = data.players;
      }
    }

    // 2. Si no hay datos consolidados, intentar chunks antiguos o fallback live
    if (allPlayers.length === 0) {
      console.log("Leaderboard: Optimized doc not found, performing live fallback query...");
      const usersSnap = await db.collection("users")
        .orderBy("totalPoints", "desc")
        .limit(200) 
        .get();

      allPlayers = usersSnap.docs.map(doc => ({
        uid: doc.id,
        displayName: doc.data().displayName || 'Usuario Anónimo',
        photoURL: doc.data().photoURL || null,
        totalPoints: doc.data().totalPoints || 0
      }));
    }

    // 3. Devolver la respuesta con headers de cache agresivos
    const response = NextResponse.json({ players: allPlayers });
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    
    return response;
  } catch (error: any) {
    console.error("API Leaderboard Error:", error);
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}
