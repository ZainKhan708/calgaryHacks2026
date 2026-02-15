"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ExhibitNode, RoomNode, SceneDefinition } from "@/types/scene";
import { MuseumCanvas } from "@/components/scene/MuseumCanvas";
import { HUDOverlay } from "@/components/hud/HUDOverlay";

export default function MuseumPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId;
  const [scene, setScene] = useState<SceneDefinition | null>(null);
  const [room, setRoom] = useState<RoomNode | undefined>(undefined);
  const [exhibit, setExhibit] = useState<ExhibitNode | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

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

  const onNarrate = useCallback(() => {
    if (!exhibit?.plaque || typeof window === "undefined") return;
    const utterance = new SpeechSynthesisUtterance(exhibit.plaque);
    utterance.rate = 0.95;
    utterance.pitch = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [exhibit?.plaque]);

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
      <HUDOverlay room={room} exhibit={exhibit} onNarrate={onNarrate} />
      <div className="absolute top-4 right-4 z-30">
        <Link href="/upload" className="rounded bg-museum-surface border border-museum-amber/50 px-3 py-1 text-sm text-museum-text transition-colors duration-300 hover:bg-museum-warm hover:border-museum-warm hover:text-museum-bg">
          New Upload
        </Link>
      </div>
      <MuseumCanvas scene={scene} onFocusChange={onFocusChange} />
    </main>
  );
}
