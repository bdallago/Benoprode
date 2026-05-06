import { initializeApp, applicationDefault, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

let cachedDb: any = null;
let cachedConfig: any = null;

export function getAdminDb() {
  if (cachedDb) return cachedDb;

  const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  if (!cachedConfig) {
    if (!fs.existsSync(configPath)) {
      console.error("Firebase Admin Error: config not found at", configPath);
      return null;
    }
    cachedConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  }
  
  const config = cachedConfig;
  const dbId = config.firestoreDatabaseId;

  if (getApps().length === 0) {
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        let rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
        
        // Log basic info for debugging (not the key itself)
        console.log(`Firebase Admin: Key length=${rawKey.length}, startsWith=${rawKey.substring(0, 10).replace(/\n/g, "\\n")}...`);

        // Si por error se pegó con backticks de markdown o comillas
        if (rawKey.startsWith("```")) {
          rawKey = rawKey.replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim();
        }
        
        // Si el usuario por error puso comillas alrededor de todo el bardo
        if (rawKey.startsWith('"') && rawKey.endsWith('"')) {
           rawKey = rawKey.slice(1, -1).trim();
        }

        // Intentar encontrar el primer { y el último } por si hay basura alrededor (como "JSON: { ... }")
        const firstBrace = rawKey.indexOf("{");
        const lastBrace = rawKey.lastIndexOf("}");
        
        if (firstBrace !== -1 && lastBrace !== -1) {
          rawKey = rawKey.substring(firstBrace, lastBrace + 1);
          // Re-limpiar por si el substring dejó algo raro
          rawKey = rawKey.trim();
        } else if (rawKey.includes('"type": "service_account"')) {
          // Si el usuario omitió las llaves por error
          rawKey = "{" + rawKey + "}";
        }
        
        // Manejar escapes de saltos de línea si se pegó de forma que se escaparon
        // A veces el prompt de secrets puede meter ruido
        try {
          const serviceAccount = JSON.parse(rawKey);
          credential = cert(serviceAccount);
        } catch (innerError) {
          // Si falló el primer parse, intentar limpiar escapes literales de \n
          // (a veces pasa si se copia mal el JSON con saltos de línea literales)
          const cleanedKey = rawKey.replace(/\\n/g, "\n");
          try {
             const serviceAccount = JSON.parse(cleanedKey);
             credential = cert(serviceAccount);
          } catch (e) {
             throw innerError; // Lanza el error original si la limpieza extra no sirvió
          }
        }
      } catch (e) {
        console.error("Firebase Admin Error: Failed to parse service account key from ENV. Check for trailing characters.", e);
        return null;
      }
    } else {
      console.warn("Firebase Admin Warning: FIREBASE_SERVICE_ACCOUNT_KEY not found, using applicationDefault. This might cause PERMISSION_DENIED for non-default databases.");
      credential = applicationDefault();
    }
    
    const app = initializeApp({
      credential,
      projectId: config.projectId,
    });
    console.log("Firebase Admin Initialized for DB ID:", dbId);
    cachedDb = getFirestore(app, dbId);
    return cachedDb;
  } else {
    const app = getApps()[0];
    cachedDb = getFirestore(app, dbId);
    return cachedDb;
  }
}
