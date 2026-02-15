import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

interface FirebaseServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

let cachedApp: App | null | undefined;
let cachedDb: Firestore | null | undefined;

function normalizePrivateKey(value: string): string {
  return value.includes("\\n") ? value.replace(/\\n/g, "\n") : value;
}

function toServiceAccount(input: unknown): FirebaseServiceAccount | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const projectId = typeof raw.project_id === "string" ? raw.project_id : typeof raw.projectId === "string" ? raw.projectId : "";
  const clientEmail =
    typeof raw.client_email === "string"
      ? raw.client_email
      : typeof raw.clientEmail === "string"
        ? raw.clientEmail
        : "";
  const privateKey =
    typeof raw.private_key === "string" ? raw.private_key : typeof raw.privateKey === "string" ? raw.privateKey : "";

  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey: normalizePrivateKey(privateKey) };
}

function serviceAccountFromEnv(): FirebaseServiceAccount | null {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      const account = toServiceAccount(parsed);
      if (account) return account;
    } catch {
      // Ignore malformed JSON and continue to individual env vars.
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) return null;

  return { projectId, clientEmail, privateKey: normalizePrivateKey(privateKey) };
}

function getFirebaseAdminApp(): App | null {
  if (cachedApp !== undefined) return cachedApp;

  const serviceAccount = serviceAccountFromEnv();
  if (!serviceAccount) {
    cachedApp = null;
    return cachedApp;
  }

  if (getApps().length > 0) {
    cachedApp = getApps()[0] ?? null;
    return cachedApp;
  }

  cachedApp = initializeApp({
    credential: cert({
      projectId: serviceAccount.projectId,
      clientEmail: serviceAccount.clientEmail,
      privateKey: serviceAccount.privateKey
    })
  });
  return cachedApp;
}

export function getFirebaseFirestore(): Firestore | null {
  if (cachedDb !== undefined) return cachedDb;

  const app = getFirebaseAdminApp();
  if (!app) {
    cachedDb = null;
    return cachedDb;
  }

  cachedDb = getFirestore(app);
  return cachedDb;
}
