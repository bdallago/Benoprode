import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendMail } from "../../../../lib/mailer";
import { renderPlayers100 } from "../../../../emails/players100";
import { renderDayBefore } from "../../../../emails/dayBefore";
import { renderFirstDate } from "../../../../emails/firstDate";
import { renderKnockouts } from "../../../../emails/knockouts";
import { renderPostFinal } from "../../../../emails/postFinal";

const CAMPAIGN_TYPES = ["players100", "dayBefore", "firstDate", "knockouts", "postFinal"] as const;
type CampaignType = typeof CAMPAIGN_TYPES[number];

function buildEmail(type: CampaignType, displayName: string): { subject: string; html: string } {
  switch (type) {
    case "players100":
      return { subject: "¡Somos 100! Gracias por ser parte desde el principio", html: renderPlayers100(displayName) };
    case "dayBefore":
      return { subject: "Mañana arranca el Mundial. ¿Cerraste tu prode? ⚽", html: renderDayBefore(displayName) };
    case "firstDate":
      return { subject: "¿Cómo te fue en la primera fecha? 📊", html: renderFirstDate(displayName) };
    case "knockouts":
      return { subject: "Se fue la fase de grupos. Arranca lo bueno 🔥", html: renderKnockouts(displayName) };
    case "postFinal":
      return { subject: "El Mundial terminó. Gracias por jugar 🏆", html: renderPostFinal(displayName) };
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const idToken = authHeader.replace("Bearer ", "").trim();
    if (!idToken) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const adminAuth = getAdminAuth();
    if (!adminAuth) return NextResponse.json({ error: "Auth no disponible" }, { status: 500 });

    let uid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const db = getAdminDb();
    if (!db) return NextResponse.json({ error: "DB no disponible" }, { status: 500 });

    const callerDoc = await db.collection("users").doc(uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { type } = await req.json();
    if (!CAMPAIGN_TYPES.includes(type)) {
      return NextResponse.json({ error: "Tipo de campaña inválido" }, { status: 400 });
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

    while (true) {
      let q = db.collection("users").orderBy("createdAt").limit(50);
      if (lastDoc) q = q.startAfter(lastDoc);

      const snap = await q.get();
      if (snap.empty) break;

      for (const userDoc of snap.docs) {
        const data = userDoc.data();

        const sentCampaigns: string[] = data.sentCampaigns ?? [];
        if (sentCampaigns.includes(type)) {
          skipped++;
          continue;
        }

        const email: string = data.email ?? "";
        const displayName: string = data.displayName ?? "jugador";

        if (!email || email.endsWith("@no-email.com")) {
          skipped++;
          continue;
        }

        try {
          const { subject, html } = buildEmail(type as CampaignType, displayName);
          const { error } = await sendMail({ to: email, subject, html });
          if (error) throw error;
          await userDoc.ref.update({ sentCampaigns: FieldValue.arrayUnion(type) });
          sent++;
        } catch (err) {
          console.error(`campaign mail failed for ${email}:`, err);
          failed++;
        }
      }

      lastDoc = snap.docs[snap.docs.length - 1];
      if (snap.docs.length < 50) break;
    }

    return NextResponse.json({ ok: true, sent, failed, skipped, total: sent + failed + skipped });
  } catch (err) {
    console.error("mail/campaign route error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
