import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(req: Request) {
  // Verificación de seguridad mínima (podés agregar headers Authorization)
  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "DB Error" }, { status: 500 });

  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const testMode = searchParams.get('testLive') === 'true';

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API_FOOTBALL_KEY no está configurada en .env" }, { status: 500 });
  }

  const RATE_LIMIT_MS = 30_000;
  const rateLimitRef = db.collection("system_stats").doc("sync_rate_limit");
  try {
    const snap = await rateLimitRef.get();
    if (snap.exists) {
      const lastCalledAt: string | undefined = snap.data()?.lastCalledAt;
      if (lastCalledAt) {
        const elapsed = Date.now() - new Date(lastCalledAt).getTime();
        if (elapsed < RATE_LIMIT_MS) {
          const retryAfterSeconds = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000);
          return NextResponse.json(
            { error: "Rate limited", retryAfterSeconds },
            { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
          );
        }
      }
    }
    await rateLimitRef.set({ lastCalledAt: new Date().toISOString() }, { merge: true });
  } catch (e) {
    console.warn("Rate limit check failed, proceeding:", e);
  }

  try {
    // Si estamos en modo de prueba, buscamos partidos en vivo (cualquier liga) para testear
    // Si no, buscamos los del mundial 2026
    const endpoint = testMode 
      ? 'https://v3.football.api-sports.io/fixtures?live=all' 
      // ID 1 es el Mundial (World Cup) en API-Football. Temporada 2026.
      : 'https://v3.football.api-sports.io/fixtures?league=1&season=2026';

    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-apisports-key': apiKey
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: "API Football error", details: errorText }, { status: 500 });
    }

    const data = await res.json();
    
    // Aquí procesamos la respuesta de la API.
    // La API de API-Football devuelve los partidos en la propiedad 'response'.
    const fixtures = data.response || [];
    
    const batch = db.batch();
    const updateLogs: any[] = [];

    // Por seguridad, si es testMode NO guardamos en donde están jugando tus amigos, 
    // sino en una colección aislada llamada "test_api_football" para que veas que funciona.
    const collectionName = testMode ? "test_api_football" : "matches";

    fixtures.forEach((item: any) => {
      // item.fixture -> info del partido (id, status, referee, etc)
      // item.teams -> info de los equipos
      // item.goals -> goles
      // item.events -> (si trajéramos eventos) tarjetas, goleadores, etc.
      
      const fixtureId = item.fixture.id.toString();
      const matchRef = db.collection(collectionName).doc(fixtureId);
      
      const matchUpdate = {
        api_fixture_id: fixtureId,
        date: item.fixture.date,
        statusLabel: item.fixture.status.long,
        statusCode: item.fixture.status.short, // ej: "1H", "HT", "2H", "FT"
        elapsed: item.fixture.status.elapsed,
        team_home: item.teams.home.name,
        team_away: item.teams.away.name,
        goals_home: item.goals.home !== null ? item.goals.home : 0,
        goals_away: item.goals.away !== null ? item.goals.away : 0,
        updatedAt: new Date().toISOString()
      };

      updateLogs.push(matchUpdate);
      batch.set(matchRef, matchUpdate, { merge: true });
    });

    // Ejecutamos la inserción a Firebase
    await batch.commit();

    return NextResponse.json({ 
      success: true, 
      testMode,
      message: testMode 
        ? "Se sincronizaron partidos globales EN VIVO como prueba (No impactó a los usuarios)." 
        : "Sincronización del Mundial 2026 completada.",
      fixturesConfigured: fixtures.length,
      sample: updateLogs.slice(0, 5) // Muestra hasta 5 partidos para no saturar el log
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
