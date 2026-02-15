"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import type { ExhibitNode, RoomNode, SceneDefinition } from "@/types/scene";
import { HUDOverlay } from "@/components/hud/HUDOverlay";

const MuseumCanvas = dynamic(
  () => import("@/components/scene/MuseumCanvas").then((m) => m.MuseumCanvas),
  { ssr: false }
);

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

    // 1. Check sessionStorage first (cached from pipeline response)
    try {
      const cached = sessionStorage.getItem(`scene_${sessionId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.rooms && parsed?.exhibits) {
          setScene(parsed);
          sessionStorage.removeItem(`scene_${sessionId}`);
          return;
        }
      }
    } catch { /* unavailable */ }

    // 2. Fall back to build-scene API with retries
    async function load(retries = 3) {
      const res = await fetch(`/api/build-scene?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (!ignore) setScene(data);
        return;
      }
      if (res.status === 404 && retries > 0) {
        await new Promise((r) => setTimeout(r, 800));
        if (!ignore) load(retries - 1);
        return;
      }
      if (!ignore) setError("Scene not found. Generate from /upload first.");
    }

    const t = setTimeout(() => load(), 150);
    return () => { ignore = true; clearTimeout(t); };
  }, [sessionId]);

  const onFocusChange = useCallback((currentRoom?: RoomNode, currentExhibit?: ExhibitNode) => {
    setRoom(currentRoom);
    setExhibit(currentExhibit);
  }, []);

  const narrateExhibit = useCallback((target: ExhibitNode) => {
    if (!target?.plaque || typeof window === "undefined") return;
    const now = Date.now();
    const last = lastNarratedRef.current;
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
        ? scene.rooms.find((r) => {
            const haystack = [r.label, ...(r.keywords ?? [])].join(" ").toLowerCase();
            return haystack.includes(selectedCategory);
          })
        : undefined) ?? scene.rooms[0];
    if (!matchingRoom) return undefined;
    const depth = matchingRoom.size[2] ?? 12;
    return [matchingRoom.center[0], 1.7, matchingRoom.center[2] + depth / 2 - 2];
  }, [scene, selectedCategory]);

  if (error) {
    return (
      <main className="min-h-screen p-8 flex flex-col items-center justify-center bg-[#0f1115] gap-4">
        <p className="text-museum-spotlight text-lg">{error}</p>
        <Link href="/upload" className="rounded-md bg-museum-surface border-2 border-museum-amber/60 px-6 py-3 text-museum-text hover:bg-museum-warm hover:border-museum-amber transition-colors">
          Go to upload
        </Link>
      </main>
    );
  }

  if (!scene) {
    return <main className="min-h-screen grid place-items-center text-museum-muted bg-[#0f1115]">Loading museum...</main>;
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
      <div className="absolute top-4 right-4 z-30">
        <Link
          href={`/upload?sessionId=${encodeURIComponent(sessionId ?? "")}${selectedCategory ? `&category=${encodeURIComponent(selectedCategory)}` : ""}`}
          className="rounded bg-museum-surface border border-museum-amber/50 px-3 py-1 text-sm text-museum-text transition-colors duration-300 hover:bg-museum-warm hover:border-museum-warm hover:text-museum-bg"
        >
          New Upload
        </Link>
      </div>
      <MuseumCanvas scene={scene} onFocusChange={onFocusChange} initialCameraPosition={initialCameraPosition} onExhibitInteract={narrateExhibit} />
    </main>
  );
}
