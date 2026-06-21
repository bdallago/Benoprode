// Compara todos los partidos finalizados en API-Football contra results/actual en Firestore
// para detectar partidos que no tienen resultado guardado.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseEnv(content) {
  return Object.fromEntries(content.split('\n').filter(l => l.includes('=')).map(l => { const [k,...v]=l.split('='); return [k.trim(), v.join('=').trim()]; }));
}
const baseEnv = parseEnv(readFileSync(join(__dirname, '../.env'), 'utf8'));
const localEnv = parseEnv(readFileSync(join(__dirname, '../.env.local'), 'utf8'));
const env = { ...baseEnv, ...Object.fromEntries(Object.entries(localEnv).filter(([,v]) => v !== '')) };

initializeApp({ credential: cert(JSON.parse(env.FIREBASE_ADMIN_KEY)) });
const db = getFirestore(env.NEXT_PUBLIC_FIREBASE_DATABASE_ID);

const require = createRequire(import.meta.url);
const matchesJson = JSON.parse(readFileSync(join(__dirname, '../src/lib/matches.json'), 'utf8'));

const TEAM_MAP = {
  "Mexico": "México", "South Korea": "Corea del Sur",
  "Czech Republic": "República Checa", "Czechia": "República Checa",
  "Canada": "Canadá", "Bosnia and Herzegovina": "Bosnia y Herzegovina",
  "Bosnia & Herzegovina": "Bosnia y Herzegovina",
  "Switzerland": "Suiza", "Brazil": "Brasil", "Morocco": "Marruecos",
  "Haiti": "Haití", "Scotland": "Escocia",
  "United States": "Estados Unidos", "USA": "Estados Unidos",
  "Turkey": "Turquía", "Türkiye": "Turquía", "Germany": "Alemania",
  "Curacao": "Curazao", "Curaçao": "Curazao",
  "Ivory Coast": "Costa de Marfil", "Côte d'Ivoire": "Costa de Marfil",
  "Netherlands": "Países Bajos", "Japan": "Japón", "Sweden": "Suecia",
  "Tunisia": "Túnez", "Belgium": "Bélgica", "Egypt": "Egipto",
  "Iran": "Irán", "New Zealand": "Nueva Zelanda", "Spain": "España",
  "Cape Verde": "Cabo Verde", "Cape Verde Islands": "Cabo Verde",
  "Saudi Arabia": "Arabia Saudita", "France": "Francia",
  "Iraq": "Irak", "Norway": "Noruega", "Algeria": "Argelia",
  "Austria": "Austria", "Jordan": "Jordania",
  "DR Congo": "República Democrática del Congo",
  "Congo DR": "República Democrática del Congo",
  "Democratic Republic of Congo": "República Democrática del Congo",
  "Uzbekistan": "Uzbekistán", "England": "Inglaterra", "Croatia": "Croacia",
  "Panama": "Panamá", "South Africa": "Sudáfrica",
  "Cape Verde Islands": "Cabo Verde",
};

const matchLookup = new Map();
for (const m of matchesJson) {
  matchLookup.set(`${m.teamA}|${m.teamB}`, { id: m.id, reversed: false });
  matchLookup.set(`${m.teamB}|${m.teamA}`, { id: m.id, reversed: true });
}

function resolveMatch(homeApi, awayApi) {
  const home = TEAM_MAP[homeApi] ?? homeApi;
  const away = TEAM_MAP[awayApi] ?? awayApi;
  return matchLookup.get(`${home}|${away}`) ?? matchLookup.get(`${away}|${home}`) ?? null;
}

// Fetch all tournament fixtures
const apiKey = env.API_FOOTBALL_KEY;
const res = await fetch(`https://v3.football.api-sports.io/fixtures?league=1&season=2026`, {
  headers: { "x-apisports-key": apiKey },
});
const json = await res.json();
const fixtures = json.response ?? [];

const FINISHED = new Set(["FT", "AET", "PEN"]);
const finished = fixtures.filter(f => FINISHED.has(f.fixture?.status?.short));

// Get current results from Firestore
const resultsSnap = await db.collection('results').doc('actual').get();
const storedMatches = resultsSnap.data()?.matches ?? {};

console.log(`Partidos finalizados en API: ${finished.length}`);
console.log(`Partidos con resultado en Firestore: ${Object.keys(storedMatches).length}\n`);

const missing = [];
const present = [];

for (const f of finished) {
  const homeApi = f.teams?.home?.name;
  const awayApi = f.teams?.away?.name;
  const resolved = resolveMatch(homeApi, awayApi);

  if (!resolved) {
    console.log(`⚠️  Sin match en data: "${homeApi}" vs "${awayApi}"`);
    continue;
  }

  const { id, reversed } = resolved;
  const goalsHome = f.goals?.home ?? 0;
  const goalsAway = f.goals?.away ?? 0;
  const teamA = reversed ? goalsAway : goalsHome;
  const teamB = reversed ? goalsHome : goalsAway;

  if (!storedMatches[id]) {
    missing.push({ id, homeApi, awayApi, teamA, teamB });
  } else {
    present.push(id);
  }
}

if (missing.length === 0) {
  console.log('✅ Todos los partidos finalizados tienen resultado en Firestore.');
} else {
  console.log(`❌ Partidos FINALIZADOS sin resultado en Firestore (${missing.length}):`);
  for (const m of missing) {
    console.log(`  ${m.id}: "${m.homeApi}" vs "${m.awayApi}" → teamA=${m.teamA} teamB=${m.teamB}`);
  }
}

process.exit(0);
