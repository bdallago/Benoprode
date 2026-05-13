import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendMail } from "../../../../lib/mailer";
import { renderMissYou } from "../../../../emails/missYou";

const INACTIVITY_DAYS = 7;

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

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - INACTIVITY_DAYS);
    const cutoffISO = cutoff.toISOString();

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

    while (true) {
      let q = db
        .collection("users")
        .where("lastLogin", "<", cutoffISO)
        .orderBy("lastLogin")
        .limit(50);
      if (lastDoc) q = q.startAfter(lastDoc);

      const snap = await q.get();
      if (snap.empty) break;

      for (const userDoc of snap.docs) {
        const data = userDoc.data();

        const sentCampaigns: string[] = data.sentCampaigns ?? [];
        if (sentCampaigns.includes("missYou")) {
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
          const { error } = await sendMail({
            to: email,
            subject: "Hace un tiempo que no te vemos por el Prode ⚽",
            html: renderMissYou(displayName),
          });
          if (error) throw error;
          await userDoc.ref.update({ sentCampaigns: FieldValue.arrayUnion("missYou") });
          sent++;
        } catch (err) {
          console.error(`mail-inactive admin failed for ${email}:`, err);
          failed++;
        }
      }

      lastDoc = snap.docs[snap.docs.length - 1];
      if (snap.docs.length < 50) break;
    }

    return NextResponse.json({ ok: true, sent, failed, skipped });
  } catch (err) {
    console.error("mail/inactive route error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
