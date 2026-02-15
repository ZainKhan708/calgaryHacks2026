"use client";

import { Component, Suspense, useState, type ReactNode } from "react";
import { useTexture } from "@react-three/drei";
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
        <meshStandardMaterial color="#252018" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[2.0, 1.35]} />
        <meshStandardMaterial color="#1e1b18" emissive="#161412" emissiveIntensity={0.35} />
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
  const image = texture.image as { width?: number; height?: number } | undefined;
  const [w, h] = scaledDimensions(image?.width ?? 0, image?.height ?? 0);
  return (
    <>
      <mesh castShadow>
        <boxGeometry args={[w + 0.25, h + 0.25, 0.1]} />
        <meshStandardMaterial color="#252018" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={texture} color="#ffffff" />
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
  return (
    <group
      position={exhibit.position}
      rotation={exhibit.rotation}
      onPointerOver={() => { setHovered(true); onFocus?.(exhibit); }}
      onPointerOut={() => { setHovered(false); onBlur?.(); }}
      onClick={() => onInteract?.(exhibit)}
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
      {hovered && (
        <pointLight distance={4} intensity={1.5} color="#FFD8A8" position={[0, 0, 0.5]} />
      )}
    </group>
  );
}
