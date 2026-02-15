import type { MemoryArtifact } from "@/types/ai";
import type { MemoryCluster } from "@/types/cluster";
import type { ExhibitNode, RoomNode } from "@/types/scene";
import { roomStyleFromEmotion } from "./styleRules";
import { makeId } from "@/lib/utils/id";

export interface LayoutResult {
  rooms: RoomNode[];
  exhibits: ExhibitNode[];
}

function formatCategoryMuseumLabel(category?: string): string {
  const trimmed = category?.trim().toLowerCase();
  if (!trimmed) return "Memory Museum";
  const spaced = trimmed.replace(/[_-]/g, " ");
  return `${spaced.charAt(0).toUpperCase()}${spaced.slice(1)} Museum`;
}

export function buildLayout(
  sessionId: string,
  clusters: MemoryCluster[],
  artifacts: MemoryArtifact[],
  preferredCategory?: string
): LayoutResult {
  const rooms: RoomNode[] = [];
  const exhibits: ExhibitNode[] = [];
  const dominantEmotion = clusters[0]?.emotionProfile ?? artifacts[0]?.emotion ?? "neutral";
  const allKeywords = Array.from(
    new Set(
      [
        preferredCategory,
        ...clusters.flatMap((c) => [c.theme, ...c.tags]),
        ...artifacts.flatMap((a) => a.semanticTags)
      ].filter(Boolean)
    )
  ) as string[];

  // Single adaptive tunnel: grows with file count so all artifacts remain in one museum.
  const pairCount = Math.ceil(Math.max(artifacts.length, 1) / 2);
  const laneSpacing = 3.2;
  const frontPadding = 8;
  const backPadding = 8;
  const tunnelLength = Math.max(24, frontPadding + backPadding + (pairCount - 1) * laneSpacing);
  const tunnelWidth = 12;
  const roomCenter: [number, number, number] = [0, 0, -tunnelLength / 2];
  const roomId = makeId("room");

  rooms.push({
    id: roomId,
    clusterId: "main-tunnel",
    center: roomCenter,
    size: [tunnelWidth, 4.5, tunnelLength],
    style: roomStyleFromEmotion(dominantEmotion),
    label: formatCategoryMuseumLabel(preferredCategory),
    keywords: allKeywords
  });

  artifacts.forEach((artifact, idx) => {
    const isLeft = idx % 2 === 0;
    const lane = Math.floor(idx / 2);
    const z = -frontPadding - lane * laneSpacing;
    const pos: [number, number, number] = [isLeft ? -5.8 : 5.8, 1.8, z];
    const rot: [number, number, number] = [0, isLeft ? Math.PI / 2 : -Math.PI / 2, 0];

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

  return { rooms, exhibits };
}
