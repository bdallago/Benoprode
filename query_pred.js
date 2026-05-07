import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  console.log("Checking users...");
  const u = query(collection(db, "users"), limit(5));
  const usnap = await getDocs(u);
  usnap.forEach(doc => {
    console.log("User:", doc.id, "createdAt:", doc.data().createdAt, "lastLogin:", doc.data().lastLogin, "loginCount:", doc.data().loginCount);
  });
  console.log("Checking predictions...");
  const p = query(collection(db, "predictions"), limit(5));
  const psnap = await getDocs(p);
  psnap.forEach(doc => {
    const d = doc.data();
    console.log(doc.id, "=> data keys:", Object.keys(d));
    if (d.groups) {
      console.log("groups keys count:", Object.keys(d.groups).length, "keys:", Object.keys(d.groups));
      // check if array or what
      if(Object.keys(d.groups).length > 0) {
          const firstKey = Object.keys(d.groups)[0];
          console.log("groups example item:", firstKey, d.groups[firstKey]);
      }
    } else {
      console.log("groups: none");
    }
    console.log("matches count:", d.matches ? Object.keys(d.matches).length : 0);
    console.log("specials count:", d.specials ? Object.keys(d.specials).length : 0);
    console.log("isLocked:", d.isLocked);
  });
  process.exit(0);
}
run();
