import { NextRequest, NextResponse } from "next/server";
import { normalizeCategory } from "@/lib/categories/catalog";
import { clusterMemories } from "@/lib/clustering/clusterMemories";
import { buildScene } from "@/lib/generation/sceneBuilder";
import { listArchiveEntriesByCategory } from "@/lib/storage/archiveRepository";
import { makeId } from "@/lib/utils/id";
import type { MemoryArtifact } from "@/types/ai";

export async function GET(req: NextRequest) {
  const categoryQuery = req.nextUrl.searchParams.get("category");
  const category = normalizeCategory(categoryQuery);
  if (!category) return NextResponse.json({ error: "Invalid category" }, { status: 400 });

  const entries = await listArchiveEntriesByCategory(category);
  if (!entries.length) {
    return NextResponse.json({ error: "No entries found for this category." }, { status: 404 });
  }

  const sessionId = makeId("session");
  const artifacts: MemoryArtifact[] = entries.map((entry) => ({
    id: entry.artifactId,
    fileId: entry.fileId,
    sourceType: entry.sourceType,
    title: entry.title,
    description: entry.description,
    emotion: entry.emotion,
    sentimentScore: entry.sentimentScore,
    objects: entry.objects,
    semanticTags: entry.semanticTags,
    category: entry.category,
    palette: entry.palette,
    embedding: entry.embedding
  }));

  const clusters = clusterMemories(artifacts);
  const scene = buildScene(sessionId, artifacts, clusters);
  const imageByArtifactId = new Map(entries.map((entry) => [entry.artifactId, entry.imageDataUrl]));
  const hydratedScene = {
    ...scene,
    exhibits: scene.exhibits.map((exhibit) => {
      const imageDataUrl = imageByArtifactId.get(exhibit.artifactId);
      return imageDataUrl ? { ...exhibit, assetUrl: imageDataUrl } : exhibit;
    })
  };

  return NextResponse.json({ category, scene: hydratedScene, count: entries.length });
}
