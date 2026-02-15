import { NextRequest, NextResponse } from "next/server";
import { getSession, setArtifacts, setClusters, setFiles, setScene, setSelectedCategory, upsertSession } from "@/lib/storage/uploadStore";
import { analyzeFiles } from "@/lib/ai/analyzeMedia";
import { clusterMemories } from "@/lib/clustering/clusterMemories";
import { buildScene } from "@/lib/generation/sceneBuilder";
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
  const body = (await req.json()) as {
    sessionId?: string;
    category?: string;
    files?: unknown[];
  };
  const sessionId = body.sessionId;
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  const category = typeof body.category === "string" ? body.category.trim().toLowerCase() : undefined;
  const fallbackFiles = Array.isArray(body.files) ? body.files.filter(isUploadedFileRef) : [];

  let session = getSession(sessionId);
  // Resilient fallback for dev/serverless reloads where in-memory session can disappear between calls.
  if (!session && fallbackFiles.length) {
    upsertSession(sessionId);
    setFiles(sessionId, fallbackFiles);
    if (category) setSelectedCategory(sessionId, category);
    session = getSession(sessionId);
  }

  if (!session) {
    return NextResponse.json(
      { error: "Unknown session. Please upload again." },
      { status: 404 }
    );
  }

  if (!session.files.length && fallbackFiles.length) {
    setFiles(sessionId, fallbackFiles);
    session = getSession(sessionId) ?? session;
  }
  if (category) setSelectedCategory(sessionId, category);
  if (!session.files.length) return NextResponse.json({ error: "No files available in session." }, { status: 400 });

  const artifacts = await analyzeFiles(session.files);
  setArtifacts(sessionId, artifacts);

  const clusters = clusterMemories(artifacts);
  setClusters(sessionId, clusters);

  const refreshed = getSession(sessionId);
  const scene = buildScene(sessionId, artifacts, clusters, refreshed?.selectedCategory);
  setScene(sessionId, scene);

  return NextResponse.json({ sessionId, counts: { files: session.files.length, artifacts: artifacts.length, clusters: clusters.length }, scene });
}
