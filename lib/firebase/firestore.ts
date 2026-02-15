import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from "firebase/firestore";
import { getFirebaseFirestore } from "./config";
import type { SourceType } from "@/types/ai";

/* ── Image metadata (one doc per uploaded image) ── */

export interface ImageMetadata {
  id: string;
  sessionId: string;
  name: string;
  type: string;
  sourceType: SourceType;
  size: number;
  downloadUrl: string;
  storagePath: string;
  userTitle: string;
  userDescription: string;
  uploadedAt: string;
}

const IMAGES = "images";

export async function saveImageMetadata(meta: ImageMetadata): Promise<boolean> {
  const db = getFirebaseFirestore();
  if (!db) return false;
  // Firestore rejects `undefined` values — strip them before saving
  const clean = JSON.parse(JSON.stringify(meta));
  await setDoc(doc(db, IMAGES, meta.id), { ...clean, updatedAt: serverTimestamp() });
  return true;
}

export async function getImageMetadata(imageId: string): Promise<ImageMetadata | null> {
  const db = getFirebaseFirestore();
  if (!db) return null;
  const snap = await getDoc(doc(db, IMAGES, imageId));
  return snap.exists() ? (snap.data() as ImageMetadata) : null;
}

export async function listImagesBySession(sessionId: string): Promise<ImageMetadata[]> {
  const db = getFirebaseFirestore();
  if (!db) return [];
  const q = query(collection(db, IMAGES), where("sessionId", "==", sessionId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => d.data() as ImageMetadata)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

export async function listAllImagesFromFirestore(): Promise<ImageMetadata[]> {
  const db = getFirebaseFirestore();
  if (!db) return [];
  const snapshot = await getDocs(collection(db, IMAGES));
  return snapshot.docs
    .map((d) => d.data() as ImageMetadata)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

/* ── Session snapshots (full pipeline state) ── */

export interface SessionSnapshot {
  sessionId: string;
  files: Array<Record<string, unknown>>;
  artifacts: Array<Record<string, unknown>>;
  clusters: Array<Record<string, unknown>>;
  scene?: Record<string, unknown>;
  selectedCategory?: string;
}

const SESSIONS = "sessions";

export async function saveSessionToFirestore(snapshot: SessionSnapshot): Promise<boolean> {
  const db = getFirebaseFirestore();
  if (!db) return false;
  // Firestore rejects `undefined` values — strip them before saving
  const clean = JSON.parse(JSON.stringify(snapshot));
  await setDoc(doc(db, SESSIONS, snapshot.sessionId), { ...clean, updatedAt: serverTimestamp() });
  return true;
}

export async function loadSessionFromFirestore(sessionId: string): Promise<SessionSnapshot | null> {
  const db = getFirebaseFirestore();
  if (!db) return null;
  const snap = await getDoc(doc(db, SESSIONS, sessionId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    sessionId: d.sessionId,
    files: d.files ?? [],
    artifacts: d.artifacts ?? [],
    clusters: d.clusters ?? [],
    scene: d.scene,
    selectedCategory: d.selectedCategory
  } as SessionSnapshot;
}

export interface SessionSummary {
  sessionId: string;
  fileCount: number;
  updatedAt?: string;
}

export async function listAllSessionsFromFirestore(): Promise<SessionSummary[]> {
  const db = getFirebaseFirestore();
  if (!db) return [];
  const snapshot = await getDocs(collection(db, SESSIONS));
  return snapshot.docs
    .map((d) => {
      const data = d.data();
      return {
        sessionId: data.sessionId ?? d.id,
        fileCount: Array.isArray(data.files) ? data.files.length : 0,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.()
      } as SessionSummary;
    })
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}
