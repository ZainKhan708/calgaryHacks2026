"use client";

import type { ExhibitNode, RoomNode } from "@/types/scene";

export function HUDOverlay({
  room,
  exhibit,
  onNarrate
}: {
  room?: RoomNode;
  exhibit?: ExhibitNode;
  onNarrate: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="pointer-events-auto absolute top-4 left-4 rounded-lg border border-white/20 bg-black/40 px-4 py-2 text-sm">
        <div className="text-xs uppercase tracking-wide text-neutral-400">Current Room</div>
        <div className="font-medium">{room?.label ?? "Transit Corridor"}</div>
      </div>

      {exhibit ? (
        <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 w-[min(92vw,640px)] rounded-xl border border-white/20 bg-black/60 p-4 backdrop-blur">
          <div className="text-lg font-semibold">{exhibit.title}</div>
          <div className="text-sm text-neutral-300 mt-1">{exhibit.plaque}</div>
          <button
            className="mt-3 rounded bg-white/20 px-3 py-1 text-sm hover:bg-white/30"
            onClick={onNarrate}
          >
            Narrate Plaque
          </button>
        </div>
      ) : null}

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/60">+</div>
      <div className="absolute bottom-4 right-4 text-xs text-neutral-400 bg-black/35 rounded px-2 py-1">
        WASD move, mouse drag look, Shift sprint
      </div>
    </div>
  );
}
