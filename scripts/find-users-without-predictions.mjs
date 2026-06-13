import { readFileSync } from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let envContent;
try { envContent = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8'); } catch { envContent = ''; }
const envFile = readFileSync(new URL('../.env', import.meta.url), 'utf-8') + '\n' + envContent;
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/^"|"$/g, '')]; }));

const adminKeyRaw = env.FIREBASE_ADMIN_KEY || env.FIREBASE_SERVICE_ACCOUNT_KEY;
const sa = JSON.parse(adminKeyRaw.trim());
if (getApps().length === 0) initializeApp({ credential: cert(sa), projectId: sa.project_id });

const db = getFirestore(env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || '(default)');

const usersSnap = await db.collection('users').get();
const predSnap = await db.collection('predictions').get();

const predUids = new Set(predSnap.docs.map(d => d.id));

const missing = usersSnap.docs
  .filter(d => !predUids.has(d.id))
  .map(d => ({ uid: d.id, email: d.data().email, displayName: d.data().displayName, createdAt: d.data().createdAt }))
  .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

console.log(`\nUsuarios sin documento de predicciones: ${missing.length}\n`);
missing.forEach(u => console.log(`  ${u.displayName?.padEnd(25)} ${u.email?.padEnd(35)} (creado: ${u.createdAt || 'N/A'})`));

process.exit(0);
