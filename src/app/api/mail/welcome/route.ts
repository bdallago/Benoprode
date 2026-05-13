import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "../../../../lib/mailer";
import { renderWelcome } from "../../../../emails/welcome";

export async function POST(req: NextRequest) {
  try {
    const { email, displayName } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "email requerido" }, { status: 400 });
    }

    const name = typeof displayName === "string" && displayName.trim() ? displayName.trim() : "jugador";

    const { error } = await sendMail({
      to: email,
      subject: "¡Bienvenido al Prode de Beno! 🏆",
      html: renderWelcome(name),
    });

    if (error) {
      console.error("sendMail welcome error:", error);
      return NextResponse.json({ error: "Error al enviar mail" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("mail/welcome route error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
