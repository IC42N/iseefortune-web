import admin from "firebase-admin";
import path from 'node:path';
import * as fs from 'node:fs';


function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    // Production (Amplify, Lambda, etc.)
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  // Local dev
  const p = path.join(process.cwd(), "secrets/firebase-admin.json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}


function getAdmin() {
  if (admin.apps.length) {
    return admin;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("Missing Firebase admin env vars");
  }

  admin.initializeApp({
    credential: admin.credential.cert(loadServiceAccount()),
    projectId,
  });

  return admin;
}

export const firebaseAdmin = getAdmin();
export const adminAuth = firebaseAdmin.auth();
export const adminDb = firebaseAdmin.firestore();