"use client";

import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { Suspense } from "react";
import type { ExhibitNode, RoomNode, SceneDefinition } from "@/types/scene";
import { MuseumScene } from "./MuseumScene";
import { FPSController } from "./FPSController";

export function MuseumCanvas({
  scene,
  onFocusChange,
  initialCameraPosition,
  onExhibitInteract
}: {
  scene: SceneDefinition;
  onFocusChange: (room?: RoomNode, exhibit?: ExhibitNode) => void;
  initialCameraPosition?: [number, number, number];
  onExhibitInteract?: (exhibit: ExhibitNode) => void;
}) {
  return (
    <>
      <Canvas shadows camera={{ fov: 75, position: [0, 1.7, 8] }} style={{ background: "#0f1115" }}>
        <color attach="background" args={["#0f1115"]} />
        <ambientLight intensity={0.35} />
        <directionalLight castShadow position={[8, 10, 6]} intensity={1.2} shadow-mapSize={[2048, 2048]} />
        <pointLight position={[0, 4, 0]} intensity={0.6} color="#ffe4bc" />
        <Suspense fallback={null}>
          <Environment preset="city" />
        </Suspense>
        <MuseumScene scene={scene} onFocusChange={onFocusChange} onExhibitInteract={onExhibitInteract} />
        <FPSController initialPosition={initialCameraPosition} />
      </Canvas>
    </>
  );
}
