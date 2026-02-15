"use client";

import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useTexture } from "@react-three/drei";
import { SRGBColorSpace } from "three";
import type { Object3D, SpotLight } from "three";
import type { ExhibitNode } from "@/types/scene";

/* ── helpers ── */

function scaledDimensions(width: number, height: number): [number, number] {
  const maxW = 2.1;
  const maxH = 1.4;
  if (!width || !height) return [2.0, 1.35];
  const ratio = width / height;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) { h = maxH; w = h * ratio; }
  return [w, h];
}

/* ── placeholder frame (loading / error / no-image) ── */

function PlaceholderFrame() {
  return (
    <>
      <mesh castShadow>
        <boxGeometry args={[2.25, 1.6, 0.1]} />
        <meshStandardMaterial color="#4a3425" roughness={0.58} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[2.0, 1.35]} />
        <meshStandardMaterial color="#d6c7b0" roughness={0.66} emissive="#8d7558" emissiveIntensity={0.08} />
      </mesh>
    </>
  );
}

/* ── error boundary (catches useTexture crashes) ── */

interface EBProps { children: ReactNode; fallback: ReactNode }
interface EBState { hasError: boolean }

class ExhibitErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(): EBState { return { hasError: true }; }
  componentDidCatch(err: unknown) { console.warn("[ExhibitFrame] texture load failed:", err); }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

/* ── image with texture ── */

function ExhibitImage({ url }: { url: string }) {
  const texture = useTexture(url);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  const image = texture.image as { width?: number; height?: number } | undefined;
  const [w, h] = scaledDimensions(image?.width ?? 0, image?.height ?? 0);
  return (
    <>
      <mesh castShadow>
        <boxGeometry args={[w + 0.25, h + 0.25, 0.1]} />
        <meshStandardMaterial color="#4a3425" roughness={0.56} metalness={0.14} />
      </mesh>
      <mesh position={[0, 0, 0.075]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          map={texture}
          color="#ffffff"
          toneMapped={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
    </>
  );
}

/* ── main component ── */

interface ExhibitFrameProps {
  exhibit: ExhibitNode;
  onFocus?: (exhibit: ExhibitNode) => void;
  onBlur?: () => void;
  onInteract?: (exhibit: ExhibitNode) => void;
}

export function ExhibitFrame({ exhibit, onFocus, onBlur, onInteract }: ExhibitFrameProps) {
  const [hovered, setHovered] = useState(false);
  const lightRef = useRef<SpotLight | null>(null);
  const targetRef = useRef<Object3D | null>(null);

  useEffect(() => {
    if (!lightRef.current || !targetRef.current) return;
    lightRef.current.target = targetRef.current;
  }, []);

  return (
    <group
      position={exhibit.position}
      rotation={exhibit.rotation}
      onClick={() => onInteract?.(exhibit)}
    >
      <object3D ref={targetRef} position={[0, 0, 0]} />
      <group
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
          onFocus?.(exhibit);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          setHovered(false);
          onBlur?.();
        }}
      >
        {exhibit.assetUrl ? (
          <ExhibitErrorBoundary fallback={<PlaceholderFrame />}>
            <Suspense fallback={<PlaceholderFrame />}>
              <ExhibitImage url={exhibit.assetUrl} />
            </Suspense>
          </ExhibitErrorBoundary>
        ) : (
          <PlaceholderFrame />
        )}
      </group>
      <spotLight
        ref={lightRef}
        castShadow
        color="#ffd6af"
        intensity={0.9}
        distance={7.5}
        angle={0.31}
        penumbra={0.62}
        position={[0, 1.12, 0.88]}
        shadow-mapSize={[512, 512]}
      />
      {hovered && (
        <pointLight distance={2.4} intensity={1.1} color="#ffd8a8" position={[0, 0, 0.2]} />
      )}
    </group>
  );
}
