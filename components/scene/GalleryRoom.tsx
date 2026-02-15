"use client";

import { useMemo } from "react";
import { Text } from "@react-three/drei";
import type { RoomNode } from "@/types/scene";

interface PillarProps {
  position: [number, number, number];
  height: number;
}

interface CenterExhibitWallProps {
  position: [number, number, number];
  width: number;
  height: number;
  accentColor: string;
}

const FLOOR_COLOR = "#d9d7d2";
const WALL_COLOR = "#f3efe8";
const ARCH_COLOR = "#e3ddd3";
const PILLAR_COLOR = "#e7e4df";
const FRAME_COLOR = "#4a3425";
const SECTION_FRAME_COLOR = "#151211";

function accentFromStyle(style: RoomNode["style"]): string {
  switch (style) {
    case "warm":
      return "#bc8a6a";
    case "joy":
      return "#b48a44";
    case "calm":
      return "#6d879f";
    case "chaotic":
      return "#8a6f9c";
    default:
      return "#8f8b84";
  }
}

export function Pillar({ position, height }: PillarProps) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.34, 0.4, 0.12, 12]} />
        <meshStandardMaterial color="#d8d4ce" roughness={0.46} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, height / 2 + 0.12, 0]}>
        <cylinderGeometry args={[0.22, 0.26, height, 14]} />
        <meshStandardMaterial color={PILLAR_COLOR} roughness={0.34} metalness={0.02} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, height + 0.2, 0]}>
        <cylinderGeometry args={[0.3, 0.24, 0.16, 12]} />
        <meshStandardMaterial color="#d9d5cf" roughness={0.4} />
      </mesh>
    </group>
  );
}

export function CenterExhibitWall({ position, width, height, accentColor }: CenterExhibitWallProps) {
  const panelW = Math.min(2.8, width * 0.62);
  const panelH = Math.min(1.75, height * 0.6);
  const panelY = height * 0.56;
  const trimZ = 0.122;

  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, 0.22]} />
        <meshStandardMaterial color="#e8e1d6" roughness={0.76} />
      </mesh>

      {/* Accent belt wraps the center wall so it reads from all angles */}
      <mesh position={[0, height * 0.42, 0]}>
        <boxGeometry args={[width + 0.01, 0.16, 0.235]} />
        <meshStandardMaterial color={accentColor} roughness={0.58} metalness={0.06} />
      </mesh>
      <mesh position={[0, height * 0.26, 0]}>
        <boxGeometry args={[width + 0.01, 0.08, 0.24]} />
        <meshStandardMaterial color="#d6c8b0" roughness={0.62} />
      </mesh>

      {/* Display frame outline on front side */}
      <mesh castShadow position={[0, panelY + panelH / 2, trimZ]}>
        <boxGeometry args={[panelW + 0.08, 0.05, 0.03]} />
        <meshStandardMaterial color={SECTION_FRAME_COLOR} roughness={0.44} />
      </mesh>
      <mesh castShadow position={[0, panelY - panelH / 2, trimZ]}>
        <boxGeometry args={[panelW + 0.08, 0.05, 0.03]} />
        <meshStandardMaterial color={SECTION_FRAME_COLOR} roughness={0.44} />
      </mesh>
      <mesh castShadow position={[-panelW / 2, panelY, trimZ]}>
        <boxGeometry args={[0.05, panelH + 0.08, 0.03]} />
        <meshStandardMaterial color={SECTION_FRAME_COLOR} roughness={0.44} />
      </mesh>
      <mesh castShadow position={[panelW / 2, panelY, trimZ]}>
        <boxGeometry args={[0.05, panelH + 0.08, 0.03]} />
        <meshStandardMaterial color={SECTION_FRAME_COLOR} roughness={0.44} />
      </mesh>

      {/* Display frame outline on back side */}
      <mesh castShadow position={[0, panelY + panelH / 2, -trimZ]}>
        <boxGeometry args={[panelW + 0.08, 0.05, 0.03]} />
        <meshStandardMaterial color={SECTION_FRAME_COLOR} roughness={0.44} />
      </mesh>
      <mesh castShadow position={[0, panelY - panelH / 2, -trimZ]}>
        <boxGeometry args={[panelW + 0.08, 0.05, 0.03]} />
        <meshStandardMaterial color={SECTION_FRAME_COLOR} roughness={0.44} />
      </mesh>
      <mesh castShadow position={[-panelW / 2, panelY, -trimZ]}>
        <boxGeometry args={[0.05, panelH + 0.08, 0.03]} />
        <meshStandardMaterial color={SECTION_FRAME_COLOR} roughness={0.44} />
      </mesh>
      <mesh castShadow position={[panelW / 2, panelY, -trimZ]}>
        <boxGeometry args={[0.05, panelH + 0.08, 0.03]} />
        <meshStandardMaterial color={SECTION_FRAME_COLOR} roughness={0.44} />
      </mesh>
    </group>
  );
}

