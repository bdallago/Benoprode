
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

async function syncMatches() {
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const matchesData = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'src/lib/matches.json'), 'utf8'));

  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: config.projectId,
    });
  }

  const db = admin.firestore();
  // Ensure we use the correct database ID if specified
  const firestore = config.firestoreDatabaseId ? db.terminate().then(() => admin.firestore(admin.app(), config.firestoreDatabaseId)) : db;
  
  const targetDb = await firestore;
  const batch = targetDb.batch();

  console.log(`Sincronizando ${matchesData.length} partidos...`);

  matchesData.forEach(match => {
    const matchRef = targetDb.collection('matches').doc(match.id);
    batch.set(matchRef, {
      id: match.id,
      teamA: match.teamA,
      teamB: match.teamB,
      startTime: match.date,
      status: 'scheduled',
      updatedAt: new Date().toISOString()
    }, { merge: true });
  });

  await batch.commit();
  console.log('✅ Partidos sincronizados con éxito.');
}

syncMatches().catch(console.error);
