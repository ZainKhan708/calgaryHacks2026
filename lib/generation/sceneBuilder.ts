import type { SceneDefinition } from "@/types/scene";
import type { MemoryArtifact } from "@/types/ai";
import type { MemoryCluster } from "@/types/cluster";
import { buildLayout } from "./layoutEngine";

export function buildScene(sessionId: string, artifacts: MemoryArtifact[], clusters: MemoryCluster[]): SceneDefinition {
  const { rooms, exhibits } = buildLayout(sessionId, clusters, artifacts);
  const connections = rooms.slice(1).map((room, idx) => ({
    fromRoomId: rooms[idx].id,
    toRoomId: room.id
  }));

  return {
    sessionId,
    rooms,
    exhibits,
    connections
  };
}
