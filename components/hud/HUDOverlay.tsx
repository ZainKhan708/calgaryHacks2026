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
      <div className="pointer-events-auto absolute top-4 left-4 rounded-lg border border-museum-amber/40 bg-museum-bg-elevated/90 px-4 py-2 text-sm backdrop-blur-sm">
        <div className="text-xs uppercase tracking-wide text-museum-muted">Current Room</div>
        <div className="font-medium text-museum-spotlight">{room?.label ?? "Transit Corridor"}</div>
      </div>

      {exhibit ? (
        <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 w-[min(92vw,640px)] rounded-xl border border-museum-amber/40 bg-museum-surface/95 p-4 backdrop-blur">
          <div className="text-lg font-semibold text-museum-spotlight">{exhibit.title}</div>
          <div className="text-sm text-museum-muted mt-1">{exhibit.plaque}</div>
          <button
            className="mt-3 rounded bg-museum-amber/20 border border-museum-amber/50 px-3 py-1 text-sm text-museum-spotlight hover:bg-museum-amber/30 transition"
            onClick={onNarrate}
          >
            Narrate Plaque
          </button>
        </div>
      ) : null}

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-museum-muted/60">+</div>
      <div className="absolute bottom-4 right-4 text-xs text-museum-dim bg-museum-bg-elevated/90 border border-museum-amber/25 rounded px-2 py-1 backdrop-blur-sm">
        WASD move, mouse drag look, Shift sprint
      </div>
    </div>
  );
}
