// Fix: cargar resultado match_39 (Uruguay 2-2 Cabo Verde) faltante en Firestore.
// La API devuelve "Cape Verde Islands" y el TEAM_MAP no lo mapeaba → el cron nunca
// escribió este resultado. El mapeo ya se corrigió; esto backfillea el dato histórico.
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

// Uruguay (teamA) 2 - 2 Cabo Verde (teamB) → empate.
const resultsRef = db.collection('results').doc('actual');
await resultsRef.update({
  'matches.match_39': { teamA: 2, teamB: 2, outcome: 'DRAW' },
  updatedAt: new Date().toISOString(),
});
console.log('match_39 cargado: Uruguay 2 - Cabo Verde 2 (DRAW)');
console.log('Nota: correr luego el recálculo de puntos (cron update-standings o recalcular-estadisticas).');
process.exit(0);
