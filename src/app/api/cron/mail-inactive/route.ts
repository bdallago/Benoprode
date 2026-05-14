import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendMail } from "../../../../lib/mailer";
import { renderMissYou } from "../../../../emails/missYou";
import { recalculateAllBadges } from "@/lib/recalculate-all-badges";

const INACTIVITY_DAYS = 7;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "DB no disponible" }, { status: 500 });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - INACTIVITY_DAYS);
  const cutoffISO = cutoff.toISOString();

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  while (true) {
    // Query users inactive for more than INACTIVITY_DAYS — orderBy on same field avoids composite index
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

      // Only send once per user
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
        console.error(`mail-inactive failed for ${email}:`, err);
        failed++;
      }
    }

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.docs.length < 50) break;
  }

  console.log(`mail-inactive cron: sent=${sent} failed=${failed} skipped=${skipped}`);

  // Recalculate badges for all users — awaited so Vercel doesn't kill it before completion
  try {
    const badgeResult = await recalculateAllBadges();
    console.log(`badge recalc: processed=${badgeResult.processed} updated=${badgeResult.updated}`);
  } catch (e) {
    console.error("[mail-inactive] badge recalc failed:", e);
  }

  return NextResponse.json({ ok: true, sent, failed, skipped });
}
