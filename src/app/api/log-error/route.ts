import { NextResponse } from "next/server";
import { logError } from "@/lib/error-logger";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.message !== "string" || !body.message.trim()) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await logError({
      message: body.message.slice(0, 2000),
      stack: typeof body.stack === "string" ? body.stack.slice(0, 5000) : undefined,
      context: typeof body.context === "string" ? body.context.slice(0, 100) : "client",
      uid: typeof body.uid === "string" ? body.uid.slice(0, 128) : undefined,
      extra: body.extra && typeof body.extra === "object" && !Array.isArray(body.extra)
        ? body.extra
        : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
