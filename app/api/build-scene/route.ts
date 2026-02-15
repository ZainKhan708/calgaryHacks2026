import { NextRequest, NextResponse } from "next/server";
import { buildScene } from "@/lib/generation/sceneBuilder";
import { getSession, restoreSession, setScene } from "@/lib/storage/uploadStore";
import { listAllImagesFromFirestore } from "@/lib/firebase";
import { loadSessionFromFirestore } from "@/lib/firebase/firestore";
import { clusterMemories } from "@/lib/clustering/clusterMemories";
import type { MemoryArtifact, UploadedFileRef } from "@/types/ai";
import { makeId } from "@/lib/utils/id";

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

function artifactFromImage(file: UploadedFileRef): MemoryArtifact {
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

async function buildGlobalScene(requestedSessionId: string) {
  const dbImages = await listAllImagesFromFirestore();
  if (!dbImages.length) return null;

  const files: UploadedFileRef[] = dbImages.map((img) => ({
    id: img.id,
    name: img.name,
    type: img.type,
    sourceType: img.sourceType,
    size: img.size,
    userTitle: img.userTitle,
    userDescription: img.userDescription,
    dataUrl: img.downloadUrl,
    uploadedAt: img.uploadedAt
  }));

  const artifacts = files.map(artifactFromImage);
  const clusters = clusterMemories(artifacts);
  return buildScene(requestedSessionId, artifacts, clusters);
}

function restoreFromSnapshot(sessionId: string, snapshot: Awaited<ReturnType<typeof loadSessionFromFirestore>>) {
  if (!snapshot) return;
  restoreSession(sessionId, {
    files: (snapshot.files ?? []) as unknown as UploadedFileRef[],
    artifacts: (snapshot.artifacts ?? []) as unknown as MemoryArtifact[],
    clusters: (snapshot.clusters ?? []) as unknown as import("@/types/cluster").MemoryCluster[],
    scene: snapshot.scene as unknown as import("@/types/scene").SceneDefinition | undefined,
    selectedCategory: snapshot.selectedCategory
  });
}

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  let session = getSession(sessionId);
  if (!session) {
    const snapshot = await loadSessionFromFirestore(sessionId);
    restoreFromSnapshot(sessionId, snapshot);
    session = getSession(sessionId);
  }
  if (!session) return NextResponse.json({ error: "Unknown session" }, { status: 404 });

  if (!session.artifacts.length || !session.clusters.length) {
    return NextResponse.json({ error: "Scene prerequisites missing" }, { status: 400 });
  }

  const scene = buildScene(sessionId, session.artifacts, session.clusters, session.selectedCategory);
  setScene(sessionId, scene);
  return NextResponse.json(scene);
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  try {
    // 1) Prefer local in-memory session if available.
    let session = getSession(sessionId);
    if (session?.scene) return NextResponse.json(session.scene);
    if (session && session.artifacts.length && session.clusters.length) {
      const rebuilt = buildScene(sessionId, session.artifacts, session.clusters, session.selectedCategory);
      setScene(sessionId, rebuilt);
      return NextResponse.json(rebuilt);
    }

    // 2) Restore exact session snapshot from Firestore.
    const snapshot = await loadSessionFromFirestore(sessionId);
    if (snapshot) {
      restoreFromSnapshot(sessionId, snapshot);
      session = getSession(sessionId);
      if (session?.scene) {
        setScene(sessionId, session.scene);
        return NextResponse.json(session.scene);
      }
      if (session && session.artifacts.length && session.clusters.length) {
        const rebuilt = buildScene(sessionId, session.artifacts, session.clusters, session.selectedCategory);
        setScene(sessionId, rebuilt);
        return NextResponse.json(rebuilt);
      }
    }

    // 3) Last resort: build a global gallery from all Firestore images.
    const scene = await buildGlobalScene(sessionId);
    if (!scene) return NextResponse.json({ error: "No images found in database" }, { status: 404 });
    setScene(sessionId, scene);
    return NextResponse.json(scene);
  } catch (err) {
    console.error("[build-scene] Global build failed:", err);
    return NextResponse.json({ error: "Failed to build scene from database" }, { status: 500 });
  }
}
