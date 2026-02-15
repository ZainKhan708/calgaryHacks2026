"use client";

import { Text } from "@react-three/drei";
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

const CATEGORY_SIGN_LINES = [
  "Science Museum",
  "History Museum",
  "Arts Museum",
  "Sports Museum",
  "Nature Museum",
  "Technology Museum",
  "Culture Museum",
  "Travel Museum"
];

export function GalleryRoom({ room }: { room: RoomNode }) {
  const [w, h, d] = room.size;
  const wallColor = roomColor(room.style);
  const roofLightCount = Math.max(3, Math.floor(d / 8));
  const roofLightStart = room.center[2] - d / 2 + 4;

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

      {/* Roof slab */}
      <mesh position={[room.center[0], h + 0.08, room.center[2]]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.25, 0.16, d + 0.25]} />
        <meshStandardMaterial color="#221d17" roughness={0.45} metalness={0.12} />
      </mesh>

      {/* Warm ceiling lighting */}
      {Array.from({ length: roofLightCount }).map((_, i) => {
        const z = roofLightStart + i * 8;
        return (
          <group key={`${room.id}-rooflight-${i}`} position={[room.center[0], h - 0.2, z]}>
            <mesh>
              <boxGeometry args={[w * 0.35, 0.06, 0.14]} />
              <meshStandardMaterial color="#ffd8a8" emissive="#ffd8a8" emissiveIntensity={1.4} />
            </mesh>
            <pointLight intensity={0.45} distance={11} color="#ffd8a8" position={[0, -0.1, 0]} />
          </group>
        );
      })}

      {/* Category directory sign on a short wall */}
      <group position={[room.center[0], h / 2 + 0.15, room.center[2] - d / 2 + 0.13]}>
        <Text
          fontSize={0.34}
          lineHeight={1.25}
          maxWidth={Math.max(3, w - 1.4)}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          color="#ffe1bc"
          outlineColor="#000000"
          outlineWidth={0.008}
          fontWeight={700}
        >
          {CATEGORY_SIGN_LINES.join("\n")}
        </Text>
      </group>
    </group>
  );
}
