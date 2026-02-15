import { describe, expect, it } from "vitest";
import { buildLayout } from "@/lib/generation/layoutEngine";
import type { MemoryArtifact } from "@/types/ai";
import type { MemoryCluster } from "@/types/cluster";

const artifacts: MemoryArtifact[] = [
  {
    id: "a1",
    fileId: "f1",
    sourceType: "image",
    title: "Test",
    description: "Test",
    emotion: "warm nostalgia",
    sentimentScore: 0.7,
    objects: ["obj"],
    semanticTags: ["tag"],
    palette: ["#fff"],
    embedding: [1, 0]
  }
];

const clusters: MemoryCluster[] = [
  {
    id: "c1",
    theme: "tag memories",
    emotionProfile: "warm nostalgia",
    centroid: [1, 0],
    memberIds: ["a1"],
    tags: ["tag"]
  }
];

describe("buildLayout", () => {
  it("builds rooms and exhibits", () => {
    const out = buildLayout("session_1", clusters, artifacts);
    expect(out.rooms.length).toBe(1);
    expect(out.exhibits.length).toBe(1);
    expect(out.exhibits[0].assetUrl).toContain("sessionId=session_1");
  });
});
