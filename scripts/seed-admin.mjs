import fs from "fs";
import path from "path";
import { pbkdf2Sync, randomBytes } from "crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

function hashAdminPassword(password) {
  const iterations = 210000;
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString(
    "hex"
  );

  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
}

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

const username = process.env.ADMIN_SEED_USERNAME || "admin";
const password = process.env.ADMIN_SEED_PASSWORD;

if (!password) {
  console.error("ADMIN_SEED_PASSWORD wajib diisi.");
  process.exit(1);
}

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(loadServiceAccount()),
      });

const databaseId = process.env.FIRESTORE_DATABASE_ID;
const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

const adminsCollection = process.env.FIRESTORE_ADMINS_COLLECTION || "admins";
const adminRef = db.collection(adminsCollection).doc(username);
const adminSnapshot = await adminRef.get();

const payload = {
  username,
  password_hash: hashAdminPassword(password),
  active: true,
  updated_at: FieldValue.serverTimestamp(),
};

if (!adminSnapshot.exists) {
  payload.created_at = FieldValue.serverTimestamp();
}

await adminRef.set(payload, { merge: true });

console.log(`Admin berhasil dibuat / diperbarui: ${username}`);