"use client";

import { useState } from "react";
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

interface ExhibitFrameProps {
  exhibit: ExhibitNode;
  onFocus?: (exhibit: ExhibitNode) => void;
  onBlur?: () => void;
}

export function ExhibitFrame({ exhibit, onFocus, onBlur }: ExhibitFrameProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      position={exhibit.position}
      rotation={exhibit.rotation}
      onPointerOver={() => {
        setHovered(true);
        onFocus?.(exhibit);
      }}
      onPointerOut={() => {
        setHovered(false);
        onBlur?.();
      }}
    >
      <mesh castShadow>
        <boxGeometry args={[2.25, 1.6, 0.1]} />
        <meshStandardMaterial color="#252018" roughness={0.75} />
      </mesh>
      {exhibit.assetUrl ? (
        <ExhibitImage url={exhibit.assetUrl} />
      ) : (
        <mesh position={[0, 0, 0.06]}>
          <planeGeometry args={[2.0, 1.35]} />
          <meshStandardMaterial color="#1e1b18" emissive="#161412" emissiveIntensity={0.35} />
        </mesh>
      )}
      {hovered && (
        <pointLight
          distance={4}
          intensity={1.5}
          color="#FFD8A8"
          position={[0, 0, 0.5]}
        />
      )}
    </group>
  );
}
