import { describe, expect, it } from "vitest";
import { isSceneDefinitionValid } from "@/lib/scene/validation";
import type { SceneDefinition } from "@/types/scene";

describe("scene validation", () => {
  it("accepts a valid scene payload", () => {
    const scene: SceneDefinition = {
      sessionId: "session_x",
      rooms: [
        {
          id: "room_1",
          clusterId: "cluster_1",
          center: [0, 0, -12],
          size: [12, 4.5, 24],
          style: "warm",
          label: "Main Memory Tunnel",
          keywords: ["technology"]
        }
      ],
      exhibits: [
        {
          id: "exhibit_1",
          roomId: "room_1",
          artifactId: "artifact_1",
          assetUrl: "/api/upload?id=file_1&sessionId=session_x",
          position: [-5.8, 1.8, -8],
          rotation: [0, Math.PI / 2, 0],
          plaque: "A memory",
          title: "Memory"
        }
      ],
      connections: []
    };

    expect(isSceneDefinitionValid(scene)).toBe(true);
  });

  it("rejects scene with malformed room geometry", () => {
    const malformed = {
      sessionId: "session_x",
      rooms: [
        {
          id: "room_1",
          clusterId: "cluster_1",
          center: [99999, 0, 0],
          size: [0, 4.5, 24],
          style: "warm",
          label: "Main"
        }
      ],
      exhibits: [
        {
          id: "exhibit_1",
          roomId: "room_1",
          artifactId: "artifact_1",
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          plaque: "A memory",
          title: "Memory"
        }
      ],
      connections: []
    };

    expect(isSceneDefinitionValid(malformed)).toBe(false);
  });
});
