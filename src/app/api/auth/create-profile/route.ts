import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { logError } from "@/lib/error-logger";
import { sendMail } from "@/lib/mailer";
import { renderWelcome } from "@/emails/welcome";
import { FieldValue } from "firebase-admin/firestore";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const adminAuth = getAdminAuth();
  if (!db || !adminAuth) return NextResponse.json({ error: "Server not available" }, { status: 500 });

  // Verify token and get uid
  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Idempotency check — if profile already exists, do nothing
  const userRef = db.collection("users").doc(uid);
  const existing = await userRef.get();
  if (existing.exists) {
    return NextResponse.json({ created: false, alreadyExisted: true });
  }

  // Fetch full user info from Auth (displayName, email, photoURL)
  let authUser: Awaited<ReturnType<typeof adminAuth.getUser>>;
  try {
    authUser = await adminAuth.getUser(uid);
  } catch {
    return NextResponse.json({ error: "Auth user not found" }, { status: 404 });
  }

  const { referralId } = await req.json().catch(() => ({ referralId: null }));

  const displayName = authUser.displayName || "Usuario";
  const email = authUser.email || `${uid}@no-email.com`;
  const photoURL = authUser.photoURL || "";
  const isAdmin = email.toLowerCase() === ADMIN_EMAIL;
  const role = isAdmin ? "admin" : "player";
  const todayStr = new Date().toISOString().split("T")[0];

  // Create profile — Admin SDK bypasses Firestore rules, no silent failures possible
  try {
    await userRef.set({
      uid,
      displayName,
      displayNameLower: displayName.toLowerCase(),
      email,
      photoURL,
      role,
      totalPoints: 0,
      referralsCount: 0,
      referredBy: referralId || null,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      activeDays: [todayStr],
      loginCount: 1,
      tourCompleted: false,
      chatWarnings: 0,
      isChatBanned: false,
      welcomeEmailSent: false,
    });
  } catch (e) {
    await logError({
      message: "create-profile: Firestore set failed",
      stack: e instanceof Error ? e.stack : String(e),
      context: "create-profile",
      uid,
    });
    return NextResponse.json({ error: "Profile creation failed" }, { status: 500 });
  }

  // Send welcome email (fire-and-forget — never fail the profile creation because of mail)
  if (email && !email.endsWith("@no-email.com")) {
    sendMail({
      to: email,
      subject: "¡Bienvenido al Prode de Beno! 🏆",
      html: renderWelcome(displayName),
    })
      .then(() => userRef.update({ welcomeEmailSent: true }))
      .catch((e) => console.warn("[create-profile] Welcome email failed:", e));
  }

  // Increment referrer's referralsCount if valid referral
  if (referralId && referralId !== uid) {
    try {
      const referrerRef = db.collection("users").doc(referralId);
      const referrerSnap = await referrerRef.get();
      if (referrerSnap.exists) {
        await referrerRef.update({ referralsCount: FieldValue.increment(1) });
      } else {
        console.warn(`[create-profile] Referrer ${referralId} not found in Firestore.`);
      }
    } catch (e) {
      console.error("[create-profile] Failed to increment referrer count:", e);
    }
  }

  return NextResponse.json({ created: true, alreadyExisted: false });
}
