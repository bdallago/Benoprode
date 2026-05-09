import { NextResponse } from "next/server";
import axios from "axios";

export async function GET() {
  if (!process.env.API_FOOTBALL_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }
  try {
    const response = await axios.get("https://v3.football.api-sports.io/standings", {
      params: { league: 1, season: 2026 },
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY },
      timeout: 10000,
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("Standings fetch error:", error.message);
    return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
  }
}
