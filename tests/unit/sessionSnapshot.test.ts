import { describe, expect, it } from "vitest";
import { loadSessionSnapshot, saveSessionSnapshot } from "@/lib/storage/sessionSnapshot";
import type { MemoryArtifact, UploadedFileRef } from "@/types/ai";
import type { MemoryCluster } from "@/types/cluster";
import type { SceneDefinition } from "@/types/scene";

describe("sessionSnapshot", () => {
  it("saves and reloads a session snapshot", async () => {
    const sessionId = `session_test_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const files: UploadedFileRef[] = [
      {
        id: "file-1",
        name: "memory.jpg",
        type: "image/jpeg",
        sourceType: "image",
        size: 1024,
        userTitle: "Memory",
        userDescription: "A test memory",
        aiCategory: "science",
        uploadedAt: new Date().toISOString()
      }
    ];
    const artifacts: MemoryArtifact[] = [
      {
        id: "artifact-1",
        fileId: "file-1",
        sourceType: "image",
        title: "Memory",
        description: "A test memory",
        emotion: "neutral",
        sentimentScore: 0.5,
        objects: ["memory"],
        semanticTags: ["test"],
        palette: ["#ffffff"],
        embedding: [0.1, 0.2]
      }
    ];
    const clusters: MemoryCluster[] = [
      {
        id: "cluster-1",
        theme: "test",
        emotionProfile: "neutral",
        centroid: [0.1, 0.2],
        memberIds: ["artifact-1"],
        tags: ["test"]
      }
    ];
    const scene: SceneDefinition = {
      sessionId,
      rooms: [],
      exhibits: [],
      connections: []
    };

    const saved = await saveSessionSnapshot(sessionId, {
      files,
      artifacts,
      clusters,
      scene,
      selectedCategory: "science"
    });
    expect(saved).toBe(true);

    const loaded = await loadSessionSnapshot(sessionId);
    expect(loaded?.sessionId).toBe(sessionId);
    expect(loaded?.files[0]?.id).toBe("file-1");
    expect(loaded?.files[0]?.aiCategory).toBe("science");
    expect(loaded?.artifacts).toHaveLength(1);
    expect(loaded?.clusters).toHaveLength(1);
    expect(loaded?.selectedCategory).toBe("science");
  });
});
