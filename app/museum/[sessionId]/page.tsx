"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import type { ExhibitNode, RoomNode, SceneDefinition } from "@/types/scene";
import { MuseumCanvas } from "@/components/scene/MuseumCanvas";
import { HUDOverlay } from "@/components/hud/HUDOverlay";

export default function MuseumPage() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const sessionId = params?.sessionId;
  const selectedCategory = searchParams?.get("category")?.toLowerCase() ?? "";
  const [scene, setScene] = useState<SceneDefinition | null>(null);
  const [room, setRoom] = useState<RoomNode | undefined>(undefined);
  const [exhibit, setExhibit] = useState<ExhibitNode | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const lastNarratedRef = useRef<{ id: string; at: number } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowControls(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let ignore = false;

    async function load() {
      const res = await fetch(`/api/build-scene?sessionId=${sessionId}`);
      if (!res.ok) {
        if (!ignore) setError("Scene not found. Generate from /upload first.");
        return;
      }
      const data = await res.json();
      if (!ignore) setScene(data);
    }

    load();
    return () => {
      ignore = true;
    };
  }, [sessionId]);

  const onFocusChange = useCallback((currentRoom?: RoomNode, currentExhibit?: ExhibitNode) => {
    setRoom(currentRoom);
    setExhibit(currentExhibit);
  }, []);

  const narrateExhibit = useCallback((target: ExhibitNode) => {
    if (!target?.plaque || typeof window === "undefined") return;
    const now = Date.now();
    const last = lastNarratedRef.current;
    // Avoid accidental rapid retriggers from pointer jitter.
    if (last?.id === target.id && now - last.at < 800) return;
    lastNarratedRef.current = { id: target.id, at: now };
    const utterance = new SpeechSynthesisUtterance(target.plaque);
    utterance.rate = 0.95;
    utterance.pitch = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  const initialCameraPosition = useMemo<[number, number, number] | undefined>(() => {
    if (!scene) return undefined;
    const matchingRoom =
      (selectedCategory
        ? scene.rooms.find((roomNode) => {
            const haystack = [roomNode.label, ...(roomNode.keywords ?? [])].join(" ").toLowerCase();
            return haystack.includes(selectedCategory);
          })
        : undefined) ?? scene.rooms[0];
    if (!matchingRoom) return undefined;
    const depth = matchingRoom.size[2] ?? 12;
    return [matchingRoom.center[0], 1.7, matchingRoom.center[2] + depth / 2 - 2];
  }, [scene, selectedCategory]);

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-museum-spotlight">{error}</p>
        <Link href="/upload" className="text-museum-spotlight hover:text-museum-amber underline">
          Go to upload
        </Link>
      </main>
    );
  }

  if (!scene) {
    return <main className="min-h-screen grid place-items-center text-museum-muted">Loading museum...</main>;
  }

  return (
    <main className="relative h-screen w-screen">
      <HUDOverlay room={room} exhibit={exhibit} />
      {showControls && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none text-center">
          <div className="rounded-xl border border-museum-amber/40 bg-museum-bg-elevated/95 p-6 backdrop-blur-sm animate-pulse">
            <h2 className="text-museum-spotlight text-lg font-medium mb-2">Controls</h2>
            <p className="text-museum-muted text-sm">WASD to move • Mouse to look • ESC to unlock</p>
            <p className="mt-4 text-xs text-museum-dim">Click anywhere to start</p>
          </div>
        </div>
      )}
      <div className="absolute top-4 right-4 z-30">
        <Link
          href={`/upload?sessionId=${encodeURIComponent(sessionId ?? "")}${
            selectedCategory ? `&category=${encodeURIComponent(selectedCategory)}` : ""
          }`}
          className="rounded bg-museum-surface border border-museum-amber/50 px-3 py-1 text-sm text-museum-text transition-colors duration-300 hover:bg-museum-warm hover:border-museum-warm hover:text-museum-bg"
        >
          New Upload
        </Link>
      </div>
      <MuseumCanvas
        scene={scene}
        onFocusChange={onFocusChange}
        initialCameraPosition={initialCameraPosition}
        onExhibitInteract={narrateExhibit}
      />
    </main>
  );
}
