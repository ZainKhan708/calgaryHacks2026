"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useState, useCallback } from "react";
import type { ExhibitNode, RoomNode, SceneDefinition } from "@/types/scene";
import { GalleryRoom } from "./GalleryRoom";
import { ExhibitFrame } from "./ExhibitFrame";

interface Props {
  scene: SceneDefinition;
  onFocusChange: (room?: RoomNode, exhibit?: ExhibitNode) => void;
  onExhibitInteract?: (exhibit: ExhibitNode) => void;
}

export function LightingSetup() {
  return (
    <>
      {/* Soft base fill to keep museum mood warm without flattening contrast */}
      <ambientLight intensity={0.14} color="#f4ede1" />
      {/* Skylight for directional shadowing and architectural depth */}
      <directionalLight
        castShadow
        position={[6, 12, 4]}
        intensity={0.55}
        color="#fff6e8"
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      {/* Subtle warm floor bounce for softer undersides */}
      <pointLight position={[0, 0.85, 0]} intensity={0.2} distance={80} color="#f7dcc2" />
    </>
  );
}

function DustParticles({ scene }: { scene: SceneDefinition }) {
  const positions = useMemo(() => {
    const minX = Math.min(...scene.rooms.map((r) => r.center[0] - r.size[0] / 2)) - 2;
    const maxX = Math.max(...scene.rooms.map((r) => r.center[0] + r.size[0] / 2)) + 2;
    const minZ = Math.min(...scene.rooms.map((r) => r.center[2] - r.size[2] / 2)) - 2;
    const maxZ = Math.max(...scene.rooms.map((r) => r.center[2] + r.size[2] / 2)) + 2;

    const count = 220;
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const base = i * 3;
      data[base] = minX + Math.random() * (maxX - minX);
      data[base + 1] = 0.25 + Math.random() * 3.4;
      data[base + 2] = minZ + Math.random() * (maxZ - minZ);
    }
    return data;
  }, [scene]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={positions.length / 3} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#fff3de" size={0.022} sizeAttenuation transparent opacity={0.22} depthWrite={false} />
    </points>
  );
}

export function MuseumScene({ scene, onFocusChange, onExhibitInteract }: Props) {
  const { camera } = useThree();
  const [pointerExhibit, setPointerExhibit] = useState<ExhibitNode | null>(null);

  const roomById = useMemo(() => new Map(scene.rooms.map((r) => [r.id, r])), [scene.rooms]);
  const onExhibitFocus = useCallback((ex: ExhibitNode) => setPointerExhibit(ex), []);
  const onExhibitBlur = useCallback(() => setPointerExhibit(null), []);

  useFrame(() => {
    let nearestExhibit: ExhibitNode | undefined;
    let nearestDist = Number.POSITIVE_INFINITY;

    for (const exhibit of scene.exhibits) {
      const dx = camera.position.x - exhibit.position[0];
      const dy = camera.position.y - exhibit.position[1];
      const dz = camera.position.z - exhibit.position[2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < nearestDist) {
        nearestDist = d;
        nearestExhibit = exhibit;
      }
    }

    let currentRoom: RoomNode | undefined;
    let roomDist = Number.POSITIVE_INFINITY;
    for (const room of scene.rooms) {
      const dx = camera.position.x - room.center[0];
      const dz = camera.position.z - room.center[2];
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < roomDist) {
        roomDist = d;
        currentRoom = room;
      }
    }

    // Pointer/look takes precedence; otherwise use proximity
    const exhibit = pointerExhibit ?? (nearestDist < 3.5 ? nearestExhibit : undefined);
    onFocusChange(currentRoom, exhibit);
  });

  return (
    <group>
      <LightingSetup />
      <fog attach="fog" args={["#110f0d", 14, 92]} />

      {/* Dark shell acts like a lightweight vignette for peripheral falloff */}
      <mesh scale={[220, 220, 220]}>
        <sphereGeometry args={[1, 18, 18]} />
        <meshBasicMaterial color="#0a0908" transparent opacity={0.12} side={1} depthWrite={false} />
      </mesh>

      <mesh receiveShadow position={[0, -0.07, 0]}>
        <boxGeometry args={[560, 0.12, 560]} />
        <meshStandardMaterial color="#cbc7c1" roughness={0.24} metalness={0.09} />
      </mesh>

      {scene.rooms.map((room) => (
        <GalleryRoom key={room.id} room={room} />
      ))}

      {scene.exhibits.map((exhibit) => (
        <ExhibitFrame
          key={exhibit.id}
          exhibit={exhibit}
          onFocus={onExhibitFocus}
          onBlur={onExhibitBlur}
          onInteract={onExhibitInteract}
        />
      ))}

      {scene.connections.map((edge) => {
        const a = roomById.get(edge.fromRoomId);
        const b = roomById.get(edge.toRoomId);
        if (!a || !b) return null;
        const mx = (a.center[0] + b.center[0]) / 2;
        const mz = (a.center[2] + b.center[2]) / 2;
        const dx = b.center[0] - a.center[0];
        const dz = b.center[2] - a.center[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);
        return (
          <mesh key={`${edge.fromRoomId}-${edge.toRoomId}`} position={[mx, 0.02, mz]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[length, 0.04, 1.2]} />
            <meshStandardMaterial color="#d0cbbf" roughness={0.35} metalness={0.08} />
          </mesh>
        );
      })}

      <DustParticles scene={scene} />
    </group>
  );
}
