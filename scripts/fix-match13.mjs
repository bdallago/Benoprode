// Fix: cargar resultado match_13 (España vs Cabo Verde 0-0) faltante en Firestore
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseEnv(content) {
  return Object.fromEntries(content.split('\n').filter(l => l.includes('=')).map(l => { const [k,...v]=l.split('='); return [k.trim(), v.join('=').trim()]; }));
}
const baseEnv = parseEnv(readFileSync(join(__dirname, '../.env'), 'utf8'));
const localEnv = parseEnv(readFileSync(join(__dirname, '../.env.local'), 'utf8'));
const env = { ...baseEnv, ...Object.fromEntries(Object.entries(localEnv).filter(([,v]) => v !== '')) };

initializeApp({ credential: cert(JSON.parse(env.FIREBASE_ADMIN_KEY)) });
const db = getFirestore(env.NEXT_PUBLIC_FIREBASE_DATABASE_ID);

// España vs Cabo Verde: 0-0 → teamA=0 teamB=0, outcome=DRAW
const resultsRef = db.collection('results').doc('actual');
await resultsRef.update({
  'matches.match_13': { teamA: 0, teamB: 0, outcome: 'DRAW' },
  updatedAt: new Date().toISOString(),
});
console.log('match_13 cargado: España 0 - Cabo Verde 0');
process.exit(0);
