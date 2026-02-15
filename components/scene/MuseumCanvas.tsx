"use client";

import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import type { ExhibitNode, RoomNode, SceneDefinition } from "@/types/scene";
import { MuseumScene } from "./MuseumScene";
import { PlayerController } from "./PlayerController";

export function MuseumCanvas({
  scene,
  onFocusChange
}: {
  scene: SceneDefinition;
  onFocusChange: (room?: RoomNode, exhibit?: ExhibitNode) => void;
}) {
  return (
    <Canvas shadows camera={{ fov: 70, position: [0, 1.7, 8] }}>
      <color attach="background" args={["#0f1115"]} />
      <ambientLight intensity={0.35} />
      <directionalLight castShadow position={[8, 10, 6]} intensity={1.2} shadow-mapSize={[2048, 2048]} />
      <pointLight position={[0, 4, 0]} intensity={0.6} color="#ffe4bc" />
      <Environment preset="city" />
      <MuseumScene scene={scene} onFocusChange={onFocusChange} />
      <PlayerController />
    </Canvas>
  );
}
