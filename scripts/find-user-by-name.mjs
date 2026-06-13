import { readFileSync } from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const name = process.argv[2]?.toLowerCase();
if (!name) { console.error('Uso: node scripts/find-user-by-name.mjs <nombre>'); process.exit(1); }

let envContent;
try { envContent = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8'); } catch { envContent = ''; }
const envFile = readFileSync(new URL('../.env', import.meta.url), 'utf-8') + '\n' + envContent;
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/^"|"$/g, '')]; }));

const sa = JSON.parse((env.FIREBASE_ADMIN_KEY || env.FIREBASE_SERVICE_ACCOUNT_KEY).trim());
if (getApps().length === 0) initializeApp({ credential: cert(sa), projectId: sa.project_id });

const db = getFirestore(env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || '(default)');

const snap = await db.collection('users').get();
const matches = snap.docs.filter(d => d.data().displayName?.toLowerCase().includes(name));

for (const u of matches) {
  const data = u.data();
  console.log(`\n=== users/${u.id} ===`);
  console.log(`  displayName: ${data.displayName}`);
  console.log(`  email:       ${data.email}`);
  console.log(`  createdAt:   ${data.createdAt}`);

  const pred = await db.collection('predictions').doc(u.id).get();
  if (pred.exists) {
    const p = pred.data();
    console.log(`  predictions: isLocked=${p.isLocked}, updatedAt=${p.updatedAt}, matches=${Object.keys(p.matches || {}).length}`);
  } else {
    console.log(`  predictions: SIN DOCUMENTO`);
  }
}

if (matches.length === 0) console.log('No se encontró ningún usuario con ese nombre.');
process.exit(0);
