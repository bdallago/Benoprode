import { readFileSync } from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const uid = process.argv[2];
if (!uid) { console.error('Uso: node scripts/check-matches-detail.mjs <uid>'); process.exit(1); }

let envContent;
try { envContent = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8'); } catch { envContent = ''; }
const envFile = readFileSync(new URL('../.env', import.meta.url), 'utf-8') + '\n' + envContent;
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/^"|"$/g, '')]; }));

const sa = JSON.parse((env.FIREBASE_ADMIN_KEY || env.FIREBASE_SERVICE_ACCOUNT_KEY).trim());
if (getApps().length === 0) initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore(env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || '(default)');

// Load matches.json to know total matches
const matchesData = JSON.parse(readFileSync(new URL('../src/lib/matches.json', import.meta.url), 'utf-8'));

const pred = await db.collection('predictions').doc(uid).get();
const savedMatches = pred.data()?.matches || {};
const savedIds = new Set(Object.keys(savedMatches));

console.log(`\nTotal partidos en matches.json: ${matchesData.length}`);
console.log(`Total guardados en Firestore:   ${savedIds.size}`);

const missing = matchesData.filter(m => !savedIds.has(m.id));
console.log(`\nPartidos NO guardados (${missing.length}):`);
missing.forEach(m => console.log(`  ${m.id}  ${m.teamA} vs ${m.teamB}  ${new Date(m.date).toLocaleString('es-AR', {timeZone:'America/Argentina/Buenos_Aires'})}`));

// Check Firestore matches collection for startTime docs
console.log(`\nVerificando colección matches/ en Firestore...`);
const matchesSnap = await db.collection('matches').limit(5).get();
if (matchesSnap.empty) {
  console.log('  (colección matches/ vacía o no existe)');
} else {
  console.log(`  ${matchesSnap.size} docs encontrados (muestra):`);
  matchesSnap.docs.forEach(d => console.log(`  ${d.id}:`, JSON.stringify(d.data())));
}

process.exit(0);
