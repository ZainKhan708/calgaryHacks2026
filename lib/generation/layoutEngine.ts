import type { MemoryArtifact } from "@/types/ai";
import type { MemoryCluster } from "@/types/cluster";
import type { ExhibitNode, RoomNode } from "@/types/scene";
import { roomStyleFromEmotion } from "./styleRules";
import { makeId } from "@/lib/utils/id";

export interface LayoutResult {
  rooms: RoomNode[];
  exhibits: ExhibitNode[];
}

export function buildLayout(
  sessionId: string,
  clusters: MemoryCluster[],
  artifacts: MemoryArtifact[],
  preferredCategory?: string
): LayoutResult {
  const rooms: RoomNode[] = [];
  const exhibits: ExhibitNode[] = [];
  const artifactById = new Map(artifacts.map((a) => [a.id, a]));
  const orderedClusters = [...clusters];

  // Move the category-matching cluster to index 0 so its room spawns first/opened.
  if (preferredCategory) {
    const target = preferredCategory.toLowerCase();
    orderedClusters.sort((a, b) => {
      const aMatch = [a.theme, ...a.tags].join(" ").toLowerCase().includes(target) ? 1 : 0;
      const bMatch = [b.theme, ...b.tags].join(" ").toLowerCase().includes(target) ? 1 : 0;
      return bMatch - aMatch;
    });
  }

  const radius = Math.max(16, orderedClusters.length * 5);

  orderedClusters.forEach((cluster, idx) => {
    const angle = (idx / Math.max(orderedClusters.length, 1)) * Math.PI * 2;
    const center: [number, number, number] = [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];

    const roomId = makeId("room");
    rooms.push({
      id: roomId,
      clusterId: cluster.id,
      center,
      size: [12, 4, 12],
      style: roomStyleFromEmotion(cluster.emotionProfile),
      label: cluster.theme,
      keywords: [cluster.theme, ...cluster.tags]
    });

    const members = cluster.memberIds.map((id) => artifactById.get(id)).filter(Boolean) as MemoryArtifact[];

    members.forEach((artifact, itemIdx) => {
      const wall = itemIdx % 4;
      const offset = -4 + Math.floor(itemIdx / 4) * 2.1;
      let pos: [number, number, number] = [center[0], 1.8, center[2]];
      let rot: [number, number, number] = [0, 0, 0];

      if (wall === 0) {
        pos = [center[0] - 5.8, 1.8, center[2] + offset];
        rot = [0, Math.PI / 2, 0];
      } else if (wall === 1) {
        pos = [center[0] + 5.8, 1.8, center[2] + offset];
        rot = [0, -Math.PI / 2, 0];
      } else if (wall === 2) {
        pos = [center[0] + offset, 1.8, center[2] - 5.8];
        rot = [0, 0, 0];
      } else {
        pos = [center[0] + offset, 1.8, center[2] + 5.8];
        rot = [0, Math.PI, 0];
      }

      exhibits.push({
        id: makeId("exhibit"),
        roomId,
        artifactId: artifact.id,
        assetUrl:
          artifact.sourceType === "image"
            ? `/api/upload?sessionId=${sessionId}&id=${artifact.fileId}`
            : undefined,
        textFallback: artifact.description,
        position: pos,
        rotation: rot,
        plaque: artifact.description,
        title: artifact.title
      });
    });
  });

  return { rooms, exhibits };
}
