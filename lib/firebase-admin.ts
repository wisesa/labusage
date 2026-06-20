import fs from "fs";
import path from "path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function loadServiceAccount() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    return JSON.parse(serviceAccountJson);
  }

  const credentialFile =
    process.env.FIREBASE_CREDENTIALS_FILE || "serviceAccountKey.json";

  const credentialPath = path.isAbsolute(credentialFile)
    ? credentialFile
    : path.join(process.cwd(), credentialFile);

  if (!fs.existsSync(credentialPath)) {
    throw new Error(`Credential Firebase tidak ditemukan: ${credentialPath}`);
  }

  return JSON.parse(fs.readFileSync(credentialPath, "utf-8"));
}

function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp({
    credential: cert(loadServiceAccount()),
  });
}

export function getAdminFirestore() {
  const app = getFirebaseAdminApp();
  const databaseId = process.env.FIRESTORE_DATABASE_ID;

  if (databaseId) {
    return getFirestore(app, databaseId);
  }

  return getFirestore(app);
}

export function getUsersCollectionName() {
  return process.env.FIRESTORE_USERS_COLLECTION || "users";
}

export function getPengajarCollectionName() {
  return process.env.FIRESTORE_PENGAJAR_COLLECTION || "pengajar";
}

export function getLabsCollectionName() {
  return process.env.FIRESTORE_LABS_COLLECTION || "labs";
}

export function getAdminsCollectionName() {
  return process.env.FIRESTORE_ADMINS_COLLECTION || "admins";
}

export function getLoginLogsCollectionName() {
  return process.env.FIRESTORE_LOGIN_LOGS_COLLECTION || "login_logs";
}