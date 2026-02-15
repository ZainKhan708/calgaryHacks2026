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
      <mesh receiveShadow position={[0, -0.06, 0]}>
        <boxGeometry args={[500, 0.1, 500]} />
        <meshStandardMaterial color="#171a22" />
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
            <meshStandardMaterial color="#303646" />
          </mesh>
        );
      })}
    </group>
  );
}
