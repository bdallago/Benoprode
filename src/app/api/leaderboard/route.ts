import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const revalidate = 30; // Caché del ISR por 30 segundos

export async function GET() {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    // Intentar leer los 4 chunks de 2500 jugadores cada uno
    const chunkIds = ['leaderboard_chunk_1', 'leaderboard_chunk_2', 'leaderboard_chunk_3', 'leaderboard_chunk_4'];
    const chunkRefs = chunkIds.map(id => db.collection("system_stats").doc(id));
    const chunkSnaps = await db.getAll(...chunkRefs);

    let allPlayers: any[] = [];
    let foundChunks = false;

    chunkSnaps.forEach(snap => {
      if (snap.exists) {
        const data = snap.data();
        if (data && data.players) {
          allPlayers = allPlayers.concat(data.players);
          foundChunks = true;
        }
      }
    });

    // Si por alguna razón los chunks no existen todavía, fallback a una lectura live del top 500
    if (!foundChunks) {
      const usersSnap = await db.collection("users")
        .orderBy("totalPoints", "desc")
        .limit(500)
        .get();

      allPlayers = usersSnap.docs.map(doc => ({
        uid: doc.id,
        displayName: doc.data().displayName || 'Usuario Anónimo',
        photoURL: doc.data().photoURL || null,
        totalPoints: doc.data().totalPoints || 0
      }));
    }

    return NextResponse.json({ players: allPlayers });
  } catch (error: any) {
    console.error("API Leaderboard Error:", error);
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}
