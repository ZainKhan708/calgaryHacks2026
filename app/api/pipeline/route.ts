import { NextRequest, NextResponse } from "next/server";
import { getSession, restoreSession, setArtifacts, setClusters, setScene } from "@/lib/storage/uploadStore";
import { analyzeFiles } from "@/lib/ai/analyzeMedia";
import { clusterMemories } from "@/lib/clustering/clusterMemories";
import { buildScene } from "@/lib/generation/sceneBuilder";
import { saveSessionToFirestore } from "@/lib/firebase";
import type { UploadedFileRef } from "@/types/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, files: bodyFiles } = body as { sessionId?: string; files?: UploadedFileRef[] };
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    // If in-memory session was lost (HMR), restore from the files the client sent
    let session = getSession(sessionId);
    if (!session && Array.isArray(bodyFiles) && bodyFiles.length > 0) {
      restoreSession(sessionId, { files: bodyFiles, artifacts: [], clusters: [] });
      session = getSession(sessionId);
    }
    if (!session) return NextResponse.json({ error: "Unknown session" }, { status: 404 });
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
