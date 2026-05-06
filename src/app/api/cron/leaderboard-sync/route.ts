import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(req: Request) {
  // Verificación básica de seguridad para el Cron
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "DB Error" }, { status: 500 });

  try {
    // 1. Obtener los mejores 10.000 jugadores (lectura masiva controlada)
    const snapshot = await db.collection("users")
      .orderBy("totalPoints", "desc")
      .limit(10000)
      .get();

    const allPlayers = snapshot.docs.map(doc => ({
      uid: doc.id,
      displayName: doc.data().displayName || "Anónimo",
      photoURL: doc.data().photoURL || null,
      totalPoints: doc.data().totalPoints || 0
    }));

    // 2. Dividirlos en 4 chunks de 2.500
    const chunkSize = 2500;
    const batch = db.batch();
    
    for (let i = 0; i < 4; i++) {
       const start = i * chunkSize;
       const chunkData = allPlayers.slice(start, start + chunkSize);
       const chunkRef = db.collection("system_stats").doc(`leaderboard_chunk_${i + 1}`);
       batch.set(chunkRef, { 
         players: chunkData,
         updatedAt: new Date().toISOString(),
         chunkIndex: i + 1
       });
    }

    // Guardar metadata para saber cuántos hay en total
    batch.set(db.collection("system_stats").doc("leaderboard_meta"), {
      totalCalculated: allPlayers.length,
      lastUpdate: new Date().toISOString()
    });

    await batch.commit();

    return NextResponse.json({ success: true, processed: allPlayers.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
