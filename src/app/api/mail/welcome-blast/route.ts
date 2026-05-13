import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { sendMail } from "../../../../lib/mailer";
import { renderWelcome } from "../../../../emails/welcome";

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY ?? process.env.FIREBASE_ADMIN_KEY ?? "";
  const serviceAccount = JSON.parse(raw);
  return initializeApp({ credential: cert(serviceAccount) });
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const idToken = authHeader.replace("Bearer ", "").trim();
    if (!idToken) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const adminApp = getAdminApp();
    const adminAuth = getAuth(adminApp);

    let uid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const adminFirestore = getFirestore(adminApp);
    const callerDoc = await adminFirestore.collection("users").doc(uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

    while (true) {
      // Only fetch users that haven't received the welcome email yet
      let q = adminFirestore
        .collection("users")
        .where("welcomeEmailSent", "!=", true)
        .limit(50);
      if (lastDoc) q = q.startAfter(lastDoc);

      const snap = await q.get();
      if (snap.empty) break;

      for (const userDoc of snap.docs) {
        const data = userDoc.data();
        const email: string = data.email ?? "";
        const displayName: string = data.displayName ?? "jugador";

        if (!email || email.endsWith("@no-email.com")) {
          skipped++;
          // Mark them so they don't appear in future runs either
          await userDoc.ref.update({ welcomeEmailSent: true }).catch(() => {});
          continue;
        }

        try {
          const { error } = await sendMail({
            to: email,
            subject: "¡Bienvenido al Prode de Beno! 🏆",
            html: renderWelcome(displayName),
          });
          if (error) throw error;
          await userDoc.ref.update({ welcomeEmailSent: true });
          sent++;
        } catch (err) {
          console.error(`welcome-blast failed for ${email}:`, err);
          failed++;
        }
      }

      lastDoc = snap.docs[snap.docs.length - 1];
      if (snap.docs.length < 50) break;
    }

    return NextResponse.json({ ok: true, sent, failed, skipped, total: sent + failed + skipped });
  } catch (err) {
    console.error("mail/welcome-blast route error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
