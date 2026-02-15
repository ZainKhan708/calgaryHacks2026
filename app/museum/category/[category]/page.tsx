"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ExhibitNode, RoomNode, SceneDefinition } from "@/types/scene";
import { HUDOverlay } from "@/components/hud/HUDOverlay";
import { isSceneDefinitionValid } from "@/lib/scene/validation";

const MuseumCanvas = dynamic(
  () => import("@/components/scene/MuseumCanvas").then((m) => m.MuseumCanvas),
  { ssr: false }
);

function toLabel(value: string): string {
  const spaced = value.replace(/[_-]/g, " ");
  return `${spaced.charAt(0).toUpperCase()}${spaced.slice(1)}`;
}

function applyCategoryRoomLabel(scene: SceneDefinition, categoryLabel: string): SceneDefinition {
  const normalized = `${categoryLabel} Museum`;
  return {
    ...scene,
    rooms: scene.rooms.map((room) => ({
      ...room,
      label: normalized,
      keywords: Array.from(new Set([...(room.keywords ?? []), categoryLabel.toLowerCase()]))
    }))
  };
}

export default function CategoryMuseumPage() {
  const params = useParams<{ category: string }>();
  const router = useRouter();
  const category = params?.category?.toLowerCase() ?? "";
  const categoryLabel = useMemo(() => toLabel(category), [category]);

  const [scene, setScene] = useState<SceneDefinition | null>(null);
  const [room, setRoom] = useState<RoomNode | undefined>(undefined);
  const [exhibit, setExhibit] = useState<ExhibitNode | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowControls(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!category) {
      setError("Category not provided.");
      return;
    }

    let ignore = false;

    async function loadCategoryScene(retries = 3): Promise<SceneDefinition | null> {
      const res = await fetch(`/api/build-scene?category=${encodeURIComponent(category)}`);
      if (res.ok) {
        const data = (await res.json()) as unknown;
        if (isSceneDefinitionValid(data)) return data;
      }
      if (res.status === 404 && retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        return loadCategoryScene(retries - 1);
      }
      return null;
    }

    async function load() {
      const categoryScene = await loadCategoryScene(3);
      if (categoryScene) {
        if (!ignore) {
          setScene(applyCategoryRoomLabel(categoryScene, categoryLabel));
          setError(null);
        }
        return;
      }

      // If direct category aggregation misses, fallback to latest session for that category.
      try {
        const sessionsRes = await fetch(`/api/sessions?category=${encodeURIComponent(category)}&limit=1`);
        if (sessionsRes.ok) {
          const sessions = (await sessionsRes.json()) as Array<{ sessionId?: string }>;
          const latestSessionId = sessions[0]?.sessionId;
          if (latestSessionId) {
            if (!ignore) router.replace(`/museum/${latestSessionId}?category=${encodeURIComponent(category)}`);
            return;
          }
        }
      } catch {
        // keep error fallback below
      }

      if (!ignore) setError(`No images found for "${categoryLabel}". Upload some images first!`);
    }

    const timer = setTimeout(() => {
      void load();
    }, 100);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [category, categoryLabel, router]);

  const onFocusChange = useCallback((currentRoom?: RoomNode, currentExhibit?: ExhibitNode) => {
    setRoom(currentRoom);
    setExhibit(currentExhibit);
  }, []);

  const initialCameraPosition = useMemo<[number, number, number] | undefined>(() => {
    if (!scene) return undefined;
    const firstRoom = scene.rooms[0];
    if (!firstRoom) return undefined;
    const depth = firstRoom.size[2] ?? 12;
    return [firstRoom.center[0], 1.7, firstRoom.center[2] + depth / 2 - 2];
  }, [scene]);

  if (error) {
    return (
      <main className="min-h-screen p-8 flex flex-col items-center justify-center bg-[#0f1115] gap-4">
        <p className="text-museum-spotlight text-lg">{error}</p>
        <Link href="/categories" className="rounded-md bg-museum-surface border-2 border-museum-amber/60 px-6 py-3 text-museum-text hover:bg-museum-warm hover:border-museum-amber transition-colors">
          ← Categories
        </Link>
      </main>
    );
  }

  if (!scene) {
    return <main className="min-h-screen grid place-items-center text-museum-muted bg-[#0f1115]">Loading {categoryLabel} museum...</main>;
  }

  return (
    <main className="relative h-screen w-screen">
      <HUDOverlay room={room} exhibit={exhibit} />
      {showControls && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none text-center">
          <div className="rounded-xl border border-museum-amber/40 bg-museum-bg-elevated/95 p-6 backdrop-blur-sm animate-pulse">
            <h2 className="text-museum-spotlight text-lg font-medium mb-2">Controls</h2>
            <p className="text-museum-muted text-sm">WASD to move &bull; Mouse to look &bull; ESC to unlock</p>
            <p className="mt-4 text-xs text-museum-dim">Click anywhere to start</p>
          </div>
        </div>
      )}
      <div className="absolute top-20 left-4 z-30">
        <Link
          href="/categories"
          className="rounded bg-museum-surface border border-museum-amber/50 px-3 py-1 text-sm text-museum-text transition-colors duration-300 hover:bg-museum-warm hover:border-museum-warm hover:text-museum-bg"
        >
          ← Categories
        </Link>
      </div>
      <MuseumCanvas
        key={`category-canvas:${category}:${scene.sessionId}:${scene.exhibits.length}`}
        scene={scene}
        onFocusChange={onFocusChange}
        initialCameraPosition={initialCameraPosition}
        onExhibitInteract={undefined}
      />
    </main>
  );
}
