"use client";

import { useTexture } from "@react-three/drei";
import type { ExhibitNode } from "@/types/scene";

function ExhibitImage({ url }: { url: string }) {
  const texture = useTexture(url);
  return (
    <mesh position={[0, 0, 0.06]}>
      <planeGeometry args={[2.0, 1.35]} />
      <meshStandardMaterial map={texture} color="#ffffff" />
    </mesh>
  );
}

export function ExhibitFrame({ exhibit }: { exhibit: ExhibitNode }) {
  return (
    <group position={exhibit.position} rotation={exhibit.rotation}>
      <mesh castShadow>
        <boxGeometry args={[2.25, 1.6, 0.1]} />
        <meshStandardMaterial color="#3a2a1d" roughness={0.7} />
      </mesh>
      {exhibit.assetUrl ? (
        <ExhibitImage url={exhibit.assetUrl} />
      ) : (
        <mesh position={[0, 0, 0.06]}>
          <planeGeometry args={[2.0, 1.35]} />
          <meshStandardMaterial color="#2a2f3a" emissive="#222734" emissiveIntensity={0.4} />
        </mesh>
      )}
    </group>
  );
}
