import { NextRequest, NextResponse } from "next/server";
import { getSession, setArtifacts, setClusters, setScene } from "@/lib/storage/uploadStore";
import { analyzeFiles } from "@/lib/ai/analyzeMedia";
import { clusterMemories } from "@/lib/clustering/clusterMemories";
import { buildScene } from "@/lib/generation/sceneBuilder";

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Unknown session" }, { status: 404 });

  const artifacts = await analyzeFiles(session.files);
  setArtifacts(sessionId, artifacts);

  const clusters = clusterMemories(artifacts);
  setClusters(sessionId, clusters);

  const scene = buildScene(sessionId, artifacts, clusters);
  setScene(sessionId, scene);

  return NextResponse.json({ sessionId, counts: { files: session.files.length, artifacts: artifacts.length, clusters: clusters.length }, scene });
}
