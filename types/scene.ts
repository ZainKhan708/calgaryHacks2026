export interface RoomNode {
  id: string;
  clusterId: string;
  center: [number, number, number];
  size: [number, number, number];
  style: "warm" | "joy" | "calm" | "chaotic" | "minimal";
  label: string;
}

export interface ExhibitNode {
  id: string;
  roomId: string;
  artifactId: string;
  assetUrl?: string;
  textFallback?: string;
  position: [number, number, number];
  rotation: [number, number, number];
  plaque: string;
  title: string;
}

export interface ConnectionEdge {
  fromRoomId: string;
  toRoomId: string;
}

export interface SceneDefinition {
  sessionId: string;
  rooms: RoomNode[];
  exhibits: ExhibitNode[];
  connections: ConnectionEdge[];
}
