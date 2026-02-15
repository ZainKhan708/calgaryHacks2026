import { NextRequest, NextResponse } from "next/server";
import { buildScene } from "@/lib/generation/sceneBuilder";
import {
  getSession,
  restoreSession,
  setScene,
  type SessionState
} from "@/lib/storage/uploadStore";
import { loadSessionSnapshot, saveSessionSnapshot } from "@/lib/storage/sessionSnapshot";
import {
  listAllImagesFromFirestore,
  listImagesBySession,
  loadSessionFromFirestore,
  type ImageMetadata
} from "@/lib/firebase";
import { clusterMemories } from "@/lib/clustering/clusterMemories";
import type { MemoryArtifact, UploadedFileRef } from "@/types/ai";
import type { SceneDefinition } from "@/types/scene";
import { makeId } from "@/lib/utils/id";
import { isSceneDefinitionValid } from "@/lib/scene/validation";

function isSceneUsable(scene: SceneDefinition | undefined): scene is SceneDefinition {
  return isSceneDefinitionValid(scene);
}

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

function pseudoEmbedding(seed: string, dims = 24): number[] {
  let x = hashString(seed) || 1;
  const out: number[] = [];
  for (let i = 0; i < dims; i += 1) {
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    out.push(((x >>> 0) / 0xffffffff) * 2 - 1);
  }
  return out;
}

function tagsFromText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);
}

function artifactFromFile(file: UploadedFileRef): MemoryArtifact {
  const base = file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").trim();
  const title = file.userTitle?.trim() || base || "Untitled Memory";
  const description = file.userDescription?.trim() || `Memory captured in ${file.name}.`;
  const seed = `${file.id}:${title}:${description}`;
  return {
    id: makeId("artifact"),
    fileId: file.id,
    sourceType: file.sourceType,
    title,
    description,
    emotion: "neutral",
    sentimentScore: 0.5,
    objects: ["memory"],
    semanticTags: tagsFromText(`${title} ${description}`),
    palette: ["#d9c2a7", "#7e5f4a", "#2c2f3a"],
    embedding: pseudoEmbedding(seed)
  };
}

function filesFromImageMetadata(images: ImageMetadata[]): UploadedFileRef[] {
  return images.map((img) => ({
    id: img.id,
    name: img.name,
    type: img.type,
    sourceType: img.sourceType,
    size: img.size,
    userTitle: img.userTitle,
    userDescription: img.userDescription,
    aiCategory: img.aiCategory,
    aiTags: img.aiTags,
    aiCaption: img.aiCaption,
    aiSummary: img.aiSummary,
    aiSentiment: img.aiSentiment,
    aiConfidence: img.aiConfidence,
    dataUrl: img.downloadUrl,
    uploadedAt: img.uploadedAt
  }));
}

