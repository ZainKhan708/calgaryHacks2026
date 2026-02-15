"use client";

import { Canvas } from "@react-three/fiber";
import { Loader } from "@react-three/drei";
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
      <Canvas shadows camera={{ fov: 75, position: [0, 1.7, 8] }}>
        <color attach="background" args={["#0f1115"]} />
        <ambientLight intensity={0.08} />
        <directionalLight castShadow position={[8, 10, 6]} intensity={0.35} shadow-mapSize={[1024, 1024]} />
        <pointLight position={[0, 4, 0]} intensity={0.12} color="#ffe4bc" />
        <Suspense fallback={null}>
          <MuseumScene scene={scene} onFocusChange={onFocusChange} onExhibitInteract={onExhibitInteract} />
          <FPSController initialPosition={initialCameraPosition} />
        </Suspense>
      </Canvas>
      <Loader />
    </>
  );
}
