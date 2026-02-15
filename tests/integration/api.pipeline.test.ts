import { describe, expect, it } from "vitest";
import { buildScene } from "@/lib/generation/sceneBuilder";
import { clusterMemories } from "@/lib/clustering/clusterMemories";
import type { MemoryArtifact } from "@/types/ai";

describe("pipeline integration", () => {
  it("creates scene from artifacts", () => {
    const artifacts: MemoryArtifact[] = [
      {
        id: "a",
        fileId: "f",
        sourceType: "image",
        title: "A",
        description: "Desc",
        emotion: "joy",
        sentimentScore: 0.8,
        objects: [],
        semanticTags: ["family"],
        category: "culture",
        palette: ["#111"],
        embedding: [0.3, 0.4]
      }
    ];

    const clusters = clusterMemories(artifacts);
    const scene = buildScene("s1", artifacts, clusters);

    expect(scene.rooms.length).toBeGreaterThan(0);
    expect(scene.exhibits.length).toBeGreaterThan(0);
  });
});
