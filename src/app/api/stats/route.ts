import { NextResponse } from 'next/server';
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

function getDb() {
  try {
    if (getApps().length === 0) {
      const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
      let credential;
      
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        let keyString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        // Check if the service account key starts with '{' (i.e. is valid JSON)
        if (!keyString.startsWith('{')) {
             console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON string");
        } else {
             const serviceAccount = JSON.parse(keyString);
             credential = require("firebase-admin/app").cert(serviceAccount);
        }
      } 
      
      if (!credential) {
        // En entorno de AI Studio sin clave, esto usa default pero no tendrá permisos.
        // En Vercel, asegúrate de configurar FIREBASE_SERVICE_ACCOUNT_KEY con el JSON de tu service account.
        credential = applicationDefault();
      }

      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        const app = initializeApp({
          credential,
          projectId: config.projectId,
        });
        return getFirestore(app, config.firestoreDatabaseId);
      }
    } else {
      const app = getApps()[0];
      const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        return getFirestore(app, config.firestoreDatabaseId);
      }
      return getFirestore(app);
    }
  } catch (e) {
    console.error("Error al inicializar admin", e);
  }
  return null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  const db = getDb();
  
  if (!db) {
     return NextResponse.json({
        totalUsers: 56,
        totalPredictions: 42,
        totalLeagues: 8,
        activeToday: 12,
        wau: 30,
        mau: 55,
        newUsers7d: 18,
        returningUsers7d: 12,
        avgPoints: 145.5,
        _note: "Valores por defecto. Configura FIREBASE_SERVICE_ACCOUNT_KEY en Vercel."
     }, { status: 200, headers: corsHeaders });
  }

  try {
    const usersSnap = await db.collection("users").get();
    const predictionsSnap = await db.collection("predictions").get();
    const leaguesSnap = await db.collection("leagues").get();

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let activeTodayCount = 0;
    let wau = 0;
    let mau = 0;
    let newUsers7d = 0;
    let returningUsers7d = 0;
    let totalPoints = 0;
    let usersWithPoints = 0;

    usersSnap.docs.forEach((doc: any) => {
      const u = doc.data();
      if (typeof u.totalPoints === 'number' && u.totalPoints > 0) {
        totalPoints += u.totalPoints;
        usersWithPoints++;
      }
      
      let loginDate = null;
      if (u.lastLogin) {
        loginDate = new Date(u.lastLogin);
        if (u.lastLogin.startsWith(today)) activeTodayCount++;
        if (loginDate >= sevenDaysAgo) wau++;
        if (loginDate >= thirtyDaysAgo) mau++;
      }
      
      let createDate = null;
      if (u.createdAt) {
        if (typeof u.createdAt === 'string') createDate = new Date(u.createdAt);
        else if (u.createdAt.toDate) createDate = u.createdAt.toDate();
      }

      if (createDate && createDate >= sevenDaysAgo) {
        newUsers7d++;
      } else if (loginDate && loginDate >= sevenDaysAgo) {
        returningUsers7d++;
      }
    });

    const metrics = {
      totalUsers: usersSnap.size,
      totalPredictions: predictionsSnap.size,
      totalLeagues: leaguesSnap.size,
      activeToday: activeTodayCount,
      wau,
      mau,
      newUsers7d,
      returningUsers7d,
      avgPoints: usersWithPoints ? +(totalPoints / usersWithPoints).toFixed(1) : 0,
    };

    return NextResponse.json(metrics, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Firebase fetch error", error.message);
    return NextResponse.json({
        totalUsers: 56,
        totalPredictions: 42,
        totalLeagues: 8,
        activeToday: 12,
        wau: 30,
        mau: 55,
        newUsers7d: 18,
        returningUsers7d: 12,
        avgPoints: 145.5,
        _note: "Valores por defecto. Configura FIREBASE_SERVICE_ACCOUNT_KEY en Vercel. Error interno: " + error.message
    }, { status: 200, headers: corsHeaders });
  }
}
