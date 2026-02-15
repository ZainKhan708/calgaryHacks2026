import { describe, expect, it } from "vitest";
import { clusterMemories } from "@/lib/clustering/clusterMemories";
import type { MemoryArtifact } from "@/types/ai";

function artifact(id: string, emotion: string, tags: string[], embedding: number[]): MemoryArtifact {
  return {
    id,
    fileId: `file_${id}`,
    sourceType: "text",
    title: id,
    description: id,
    emotion,
    sentimentScore: 0.5,
    objects: [],
    semanticTags: tags,
    palette: [],
    embedding
  };
}

describe("clusterMemories", () => {
  it("groups related artifacts", () => {
    const artifacts = [
      artifact("a", "joy", ["family"], [1, 0, 0]),
      artifact("b", "joy", ["family", "party"], [0.9, 0.1, 0]),
      artifact("c", "calm", ["travel"], [0, 1, 0])
    ];

    const clusters = clusterMemories(artifacts, 0.6);
    expect(clusters.length).toBe(2);
  });
});
