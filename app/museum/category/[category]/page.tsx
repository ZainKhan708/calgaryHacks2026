"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { categoryLabel, normalizeCategory } from "@/lib/categories/catalog";
import { MuseumCanvas } from "@/components/scene/MuseumCanvas";
import { HUDOverlay } from "@/components/hud/HUDOverlay";
import type { ExhibitNode, RoomNode, SceneDefinition } from "@/types/scene";

export default function CategoryMuseumPage() {
  const params = useParams<{ category: string }>();
  const categoryParam = params?.category;
  const category = useMemo(() => normalizeCategory(categoryParam), [categoryParam]);
  const [scene, setScene] = useState<SceneDefinition | null>(null);
  const [room, setRoom] = useState<RoomNode | undefined>(undefined);
  const [exhibit, setExhibit] = useState<ExhibitNode | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!category) {
      setError("Invalid category.");
      return;
    }

    let ignore = false;
    async function loadCategoryMuseum() {
      const res = await fetch(`/api/category-scene?category=${category}`);
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        if (!ignore) setError(payload.error ?? "Failed to load category museum.");
        return;
      }

      const data = (await res.json()) as { scene?: SceneDefinition };
      if (!ignore && data.scene) setScene(data.scene);
    }

    void loadCategoryMuseum();
    return () => {
      ignore = true;
    };
  }, [category]);

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
      <main className="min-h-screen p-8 space-y-4">
        <p className="text-museum-spotlight">{error}</p>
        <Link href="/categories" className="text-museum-spotlight hover:text-museum-amber underline">
          Back to categories
        </Link>
      </main>
    );
  }

  if (!scene || !category) {
    return <main className="min-h-screen grid place-items-center text-museum-muted">Loading category museum...</main>;
  }

  return (
    <main className="relative h-screen w-screen">
      <HUDOverlay room={room} exhibit={exhibit} onNarrate={onNarrate} />
      <div className="absolute top-4 right-4 z-30 flex gap-2">
        <Link
          href="/categories"
          className="rounded bg-museum-surface border border-museum-amber/50 px-3 py-1 text-sm text-museum-text transition-colors duration-300 hover:bg-museum-warm hover:border-museum-warm hover:text-museum-bg"
        >
          Back to Categories
        </Link>
        <Link
          href="/upload"
          className="rounded bg-museum-surface border border-museum-amber/50 px-3 py-1 text-sm text-museum-text transition-colors duration-300 hover:bg-museum-warm hover:border-museum-warm hover:text-museum-bg"
        >
          Upload New
        </Link>
      </div>
      <div className="absolute top-4 left-4 z-30 rounded-lg border border-museum-amber/40 bg-museum-bg-elevated/90 px-4 py-2 text-sm backdrop-blur-sm text-museum-spotlight">
        Category: {categoryLabel(category)}
      </div>
      <MuseumCanvas scene={scene} onFocusChange={onFocusChange} />
    </main>
  );
}
