import { readFileSync } from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

let envContent;
try { envContent = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8'); } catch { envContent = ''; }
const envFile = readFileSync(new URL('../.env', import.meta.url), 'utf-8') + '\n' + envContent;
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/^"|"$/g, '')]; }));

const sa = JSON.parse((env.FIREBASE_ADMIN_KEY || env.FIREBASE_SERVICE_ACCOUNT_KEY).trim());
if (getApps().length === 0) initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore(env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || '(default)');

const snap = await db.collection('matches').get();
console.log(`Encontrados ${snap.size} documentos en matches/\n`);

const batch = db.batch();
let updated = 0;

for (const doc of snap.docs) {
  const data = doc.data();
  if (typeof data.startTime === 'string') {
    const ts = Timestamp.fromDate(new Date(data.startTime));
    batch.update(doc.ref, { startTime: ts });
    console.log(`  ${doc.id}: "${data.startTime}" → Timestamp`);
    updated++;
  } else {
    console.log(`  ${doc.id}: ya es Timestamp, ok`);
  }
}

if (updated > 0) {
  await batch.commit();
  console.log(`\n✓ ${updated} documentos actualizados.`);
} else {
  console.log('\nNada que actualizar.');
}

process.exit(0);
