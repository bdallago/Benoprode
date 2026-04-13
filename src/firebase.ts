import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize storage and set a short max retry time so it doesn't hang forever on permission errors
export const storage = getStorage(app);
storage.maxUploadRetryTime = 10000; // 10 seconds max retry

export const googleProvider = new GoogleAuthProvider();
