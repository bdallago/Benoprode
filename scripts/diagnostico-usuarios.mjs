// Diagnóstico integral de usuarios - corre con: node scripts/diagnostico-usuarios.mjs
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// .env cargado via --env-file flag al invocar node
const config = JSON.parse(readFileSync(resolve(ROOT, "firebase-applet-config.json"), "utf8"));

// Init Firebase Admin
import("firebase-admin/app").then(async ({ initializeApp, cert, getApps }) => {
  const { getFirestore } = await import("firebase-admin/firestore");
  const { getAuth } = await import("firebase-admin/auth");

  let rawKey = process.env.FIREBASE_ADMIN_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "";
  rawKey = rawKey.trim();
  const firstBrace = rawKey.indexOf("{");
  const lastBrace = rawKey.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) rawKey = rawKey.substring(firstBrace, lastBrace + 1);

  // Escape literal newlines inside JSON string values (happens when .env stores the key multiline)
  const safeKey = (() => {
    let out = "";
    let inStr = false;
    for (let i = 0; i < rawKey.length; i++) {
      const ch = rawKey[i];
      if (ch === '"' && rawKey[i - 1] !== "\\") inStr = !inStr;
      if (inStr && ch === "\n") { out += "\\n"; continue; }
      if (inStr && ch === "\r") { out += "\\r"; continue; }
      out += ch;
    }
    return out;
  })();
  const serviceAccount = JSON.parse(safeKey);
  const app = initializeApp({ credential: cert(serviceAccount), projectId: config.projectId });
  const db = getFirestore(app, config.firestoreDatabaseId);
  const auth = getAuth(app);

  const SEP = "─".repeat(60);
  const ok   = (msg) => console.log(`  ✓ ${msg}`);
  const warn = (msg) => console.log(`  ⚠ ${msg}`);
  const err  = (msg) => console.log(`  ✗ ${msg}`);
  const info = (msg) => console.log(`  · ${msg}`);
  const head = (msg) => console.log(`\n${SEP}\n  ${msg}\n${SEP}`);

  console.log("\n🔍  DIAGNÓSTICO INTEGRAL DE USUARIOS\n");

  // ─── 1. CONTEOS BÁSICOS ───────────────────────────────────────────────────
  head("1. CONTEOS BÁSICOS");

  // Contar en Auth
  let totalInAuth = 0;
  let pageToken;
  const allAuthUsers = [];
  do {
    const result = await auth.listUsers(1000, pageToken);
    allAuthUsers.push(...result.users);
    pageToken = result.pageToken;
  } while (pageToken);
  totalInAuth = allAuthUsers.length;

  // Contar en Firestore
  const totalFsSnap = await db.collection("users").count().get();
  const totalInFs = totalFsSnap.data().count;

  info(`Firebase Auth:    ${totalInAuth} usuarios`);
  info(`Firestore users:  ${totalInFs} documentos`);

  if (totalInAuth === totalInFs) {
    ok("Auth y Firestore coinciden exactamente");
  } else if (totalInAuth > totalInFs) {
    err(`Hay ${totalInAuth - totalInFs} usuario(s) en Auth SIN perfil en Firestore (fantasmas)`);
  } else {
    warn(`Hay ${totalInFs - totalInAuth} doc(s) en Firestore sin cuenta Auth (huérfanos)`);
  }

  // Leer doc de estadísticas guardadas
  const statsSnap = await db.collection("estadisticas_globales").doc("actual").get();
  if (statsSnap.exists) {
    const s = statsSnap.data();
    const savedTotal = s.usuarios?.total ?? "–";
    const savedNuevos7d = s.usuarios?.nuevos7d ?? "–";
    info(`Stats doc total: ${savedTotal}  |  nuevos7d: ${savedNuevos7d}  |  calculado: ${s.actualizadoEn ?? "–"}`);
    if (typeof savedTotal === "number" && savedTotal !== totalInFs) {
      warn(`Stats doc desactualizado: dice ${savedTotal} pero Firestore tiene ${totalInFs}`);
    } else if (typeof savedTotal === "number") {
      ok("Stats doc coincide con Firestore");
    }
  } else {
    warn("No existe el doc estadisticas_globales/actual");
  }

  // ─── 2. PERFILES FANTASMA (Auth sin Firestore) ────────────────────────────
  head("2. PERFILES FANTASMA (en Auth, sin doc en Firestore)");

  const ghosts = [];
  const BATCH = 100;
  for (let i = 0; i < allAuthUsers.length; i += BATCH) {
    const chunk = allAuthUsers.slice(i, i + BATCH);
    const refs = chunk.map((u) => db.collection("users").doc(u.uid));
    const snaps = await db.getAll(...refs);
    snaps.forEach((snap, idx) => {
      if (!snap.exists) ghosts.push(chunk[idx]);
    });
  }

  if (ghosts.length === 0) {
    ok("No hay fantasmas — todos los usuarios de Auth tienen perfil en Firestore");
  } else {
    err(`${ghosts.length} fantasma(s) encontrado(s):`);
    for (const g of ghosts) {
      console.log(`    uid=${g.uid}  email=${g.email || "(sin email)"}  creado=${g.metadata?.creationTime || "?"}`);
    }
  }

  // ─── 3. PERFILES CON CAMPOS CRÍTICOS FALTANTES O MAL TIPADOS ─────────────
  head("3. CAMPOS CRÍTICOS EN PERFILES");

  const usersSnap = await db.collection("users").get();
  const profiles = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const issues = [];
  for (const p of profiles) {
    const probs = [];

    // createdAt debe ser string ISO
    if (!p.createdAt) {
      probs.push("createdAt ausente");
    } else if (typeof p.createdAt !== "string") {
      probs.push(`createdAt es ${typeof p.createdAt} (esperado string ISO)`);
    } else if (!/^\d{4}-\d{2}-\d{2}T/.test(p.createdAt)) {
      probs.push(`createdAt con formato inválido: "${p.createdAt}"`);
    }

    // lastLogin
    if (!p.lastLogin) {
      probs.push("lastLogin ausente");
    } else if (typeof p.lastLogin !== "string") {
      probs.push(`lastLogin es ${typeof p.lastLogin} (esperado string ISO)`);
    }

    // loginCount
    if (p.loginCount == null) probs.push("loginCount ausente");
    else if (typeof p.loginCount !== "number") probs.push(`loginCount es ${typeof p.loginCount}`);

    // displayNameLower
    if (!p.displayNameLower) probs.push("displayNameLower ausente (afecta búsqueda)");

    // role
    if (!p.role) probs.push("role ausente");
    else if (!["admin", "player"].includes(p.role)) probs.push(`role desconocido: "${p.role}"`);

    // totalPoints
    if (p.totalPoints == null) probs.push("totalPoints ausente");

    if (probs.length > 0) {
      issues.push({ uid: p.id, name: p.displayName || "(sin nombre)", email: p.email || "–", probs });
    }
  }

  if (issues.length === 0) {
    ok(`Los ${profiles.length} perfiles tienen todos los campos críticos correctos`);
  } else {
    warn(`${issues.length} perfil(es) con problemas de campos:`);
    for (const iss of issues) {
      console.log(`\n    uid=${iss.uid}  nombre="${iss.name}"  email=${iss.email}`);
      for (const p of iss.probs) console.log(`      · ${p}`);
    }
  }

  // ─── 4. USUARIOS RECIENTES (últimos 7 días) ───────────────────────────────
  head("4. USUARIOS REGISTRADOS EN LOS ÚLTIMOS 7 DÍAS");

  const d7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentSnap = await db.collection("users").where("createdAt", ">=", d7).get();
  const recentProfiles = recentSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  info(`${recentProfiles.length} usuario(s) registrado(s) en los últimos 7 días`);
  if (recentProfiles.length > 0) {
    for (const p of recentProfiles) {
      const loginOk = p.loginCount >= 1 ? "✓" : "✗";
      const emailOk = p.welcomeEmailSent ? "✓email" : "·email pendiente";
      console.log(`    ${loginOk} uid=${p.id}  nombre="${p.displayName || "–"}"  creado=${p.createdAt?.slice(0, 10) ?? "–"}  logins=${p.loginCount ?? 0}  ${emailOk}`);
    }
  }

  // ─── 5. LOGS DE ERROR RECIENTES (create-profile / login-activity) ─────────
  head("5. ERRORES RECIENTES EN LOGS (últimos 7 días)");

  let errorDocs = [];
  try {
    const logsSnap = await db.collection("error_logs")
      .where("timestamp", ">=", d7)
      .orderBy("timestamp", "desc")
      .limit(20)
      .get();
    errorDocs = logsSnap.docs.map((d) => d.data());
  } catch {
    // Si no hay índice, traer sin filtro de fecha
    try {
      const logsSnap = await db.collection("error_logs").orderBy("timestamp", "desc").limit(20).get();
      errorDocs = logsSnap.docs.map((d) => d.data());
    } catch {
      warn("No se pudo leer error_logs (colección inexistente o sin permisos)");
    }
  }

  if (errorDocs.length === 0) {
    ok("No hay errores recientes en error_logs");
  } else {
    const authErrors = errorDocs.filter((e) =>
      ["create-profile", "login-activity"].includes(e.context)
    );
    if (authErrors.length === 0) {
      ok(`${errorDocs.length} log(s) encontrados pero ninguno de create-profile/login-activity`);
    } else {
      err(`${authErrors.length} error(es) de autenticación/perfil encontrados:`);
      for (const e of authErrors) {
        console.log(`    [${e.context}] ${e.timestamp ?? "–"}  uid=${e.uid ?? "–"}`);
        console.log(`      ${e.message}`);
      }
    }
    const otherErrors = errorDocs.filter((e) =>
      !["create-profile", "login-activity"].includes(e.context)
    );
    if (otherErrors.length > 0) {
      info(`${otherErrors.length} error(es) de otros contextos (no relacionados al login):`);
      for (const e of otherErrors) {
        console.log(`    [${e.context ?? "–"}] ${e.timestamp ?? "–"}  ${e.message?.slice(0, 80) ?? ""}`);
      }
    }
  }

  // ─── 6. CONSISTENCIA referredBy / referralsCount ──────────────────────────
  head("6. CONSISTENCIA DE REFERIDOS");

  const referidosSnap = await db.collection("users").where("referredBy", ">", "").get();
  const referidosList = referidosSnap.docs.map((d) => d.data());

  // Agrupar por referrer
  const referrerMap = {};
  for (const r of referidosList) {
    const rid = r.referredBy;
    referrerMap[rid] = (referrerMap[rid] || 0) + 1;
  }

  let referralMismatches = 0;
  for (const [referrerId, actualCount] of Object.entries(referrerMap)) {
    const refDoc = await db.collection("users").doc(referrerId).get();
    if (!refDoc.exists) {
      warn(`Referrer ${referrerId} no existe en Firestore pero tiene ${actualCount} referido(s)`);
      referralMismatches++;
    } else {
      const stored = refDoc.data().referralsCount ?? 0;
      if (stored !== actualCount) {
        warn(`Referrer ${referrerId} (${refDoc.data().displayName}): referralsCount=${stored} pero tiene ${actualCount} referido(s) reales`);
        referralMismatches++;
      }
    }
  }

  if (referralMismatches === 0) {
    ok(`${referidosList.length} referido(s) — todos los contadores coinciden`);
  }

  // ─── RESUMEN FINAL ────────────────────────────────────────────────────────
  head("RESUMEN");
  info(`Auth: ${totalInAuth}  |  Firestore: ${totalInFs}  |  Fantasmas: ${ghosts.length}  |  Perfiles con issues: ${issues.length}  |  Recientes 7d: ${recentProfiles.length}`);

  process.exit(0);
});
