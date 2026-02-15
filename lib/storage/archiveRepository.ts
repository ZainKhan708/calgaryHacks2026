import "server-only";
import { getFirebaseFirestore } from "@/lib/firebase/admin";
import { normalizeCategory } from "@/lib/categories/catalog";
import { makeId } from "@/lib/utils/id";
import type { CategorySlug } from "@/lib/categories/catalog";
import type { ArchiveEntryRecord, CreateArchiveEntryInput } from "@/types/archive";

const inMemoryEntries: ArchiveEntryRecord[] = [];
let inMemoryCounter = 0;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is number => typeof item === "number" && Number.isFinite(item));
}

function cloneRecord(record: ArchiveEntryRecord): ArchiveEntryRecord {
  return {
    ...record,
    objects: [...record.objects],
    semanticTags: [...record.semanticTags],
    palette: [...record.palette],
    embedding: [...record.embedding]
  };
}

function normalizeCreateInput(input: CreateArchiveEntryInput): CreateArchiveEntryInput {
  const title = input.title.trim() || "Untitled Memory";
  const description = input.description.trim() || "No description.";

  return {
    ...input,
    title,
    description,
    objects: [...input.objects],
    semanticTags: [...input.semanticTags],
    palette: [...input.palette],
    embedding: [...input.embedding]
  };
}

function fromFirestoreDocument(id: string, data: Record<string, unknown>): ArchiveEntryRecord | null {
  const index = Number(data.index);
  const title = typeof data.title === "string" ? data.title : "";
  const description = typeof data.description === "string" ? data.description : "";
  const category = typeof data.category === "string" ? normalizeCategory(data.category) ?? null : null;
  const sourceType = typeof data.sourceType === "string" ? data.sourceType : "";
  const fileName = typeof data.fileName === "string" ? data.fileName : "";
  const fileType = typeof data.fileType === "string" ? data.fileType : "";
  const fileSize = Number(data.fileSize);
  const fileId = typeof data.fileId === "string" ? data.fileId : "";
  const artifactId = typeof data.artifactId === "string" ? data.artifactId : "";
  const emotion = typeof data.emotion === "string" ? data.emotion : "neutral";
  const sentimentScore = Number(data.sentimentScore);
  const createdAt = typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString();

  if (
    !Number.isFinite(index) ||
    !title ||
    !description ||
    !category ||
    !sourceType ||
    !fileName ||
    !fileType ||
    !Number.isFinite(fileSize) ||
    !fileId ||
    !artifactId
  ) {
    return null;
  }

  return {
    id,
    index,
    title,
    description,
    imageDataUrl: typeof data.imageDataUrl === "string" ? data.imageDataUrl : undefined,
    imageMimeType: typeof data.imageMimeType === "string" ? data.imageMimeType : undefined,
    category,
    sourceType: sourceType as CreateArchiveEntryInput["sourceType"],
    fileName,
    fileType,
    fileSize,
    textContent: typeof data.textContent === "string" ? data.textContent : undefined,
    fileId,
    artifactId,
    emotion,
    sentimentScore: Number.isFinite(sentimentScore) ? sentimentScore : 0.5,
    objects: asStringArray(data.objects),
    semanticTags: asStringArray(data.semanticTags),
    palette: asStringArray(data.palette),
    embedding: asNumberArray(data.embedding),
    createdAt
  };
}

export async function createArchiveEntry(input: CreateArchiveEntryInput): Promise<ArchiveEntryRecord> {
  const normalized = normalizeCreateInput(input);
  const createdAt = new Date().toISOString();
  const firestore = getFirebaseFirestore();

  if (!firestore) {
    inMemoryCounter += 1;
    const record: ArchiveEntryRecord = {
      id: makeId("entry"),
      index: inMemoryCounter,
      createdAt,
      ...normalized
    };
    inMemoryEntries.push(record);
    return cloneRecord(record);
  }

  return firestore.runTransaction(async (tx) => {
    const counterRef = firestore.collection("meta").doc("counters");
    const counterSnap = await tx.get(counterRef);
    const currentIndex = Number(counterSnap.data()?.entryIndex ?? 0);
    const nextIndex = Number.isFinite(currentIndex) ? currentIndex + 1 : 1;

    tx.set(counterRef, { entryIndex: nextIndex }, { merge: true });

    const entryRef = firestore.collection("entries").doc();
    const record: Omit<ArchiveEntryRecord, "id"> = {
      index: nextIndex,
      createdAt,
      ...normalized
    };
    tx.set(entryRef, record);

    return {
      id: entryRef.id,
      ...record
    };
  });
}

export async function listArchiveEntriesByCategory(category: CategorySlug): Promise<ArchiveEntryRecord[]> {
  const firestore = getFirebaseFirestore();
  if (!firestore) {
    return inMemoryEntries
      .filter((entry) => entry.category === category)
      .sort((a, b) => a.index - b.index)
      .map(cloneRecord);
  }

  const snapshot = await firestore.collection("entries").where("category", "==", category).get();
  return snapshot.docs
    .map((doc) => fromFirestoreDocument(doc.id, doc.data()))
    .filter((entry): entry is ArchiveEntryRecord => entry !== null)
    .sort((a, b) => a.index - b.index);
}

export async function listArchiveEntries(): Promise<ArchiveEntryRecord[]> {
  const firestore = getFirebaseFirestore();
  if (!firestore) {
    return [...inMemoryEntries].sort((a, b) => a.index - b.index).map(cloneRecord);
  }

  const snapshot = await firestore.collection("entries").get();
  return snapshot.docs
    .map((doc) => fromFirestoreDocument(doc.id, doc.data()))
    .filter((entry): entry is ArchiveEntryRecord => entry !== null)
    .sort((a, b) => a.index - b.index);
}
