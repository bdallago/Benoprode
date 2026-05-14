import { NextRequest, NextResponse } from "next/server";
import { recalculateAllBadges } from "@/lib/recalculate-all-badges";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await recalculateAllBadges();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron/recalculate-badges]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