function EndSectionWall({
  z,
  width,
  height,
  label,
  accentColor
}: {
  z: number;
  width: number;
  height: number;
  label: string;
  accentColor: string;
}) {
  const cleanLabel = label.trim() || "Memory Gallery";
  const title = cleanLabel.length > 38 ? `${cleanLabel.slice(0, 35)}...` : cleanLabel;
  const pillarOffset = Math.max(1.8, width * 0.36);

  return (
    <group position={[0, 0, z]}>
      <Pillar position={[-pillarOffset, 0, 0]} height={height * 0.86} />
      <Pillar position={[pillarOffset, 0, 0]} height={height * 0.86} />

      <mesh castShadow receiveShadow position={[0, height * 0.48, -0.02]}>
        <boxGeometry args={[Math.max(3.8, width * 0.72), height * 0.7, 0.14]} />
        <meshStandardMaterial color="#efe7da" roughness={0.74} />
      </mesh>
      <mesh position={[0, height * 0.76, 0.02]}>
        <boxGeometry args={[Math.max(4, width * 0.75), 0.16, 0.18]} />
        <meshStandardMaterial color={accentColor} roughness={0.5} metalness={0.06} />
      </mesh>
      <mesh castShadow position={[0, height * 0.48, 0.07]}>
        <boxGeometry args={[Math.max(4, width * 0.76), height * 0.74, 0.06]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.56} metalness={0.14} />
      </mesh>

      <Text
        position={[0, height * 0.5, 0.11]}
        fontSize={Math.max(0.35, Math.min(0.62, width * 0.07))}
        maxWidth={Math.max(3.2, width * 0.68)}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        color="#4d3a2a"
      >
        {title}
      </Text>
    </group>
  );
}