function dominantAiCategory(files: UploadedFileRef[]): string | undefined {
  const counts = new Map<string, number>();
  for (const file of files) {
    const category = file.aiCategory?.trim().toLowerCase();
    if (!category) continue;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestCount = -1;
  for (const [category, count] of counts) {
    if (count > bestCount) {
      best = category;
      bestCount = count;
    }
  }
  return best;
}

function restoreFromSnapshot(
  sessionId: string,
  snapshot:
    | {
        files?: unknown[];
        artifacts?: unknown[];
        clusters?: unknown[];
        scene?: unknown;
        selectedCategory?: string;
      }
    | null
) {
  if (!snapshot) return;
  restoreSession(sessionId, {
    files: (snapshot.files ?? []) as UploadedFileRef[],
    artifacts: (snapshot.artifacts ?? []) as MemoryArtifact[],
    clusters: (snapshot.clusters ?? []) as import("@/types/cluster").MemoryCluster[],
    scene: snapshot.scene as SceneDefinition | undefined,
    selectedCategory: snapshot.selectedCategory
  });
}

async function persistSessionLocal(sessionId: string, state: SessionState) {
  await saveSessionSnapshot(sessionId, {
    files: state.files,
    artifacts: state.artifacts,
    clusters: state.clusters,
    scene: state.scene,
    selectedCategory: state.selectedCategory
  });
}

async function buildSceneFromFiles(
  sessionId: string,
  files: UploadedFileRef[],
  preferredCategory?: string
): Promise<SceneDefinition | null> {
  if (!files.length) return null;
  const artifacts = files.map(artifactFromFile);
  if (!artifacts.length) return null;
  const clusters = clusterMemories(artifacts);
  const selectedCategory = preferredCategory ?? dominantAiCategory(files);
  const scene = buildScene(sessionId, artifacts, clusters, selectedCategory);
  restoreSession(sessionId, { files, artifacts, clusters, scene, selectedCategory });
  setScene(sessionId, scene);
  const updated = getSession(sessionId);
  if (updated) await persistSessionLocal(sessionId, updated);
  return scene;
}

function resolveSceneFromSession(sessionId: string, session?: SessionState): SceneDefinition | null {
  if (!session) return null;

  // Always prefer rebuilding from artifacts/clusters so old stored scenes can't
  // lock users into stale geometry/camera layouts.
  if (session.artifacts.length && session.clusters.length) {
    const rebuilt = buildScene(sessionId, session.artifacts, session.clusters, session.selectedCategory);
    setScene(sessionId, rebuilt);
    const updated = getSession(sessionId);
    if (updated) void persistSessionLocal(sessionId, updated);
    return rebuilt;
  }

  if (isSceneUsable(session.scene)) return session.scene;

  return null;
}

async function buildSessionSceneFromImages(sessionId: string): Promise<SceneDefinition | null> {
  const sessionImages = await listImagesBySession(sessionId);
  if (!sessionImages.length) return null;
  const files = filesFromImageMetadata(sessionImages);
  return buildSceneFromFiles(sessionId, files, dominantAiCategory(files));
}

async function buildGlobalScene(requestedSessionId: string): Promise<SceneDefinition | null> {
  const dbImages = await listAllImagesFromFirestore();
  if (!dbImages.length) return null;
  const files = filesFromImageMetadata(dbImages);
  return buildSceneFromFiles(requestedSessionId, files, dominantAiCategory(files));
}

async function recoverSession(sessionId: string): Promise<SessionState | undefined> {
  let session = getSession(sessionId);
  if (session) return session;

  const firestoreSnapshot = await loadSessionFromFirestore(sessionId);
  restoreFromSnapshot(sessionId, firestoreSnapshot);
  session = getSession(sessionId);
  if (session) return session;

  const localSnapshot = await loadSessionSnapshot(sessionId);
  restoreFromSnapshot(sessionId, localSnapshot);
  session = getSession(sessionId);
  return session;
}

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  let session = await recoverSession(sessionId);

  if (!session) {
    const rebuilt = await buildSessionSceneFromImages(sessionId);
    if (rebuilt) return NextResponse.json(rebuilt);
    return NextResponse.json({ error: "Unknown session" }, { status: 404 });
  }

  let scene = resolveSceneFromSession(sessionId, session);
  if (!scene && session.files.length) {
    scene = await buildSceneFromFiles(sessionId, session.files, session.selectedCategory);
  }
  if (!scene) {
    return NextResponse.json({ error: "Scene prerequisites missing" }, { status: 400 });
  }

  session = getSession(sessionId);
  if (session) await persistSessionLocal(sessionId, session);
  return NextResponse.json(scene);
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  try {
    // 1) In-memory session.
    let session = getSession(sessionId);
    let memoryScene = resolveSceneFromSession(sessionId, session);
    if (!memoryScene && session?.files.length) {
      memoryScene = await buildSceneFromFiles(sessionId, session.files, session.selectedCategory);
    }
    if (memoryScene) return NextResponse.json(memoryScene);

    // 2) Firestore snapshot.
    const firestoreSnapshot = await loadSessionFromFirestore(sessionId);
    restoreFromSnapshot(sessionId, firestoreSnapshot);
    session = getSession(sessionId);
    let firestoreScene = resolveSceneFromSession(sessionId, session);
    if (!firestoreScene && session?.files.length) {
      firestoreScene = await buildSceneFromFiles(sessionId, session.files, session.selectedCategory);
    }
    if (firestoreScene) return NextResponse.json(firestoreScene);

    // 3) Local snapshot.
    const localSnapshot = await loadSessionSnapshot(sessionId);
    restoreFromSnapshot(sessionId, localSnapshot);
    session = getSession(sessionId);
    let localScene = resolveSceneFromSession(sessionId, session);
    if (!localScene && session?.files.length) {
      localScene = await buildSceneFromFiles(sessionId, session.files, session.selectedCategory);
    }
    if (localScene) return NextResponse.json(localScene);

    // 4) Reconstruct exact session from Firestore image metadata.
    const sessionImageScene = await buildSessionSceneFromImages(sessionId);
    if (sessionImageScene) return NextResponse.json(sessionImageScene);

    // 5) Last resort: build a global gallery from all Firestore images.
    const globalScene = await buildGlobalScene(sessionId);
    if (!globalScene) return NextResponse.json({ error: "No images found in database" }, { status: 404 });
    return NextResponse.json(globalScene);
  } catch (err) {
    console.error("[build-scene] Global build failed:", err);
    return NextResponse.json({ error: "Failed to build scene from database" }, { status: 500 });
  }
}
