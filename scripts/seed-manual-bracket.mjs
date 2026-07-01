/**
 * One-shot: siembra el cuadro KO manual en results/actual (PRODUCCIÓN).
 * - Reescribe los 16 slots R32 con el orden correcto (no cambia equipos, solo el slot).
 * - Setea bracketKickoffs de R16..F con los horarios confirmados.
 * - Reconstruye koSchedule para los slots con ambos equipos definidos.
 * - NO toca groups, finishedGroups, specials ni knockouts existentes.
 * Self-contained (Benoprode no usa tsx en scripts): inlinea la adyacencia del cuadro.
 * Debe quedar en sync con src/lib/bracket/manualBracket.ts + tree.ts.
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually
const envContent = readFileSync(join(__dirname, "../.env"), "utf8");
const envVars = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
}
const sa = JSON.parse(envVars.FIREBASE_ADMIN_KEY);

// Load .env.local for databaseId
let databaseId = "(default)";
try {
  const localContent = readFileSync(join(__dirname, "../.env.local"), "utf8");
  for (const line of localContent.split("\n")) {
    const m = line.match(/^NEXT_PUBLIC_FIREBASE_DATABASE_ID=(.+)$/);
    if (m) { databaseId = m[1].trim(); break; }
  }
} catch {}

const app = initializeApp({ credential: cert(sa) });
const db = getFirestore(app, databaseId);

// --- Cuadro KO manual (en sync con manualBracket.ts) ---
const R32_ACTUAL_MATCHUPS = {
  "R32-1":  ["Sudáfrica", "Canadá"],
  "R32-2":  ["Países Bajos", "Marruecos"],
  "R32-3":  ["Alemania", "Paraguay"],
  "R32-4":  ["Francia", "Suecia"],
  "R32-5":  ["Portugal", "Croacia"],
  "R32-6":  ["España", "Austria"],
  "R32-7":  ["Estados Unidos", "Bosnia y Herzegovina"],
  "R32-8":  ["Bélgica", "Senegal"],
  "R32-9":  ["Brasil", "Japón"],
  "R32-10": ["Costa de Marfil", "Noruega"],
  "R32-11": ["México", "Ecuador"],
  "R32-12": ["Inglaterra", "República Democrática del Congo"],
  "R32-13": ["Argentina", "Cabo Verde"],
  "R32-14": ["Australia", "Egipto"],
  "R32-15": ["Suiza", "Argelia"],
  "R32-16": ["Colombia", "Ghana"],
};

const KO_KICKOFFS = {
  "R16-1": Date.UTC(2026, 6, 4, 17, 0),
  "R16-2": Date.UTC(2026, 6, 4, 21, 0),
  "R16-3": Date.UTC(2026, 6, 6, 19, 0),
  "R16-4": Date.UTC(2026, 6, 7, 0, 0),
  "R16-5": Date.UTC(2026, 6, 5, 20, 0),
  "R16-6": Date.UTC(2026, 6, 6, 0, 0),
  "R16-7": Date.UTC(2026, 6, 7, 16, 0),
  "R16-8": Date.UTC(2026, 6, 7, 20, 0),
  "QF-1":  Date.UTC(2026, 6, 9, 20, 0),
  "QF-2":  Date.UTC(2026, 6, 10, 19, 0),
  "QF-3":  Date.UTC(2026, 6, 11, 21, 0),
  "QF-4":  Date.UTC(2026, 6, 12, 1, 0),
  "SF-1":  Date.UTC(2026, 6, 14, 19, 0),
  "SF-2":  Date.UTC(2026, 6, 15, 19, 0),
  "F":     Date.UTC(2026, 6, 19, 19, 0),
};

// Adyacencia estándar single-elimination (idéntica a tree.ts).
function buildTree() {
  const slots = [];
  const push = (round, count, prevPrefix, prevCount) => {
    for (let i = 1; i <= count; i++) {
      const id = count === 1 ? "F" : `${round}-${i}`;
      const sources = prevPrefix
        ? [
            prevCount === 1 ? prevPrefix : `${prevPrefix}-${2 * i - 1}`,
            prevCount === 1 ? prevPrefix : `${prevPrefix}-${2 * i}`,
          ]
        : [];
      slots.push({ id, round, sources });
    }
  };
  push("R32", 16, null, 0);
  push("R16", 8, "R32", 16);
  push("QF", 4, "R16", 8);
  push("SF", 2, "QF", 4);
  push("F", 1, "SF", 2);
  return slots;
}
const TREE = buildTree();

function propagateWinners(matchups, winners) {
  const result = { ...matchups };
  for (const slot of TREE) {
    if (slot.sources.length !== 2) continue;
    const [s1, s2] = slot.sources;
    const w1 = winners[s1];
    const w2 = winners[s2];
    if (w1 && w2) result[slot.id] = [w1, w2];
  }
  return result;
}

const roundOf = (id) => (id === "F" ? "F" : id.split("-")[0]);

function buildManualKoSchedule(matchups, kickoffs) {
  const out = {};
  for (const [slotId, pair] of Object.entries(matchups)) {
    const kickoff = kickoffs[slotId];
    if (kickoff == null) continue;
    const [teamA, teamB] = pair;
    if (!teamA || !teamB) continue;
    out[slotId] = {
      fixtureId: slotId,
      round: roundOf(slotId),
      teamA, teamB,
      date: new Date(kickoff).toISOString(),
      statusCode: "NS",
      goalsA: null,
      goalsB: null,
    };
  }
  return out;
}

async function main() {
  console.log(`Seed manual bracket → databaseId: ${databaseId}`);
  const ref = db.collection("results").doc("actual");
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};

  const winners = data.knockouts || {};
  const baseMatchups = { ...(data.bracketMatchups || {}), ...R32_ACTUAL_MATCHUPS };
  const matchups = propagateWinners(baseMatchups, winners);
  const bracketKickoffs = { ...(data.bracketKickoffs || {}), ...KO_KICKOFFS };
  const koSchedule = buildManualKoSchedule(matchups, KO_KICKOFFS);

  await ref.set({ bracketMatchups: matchups, bracketKickoffs, koSchedule }, { merge: true });

  console.log("Seed OK");
  console.log("  R32 slots:", Object.keys(R32_ACTUAL_MATCHUPS).length);
  console.log("  koSchedule rows:", Object.keys(koSchedule).length);
  console.log("  matchups slots:", Object.keys(matchups).length);
  process.exit(0);
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
