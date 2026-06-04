// Migración: reemplaza teamA/teamB vacíos ('') por 0 en todas las predicciones
// Corre con: node --env-file=.env.local scripts/migrar-scores-vacios.mjs
// Agrega --dry-run para solo ver qué cambiaría sin escribir nada
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DRY_RUN = process.argv.includes("--dry-run");

const config = JSON.parse(readFileSync(resolve(ROOT, "firebase-applet-config.json"), "utf8"));

import("firebase-admin/app").then(async ({ initializeApp, cert }) => {
  const { getFirestore } = await import("firebase-admin/firestore");

  let rawKey = process.env.FIREBASE_ADMIN_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "";
  rawKey = rawKey.trim();
  const firstBrace = rawKey.indexOf("{");
  const lastBrace = rawKey.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) rawKey = rawKey.substring(firstBrace, lastBrace + 1);

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

  console.log(`\n${DRY_RUN ? "🔍  DRY RUN — no se escribe nada" : "✏️   MIGRACIÓN EN CURSO"}\n`);

  const snapshot = await db.collection("predictions").get();
  console.log(`📋  Documentos encontrados: ${snapshot.size}\n`);

  let totalUsers = 0;
  let totalMatches = 0;
  let totalFixed = 0;

  const BATCH_SIZE = 400;
  let batch = db.batch();
  let batchCount = 0;

  const flushBatch = async () => {
    if (batchCount === 0) return;
    if (!DRY_RUN) await batch.commit();
    batch = db.batch();
    batchCount = 0;
  };

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const matches = data.matches;
    if (!matches || typeof matches !== "object") continue;

    totalUsers++;
    const updatedMatches = {};
    let docChanged = false;

    for (const [matchId, pred] of Object.entries(matches)) {
      if (!pred || typeof pred !== "object") continue;
      totalMatches++;

      let { teamA, teamB, outcome } = pred;
      let changed = false;

      if (teamA === "") { teamA = 0; changed = true; }
      if (teamB === "") { teamB = 0; changed = true; }

      // Re-derive outcome from normalized scores if it was missing
      if (!outcome && typeof teamA === "number" && typeof teamB === "number") {
        if (teamA > teamB) outcome = "A";
        else if (teamA < teamB) outcome = "B";
        else outcome = "DRAW";
        changed = true;
      }

      updatedMatches[matchId] = { ...pred, teamA, teamB, outcome };
      if (changed) {
        totalFixed++;
        docChanged = true;
        console.log(`  ${docSnap.id.slice(0, 8)}…  ${matchId}  teamA=${pred.teamA === "" ? '""' : pred.teamA} → ${teamA}  teamB=${pred.teamB === "" ? '""' : pred.teamB} → ${teamB}  outcome=${pred.outcome || "(vacío)"} → ${outcome}`);
      }
    }

    if (docChanged) {
      batch.update(docSnap.ref, { matches: updatedMatches });
      batchCount++;
      if (batchCount >= BATCH_SIZE) await flushBatch();
    }
  }

  await flushBatch();

  console.log(`\n──────────────────────────────────────────`);
  console.log(`Usuarios procesados : ${totalUsers}`);
  console.log(`Partidos evaluados  : ${totalMatches}`);
  console.log(`Campos corregidos   : ${totalFixed}`);
  console.log(DRY_RUN ? "\nNo se realizó ningún cambio (--dry-run)." : "\n✅  Migración completada.");
  process.exit(0);
});
