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
    // 1. Obtener los mejores 1000 jugadores (suficiente para carga inmediata)
    const snapshot = await db.collection("users")
      .orderBy("totalPoints", "desc")
      .limit(1000)
      .get();

    const allPlayers = snapshot.docs.map(doc => ({
      uid: doc.id,
      displayName: doc.data().displayName || "Anónimo",
      photoURL: doc.data().photoURL || null,
      totalPoints: doc.data().totalPoints || 0
    }));

    // 2. Guardar el "Top 1000" en un solo documento para máxima velocidad de lectura
    const statsRef = db.collection("system_stats").doc("leaderboard_top_1000");
    await statsRef.set({
      players: allPlayers,
      updatedAt: new Date().toISOString(),
      count: allPlayers.length
    });

    // 3. (Opcional/Backup) Guardar el desglose por chunks de 2500 para el resto
    const fullSnapshot = await db.collection("users")
      .orderBy("totalPoints", "desc")
      .limit(5000)
      .get();
    
    const chunkPlayers = fullSnapshot.docs.map(doc => ({
      uid: doc.id,
      displayName: doc.data().displayName || "Anónimo",
      photoURL: doc.data().photoURL || null,
      totalPoints: doc.data().totalPoints || 0
    }));

    const batch = db.batch();
    const chunkSize = 2500;
    for (let i = 0; i < 2; i++) {
       const start = i * chunkSize;
       const chunkData = chunkPlayers.slice(start, start + chunkSize);
       const chunkRef = db.collection("system_stats").doc(`leaderboard_chunk_${i + 1}`);
       batch.set(chunkRef, { 
         players: chunkData,
         updatedAt: new Date().toISOString()
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
