import { describe, expect, it } from "vitest";
import { analyzeMemoryEntry } from "@/src/lib/ai/analyzeMemory";
import { clusterAnalyses } from "@/src/lib/ai/cluster";

describe("AI processing layer", () => {
  it("returns deterministic mock analysis without API key", async () => {
    const input = {
      userId: "u_1",
      title: "Hiking above the clouds",
      description: "We climbed a mountain trail and watched the sunset over the valley."
    };

    const a = await analyzeMemoryEntry(input, { persist: false });
    const b = await analyzeMemoryEntry(input, { persist: false });

    expect(a.modelInfo.provider).toBe("mock");
    expect(a.memoryId).toBe(b.memoryId);
    expect(a.category).toBe(b.category);
    expect(a.tags).toEqual(b.tags);
    expect(a.embedding.length).toBe(64);
  });

  it("clusters analyses by embedding similarity", async () => {
    const base = {
      userId: "u_2",
      title: "Museum visit",
      description: "An evening at the gallery with paintings and sculptures."
    };

    const first = await analyzeMemoryEntry(base, { persist: false });
    const second = { ...first, memoryId: "mem_2" };
    const third = {
      ...first,
      memoryId: "mem_3",
      embedding: first.embedding.map((value) => value * -1)
    };

    const clusters = clusterAnalyses([first, second, third], 0.75);
    expect(clusters.length).toBeGreaterThanOrEqual(2);
    expect(clusters[0].sceneObjects.length).toBeGreaterThan(0);
  });
});
