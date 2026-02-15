import type { MemoryArtifact } from "@/types/ai";
import type { MemoryCluster } from "@/types/cluster";
import { makeId } from "@/lib/utils/id";

function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function jaccard(a: string[], b: string[]): number {
  const sa = new Set(a.map((x) => x.toLowerCase()));
  const sb = new Set(b.map((x) => x.toLowerCase()));
  const inter = [...sa].filter((x) => sb.has(x)).length;
  const union = new Set([...sa, ...sb]).size;
  return union === 0 ? 0 : inter / union;
}

function averageEmbedding(items: MemoryArtifact[]): number[] {
  if (!items.length) return [];
  const len = items[0].embedding.length;
  const acc = new Array(len).fill(0);
  for (const item of items) {
    for (let i = 0; i < len; i += 1) acc[i] += item.embedding[i] ?? 0;
  }
  return acc.map((v) => v / items.length);
}

function similarity(a: MemoryArtifact, b: MemoryArtifact): number {
  const semantic = cosine(a.embedding, b.embedding);
  const emotion = a.emotion.toLowerCase() === b.emotion.toLowerCase() ? 1 : 0;
  const tags = jaccard(a.semanticTags, b.semanticTags);
  return semantic * 0.65 + emotion * 0.2 + tags * 0.15;
}

export function clusterMemories(artifacts: MemoryArtifact[], threshold = 0.5): MemoryCluster[] {
  const clusters: MemoryArtifact[][] = [];

  for (const artifact of artifacts) {
    let placed = false;
    for (const cluster of clusters) {
      const score = cluster.reduce((sum, a) => sum + similarity(a, artifact), 0) / cluster.length;
      if (score >= threshold) {
        cluster.push(artifact);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([artifact]);
  }

  return clusters.map((items, idx) => {
    const allTags = items.flatMap((a) => a.semanticTags);
    const tagCounts = new Map<string, number>();
    for (const tag of allTags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    const topTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([tag]) => tag);

    const dominantEmotion =
      items
        .map((i) => i.emotion)
        .sort(
          (a, b) =>
            items.filter((x) => x.emotion === b).length -
            items.filter((x) => x.emotion === a).length
        )[0] ?? "neutral";

    return {
      id: makeId(`cluster${idx + 1}`),
      theme: topTags[0] ? `${topTags[0]} memories` : `Memory cluster ${idx + 1}`,
      emotionProfile: dominantEmotion,
      centroid: averageEmbedding(items),
      memberIds: items.map((i) => i.id),
      tags: topTags
    };
  });
}
