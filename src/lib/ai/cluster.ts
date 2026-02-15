import { db } from "@/src/lib/db/db";
import { MEMORY_CATEGORIES, type MemoryCategory } from "@/src/lib/ai/categories";
import { clusterResultSchema, type AIAnalysisOutput, type ClusterResult, type SceneObject } from "@/src/lib/ai/schemas";
import { averageVectors, clamp, cosineSimilarity, nowIso } from "@/src/lib/ai/utils";

interface WorkingCluster {
  members: AIAnalysisOutput[];
  centroid: number[];
}

function dominantCategory(items: AIAnalysisOutput[]): MemoryCategory {
  const counts = new Map<MemoryCategory, number>();

  for (const item of items) {
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }

  const ranked = MEMORY_CATEGORIES
    .map((category) => ({ category, count: counts.get(category) ?? 0 }))
    .sort((a, b) => b.count - a.count);

  return ranked[0]?.category ?? "culture";
}

function averageSimilarity(items: AIAnalysisOutput[], centroid: number[]): number {
  if (!items.length) return 0;
  const total = items.reduce((sum, item) => sum + cosineSimilarity(item.embedding, centroid), 0);
  return clamp(total / items.length, 0, 1);
}

function buildSceneObjects(clusterId: string, items: AIAnalysisOutput[], avgSimilarity: number): SceneObject[] {
  const memoryIds = items.map((item) => item.memoryId);
  const room: SceneObject = {
    id: `${clusterId}_room`,
    type: "room",
    memoryIds,
    importance: clamp(avgSimilarity, 0.2, 1),
    style: "gallery-room"
  };
  const hallway: SceneObject = {
    id: `${clusterId}_hallway`,
    type: "hallway",
    memoryIds,
    importance: clamp(avgSimilarity * 0.9, 0.1, 1),
    style: "connector"
  };
  const frames: SceneObject[] = memoryIds.map((memoryId, index) => ({
    id: `${clusterId}_frame_${index + 1}`,
    type: "frame",
    memoryIds: [memoryId],
    importance: clamp(items[index]?.renderHints.importance ?? avgSimilarity, 0.1, 1),
    style: items[index]?.renderHints.frameStyle ?? "default-frame"
  }));

  return [room, hallway, ...frames];
}

function assignToClusters(items: AIAnalysisOutput[], threshold: number): WorkingCluster[] {
  const clusters: WorkingCluster[] = [];

  for (const item of items) {
    let bestIndex = -1;
    let bestScore = -1;

    for (let i = 0; i < clusters.length; i += 1) {
      const score = cosineSimilarity(item.embedding, clusters[i].centroid);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    if (bestIndex >= 0 && bestScore >= threshold) {
      clusters[bestIndex].members.push(item);
      clusters[bestIndex].centroid = averageVectors(clusters[bestIndex].members.map((member) => member.embedding));
    } else {
      clusters.push({
        members: [item],
        centroid: [...item.embedding]
      });
    }
  }

  return clusters;
}

export function clusterAnalyses(analyses: AIAnalysisOutput[], threshold = 0.82): ClusterResult[] {
  if (!analyses.length) return [];

  const clusters = assignToClusters(analyses, threshold);
  return clusters.map((cluster, index) => {
    const category = dominantCategory(cluster.members);
    const avgSimilarity = averageSimilarity(cluster.members, cluster.centroid);
    const clusterId = `cluster_${index + 1}_${category}`;
    const sceneObjects = buildSceneObjects(clusterId, cluster.members, avgSimilarity);

    return clusterResultSchema.parse({
      clusterId,
      category,
      memoryIds: cluster.members.map((member) => member.memoryId),
      centroid: cluster.centroid,
      averageSimilarity: avgSimilarity,
      sceneObjects,
      createdAt: nowIso()
    });
  });
}

export async function clusterAndPersist(
  userId: string,
  analyses: AIAnalysisOutput[],
  threshold = 0.82
): Promise<ClusterResult[]> {
  const clusters = clusterAnalyses(analyses, threshold);
  await db.saveClusters(userId, clusters);
  return clusters;
}
