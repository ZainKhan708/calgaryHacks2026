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
  aiCategory?: string;
  aiTags?: string[];
  aiCaption?: string;
  aiSummary?: string;
  aiSentiment?: string;
  aiConfidence?: number;
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
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

function toIsoTimestamp(value: unknown): string | undefined {
  if (!value) return undefined;

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }

  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  return undefined;
}

function normalizeCategory(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toLowerCase();
  return trimmed || undefined;
}

function dominantCategoryFromFiles(files: unknown[]): string | undefined {
  const counts = new Map<string, number>();
  for (const file of files) {
    if (!file || typeof file !== "object") continue;
    const category = normalizeCategory((file as Record<string, unknown>).aiCategory);
    if (!category) continue;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  let winner: string | undefined;
  let winnerCount = -1;
  for (const [category, count] of counts) {
    if (count > winnerCount) {
      winner = category;
      winnerCount = count;
    }
  }
  return winner;
}

function firstUploadedAt(files: unknown[]): string | undefined {
  const valid = files
    .map((file) =>
      file && typeof file === "object" ? toIsoTimestamp((file as Record<string, unknown>).uploadedAt) : undefined
    )
    .filter((value): value is string => Boolean(value));
  if (!valid.length) return undefined;
  return valid.reduce((min, curr) => (new Date(curr).getTime() < new Date(min).getTime() ? curr : min));
}

export async function listAllSessionsFromFirestore(): Promise<SessionSummary[]> {
  const db = getFirebaseFirestore();
  if (!db) return [];
  const snapshot = await getDocs(collection(db, SESSIONS));
  const summaries = snapshot.docs
    .map((d) => {
      const data = d.data();
      const files = Array.isArray(data.files) ? data.files : [];
      const explicitCategory = normalizeCategory(data.selectedCategory);
      const dominantCategory = dominantCategoryFromFiles(files);
      const category = explicitCategory ?? dominantCategory;
      const createdAt = firstUploadedAt(files) ?? toIsoTimestamp(data.createdAt) ?? toIsoTimestamp(data.updatedAt);
      const updatedAt = toIsoTimestamp(data.updatedAt) ?? createdAt;

      return {
        sessionId: data.sessionId ?? d.id,
        fileCount: files.length,
        category,
        createdAt,
        updatedAt
      } as SessionSummary;
    })
    .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime());

  return summaries;
}

export async function listSessionsByCategoryFromFirestore(category: string): Promise<SessionSummary[]> {
  const normalizedCategory = normalizeCategory(category);
  if (!normalizedCategory) return [];
  const sessions = await listAllSessionsFromFirestore();
  return sessions.filter((session) => normalizeCategory(session.category) === normalizedCategory);
}
