import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function findBenoliga() {
  const q = query(collection(db, 'leagues'), where('name', '==', 'La Benoliga'));
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data());
  });
  
  const q2 = query(collection(db, 'leagues'));
  const snapshot2 = await getDocs(q2);
  snapshot2.forEach(doc => {
    if (doc.data().name.toLowerCase().includes('benoliga')) {
      console.log('Found:', doc.id, doc.data().name);
    }
  });
}

findBenoliga();
