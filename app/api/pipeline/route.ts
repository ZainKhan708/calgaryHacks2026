import { NextRequest, NextResponse } from "next/server";
import { getSession, restoreSession, setArtifacts, setClusters, setScene } from "@/lib/storage/uploadStore";
import { analyzeFiles } from "@/lib/ai/analyzeMedia";
import { clusterMemories } from "@/lib/clustering/clusterMemories";
import { buildScene } from "@/lib/generation/sceneBuilder";
import { loadSessionFromFirestore, saveSessionToFirestore } from "@/lib/firebase";
import type { UploadedFileRef } from "@/types/ai";

function isUploadedFileRef(value: unknown): value is UploadedFileRef {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.type === "string" &&
    (candidate.sourceType === "image" || candidate.sourceType === "text" || candidate.sourceType === "audio") &&
    typeof candidate.size === "number" &&
    typeof candidate.uploadedAt === "string"
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, files: bodyFiles, category } = body as {
      sessionId?: string;
      files?: unknown[];
      category?: string;
    };
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    const normalizedCategory = typeof category === "string" ? category.trim().toLowerCase() : undefined;
    const fallbackFiles = Array.isArray(bodyFiles) ? bodyFiles.filter(isUploadedFileRef) : [];

    // 1) Try in-memory.
    let session = getSession(sessionId);

    // 2) Recover from payload fallback.
    if (!session && fallbackFiles.length > 0) {
      restoreSession(sessionId, {
        files: fallbackFiles,
        artifacts: [],
        clusters: [],
        selectedCategory: normalizedCategory
      });
      session = getSession(sessionId);
    }

    // 3) Recover from Firestore snapshot.
    if (!session) {
      const snapshot = await loadSessionFromFirestore(sessionId);
      if (snapshot) {
        restoreSession(sessionId, {
          files: (snapshot.files ?? []) as UploadedFileRef[],
          artifacts: (snapshot.artifacts ?? []) as import("@/types/ai").MemoryArtifact[],
          clusters: (snapshot.clusters ?? []) as import("@/types/cluster").MemoryCluster[],
          scene: snapshot.scene as import("@/types/scene").SceneDefinition | undefined,
          selectedCategory: normalizedCategory ?? snapshot.selectedCategory
        });
        session = getSession(sessionId);
      }
    }

    if (!session) return NextResponse.json({ error: "Unknown session" }, { status: 404 });
    if (normalizedCategory) session.selectedCategory = normalizedCategory;
    if (!session.files.length && fallbackFiles.length > 0) {
      restoreSession(sessionId, {
        files: fallbackFiles,
        artifacts: session.artifacts,
        clusters: session.clusters,
        scene: session.scene,
        selectedCategory: session.selectedCategory
      });
      session = getSession(sessionId) ?? session;
    }
    if (!session.files.length) return NextResponse.json({ error: "No files in session" }, { status: 400 });

    const artifacts = await analyzeFiles(session.files);
    setArtifacts(sessionId, artifacts);

    const clusters = clusterMemories(artifacts);
    setClusters(sessionId, clusters);

    const scene = buildScene(sessionId, artifacts, clusters, session.selectedCategory);
    setScene(sessionId, scene);

    // Persist the full session to Firestore
    const updated = getSession(sessionId);
    if (updated) {
      try {
        const saved = await saveSessionToFirestore({
          sessionId,
          files: updated.files as unknown as Array<Record<string, unknown>>,
          artifacts: updated.artifacts as unknown as Array<Record<string, unknown>>,
          clusters: updated.clusters as unknown as Array<Record<string, unknown>>,
          scene: scene as unknown as Record<string, unknown>,
          selectedCategory: updated.selectedCategory
        });
        console.log(`[pipeline] Firestore save: ${saved ? "SUCCESS" : "SKIPPED (no db)"}`);
      } catch (err) {
        console.error("[pipeline] Firestore save FAILED:", err);
      }
    }

    return NextResponse.json({ sessionId, counts: { files: session.files.length, artifacts: artifacts.length, clusters: clusters.length }, scene });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pipeline failed";
    console.error("[pipeline]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
