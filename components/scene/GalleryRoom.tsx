"use client";

import type { RoomNode } from "@/types/scene";

/* Gallery wall colors: warm stone, plaster, and museum tones */
function roomColor(style: RoomNode["style"]): string {
  switch (style) {
    case "warm":
      return "#6b5b4a";
    case "joy":
      return "#7a6f4a";
    case "calm":
      return "#4a5c6b";
    case "chaotic":
      return "#5a4a6b";
    default:
      return "#4a4842";
  }
}

export function GalleryRoom({ room }: { room: RoomNode }) {
  const [w, h, d] = room.size;
  const wallColor = roomColor(room.style);

  return (
    <group>
      <mesh position={[room.center[0], 0, room.center[2]]} receiveShadow>
        <boxGeometry args={[w, 0.1, d]} />
        <meshStandardMaterial color="#1a1814" roughness={0.95} />
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