export function GalleryRoom({ room }: { room: RoomNode }) {
  const [w, h, d] = room.size;
  const corridorHeight = Math.max(2.6, h);
  const accentColor = accentFromStyle(room.style);

  const segmentCount = useMemo(() => Math.max(2, Math.floor(d / 9)), [d]);
  const segmentSpacing = useMemo(() => d / (segmentCount + 1), [d, segmentCount]);

  const segmentCenters = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < segmentCount; i += 1) {
      out.push(-d / 2 + segmentSpacing * (i + 1));
    }
    return out.length ? out : [0];
  }, [d, segmentSpacing, segmentCount]);

  const pillarPositions = useMemo(() => {
    const count = Math.max(2, segmentCount + 1);
    const start = -d / 2 + 1.2;
    const end = d / 2 - 1.2;
    const step = count > 1 ? (end - start) / (count - 1) : 0;
    const out: number[] = [];
    for (let i = 0; i < count; i += 1) out.push(start + i * step);
    if (!out.length) out.push(0);
    return out;
  }, [d, segmentCount]);

  const centerWallPositions = useMemo(() => {
    const out = segmentCenters.filter((_, idx) => idx % 2 === 1);
    if (!out.length && segmentCenters.length) {
      return [segmentCenters[Math.floor(segmentCenters.length / 2)]];
    }
    return out;
  }, [segmentCenters]);

  const sideWallX = w / 2 - 0.12;
  const pillarX = w / 2 - 0.48;

  return (
    <group position={room.center}>
      {/* Polished marble floor */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[w, 0.1, d]} />
        <meshStandardMaterial color="#c5c0b9" roughness={0.3} metalness={0.08} />
      </mesh>

      {/* Primary side walls */}
      <mesh position={[-sideWallX, corridorHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.22, corridorHeight, d]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.78} />
      </mesh>
      <mesh position={[sideWallX, corridorHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.22, corridorHeight, d]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.78} />
      </mesh>

      {/* End walls */}
      <mesh position={[0, corridorHeight / 2, -d / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, corridorHeight, 0.22]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.8} />
      </mesh>
      <mesh position={[0, corridorHeight / 2, d / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, corridorHeight, 0.22]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.8} />
      </mesh>

      {/* Rhythmic marble pillars */}
      {pillarPositions.map((z, i) => (
        <group key={`${room.id}-pillar-row-${i}`}>
          <Pillar position={[-pillarX, 0, z]} height={corridorHeight - 0.48} />
          <Pillar position={[pillarX, 0, z]} height={corridorHeight - 0.48} />
        </group>
      ))}

      {/* Center freestanding exhibit partitions */}
      {centerWallPositions.map((z, i) => (
        <CenterExhibitWall
          key={`${room.id}-center-wall-${i}`}
          position={[0, 0, z]}
          width={Math.max(3.8, w * 0.42)}
          height={Math.min(2.7, corridorHeight * 0.82)}
          accentColor={accentColor}
        />
      ))}

      {/* End-of-tunnel identity wall keeps section labeling tied to generated room metadata */}
      <EndSectionWall
        z={d / 2 - 0.42}
        width={w}
        height={corridorHeight}
        label={room.label}
        accentColor={accentColor}
      />

      {/* Warm ceiling lighting (from yousafBranch) */}
      {(() => {
        const roofLightCount = Math.max(3, Math.floor(d / 8));
        const roofLightStart = -d / 2 + 4;
        return Array.from({ length: roofLightCount }).map((_, i) => {
          const z = roofLightStart + i * 8;
          return (
            <group key={`${room.id}-rooflight-${i}`} position={[0, corridorHeight - 0.2, z]}>
              <mesh>
                <boxGeometry args={[w * 0.35, 0.06, 0.14]} />
                <meshStandardMaterial color="#ffd8a8" emissive="#ffd8a8" emissiveIntensity={1.4} />
              </mesh>
              <pointLight intensity={0.45} distance={11} color="#ffd8a8" position={[0, -0.1, 0]} />
            </group>
          );
        });
      })()}

      {/* Category directory signs on short walls (from yousafBranch) */}
      <group position={[0, corridorHeight / 2 + 0.15, -d / 2 + 0.13]}>
        <Text
          fontSize={0.8}
          lineHeight={1.05}
          maxWidth={Math.max(3, w - 1.4)}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          color="#ffd700"
          outlineColor="#000000"
          outlineWidth={0.03}
          fontWeight={800}
        >
          {room.label.toUpperCase()}
        </Text>
      </group>
      <group position={[0, corridorHeight / 2 + 0.15, d / 2 - 0.13]} rotation={[0, Math.PI, 0]}>
        <Text
          fontSize={0.8}
          lineHeight={1.05}
          maxWidth={Math.max(3, w - 1.4)}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          color="#ffd700"
          outlineColor="#000000"
          outlineWidth={0.03}
          fontWeight={800}
        >
          {room.label.toUpperCase()}
        </Text>
      </group>

      {/* Crown trim lines to anchor perspective */}
      <mesh position={[0, corridorHeight - 0.12, 0]} receiveShadow>
        <boxGeometry args={[w - 0.3, 0.08, d]} />
        <meshStandardMaterial color="#e8e1d7" roughness={0.52} />
      </mesh>
    </group>
  );
}
