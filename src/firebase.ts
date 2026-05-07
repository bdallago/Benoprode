import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore, 
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize the app once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize with settings and correct database ID from config.
const dbId = (firebaseConfig as typeof firebaseConfig & { firestoreDatabaseId?: string }).firestoreDatabaseId || "(default)";

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true
}, dbId);

export const auth = getAuth(app);
export const storage = getStorage(app);
storage.maxUploadRetryTime = 10000;

export const googleProvider = new GoogleAuthProvider();
