"use client";

import type { RoomNode } from "@/types/scene";

function roomColor(style: RoomNode["style"]): string {
  switch (style) {
    case "warm":
      return "#8b6b4a";
    case "joy":
      return "#9a8f4a";
    case "calm":
      return "#4a708b";
    case "chaotic":
      return "#6f4a8b";
    default:
      return "#4e5361";
  }
}

export function GalleryRoom({ room }: { room: RoomNode }) {
  const [w, h, d] = room.size;
  const wallColor = roomColor(room.style);

  return (
    <group>
      <mesh position={[room.center[0], 0, room.center[2]]} receiveShadow>
        <boxGeometry args={[w, 0.1, d]} />
        <meshStandardMaterial color="#2a2f3b" roughness={0.95} />
      </mesh>

      <mesh position={[room.center[0] - w / 2, h / 2, room.center[2]]} castShadow>
        <boxGeometry args={[0.2, h, d]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} />
      </mesh>
      <mesh position={[room.center[0] + w / 2, h / 2, room.center[2]]} castShadow>
        <boxGeometry args={[0.2, h, d]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} />
      </mesh>
      <mesh position={[room.center[0], h / 2, room.center[2] - d / 2]} castShadow>
        <boxGeometry args={[w, h, 0.2]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} />
      </mesh>
      <mesh position={[room.center[0], h / 2, room.center[2] + d / 2]} castShadow>
        <boxGeometry args={[w, h, 0.2]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} />
      </mesh>
    </group>
  );
}
