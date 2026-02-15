"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ExhibitNode, RoomNode } from "@/types/scene";

export function HUDOverlay({
  room,
  exhibit
}: {
  room?: RoomNode;
  exhibit?: ExhibitNode;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="pointer-events-auto absolute top-4 left-4 rounded-lg border border-museum-amber/40 bg-museum-bg-elevated/90 px-4 py-2 text-sm backdrop-blur-sm">
        <div className="text-xs uppercase tracking-wide text-museum-muted">Current Room</div>
        <div className="font-medium text-museum-spotlight">{room?.label ?? "Transit Corridor"}</div>
      </div>

      <AnimatePresence>
        {exhibit ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-auto fixed bottom-6 left-1/2 -translate-x-1/2 w-[min(92vw,640px)] z-50"
          >
            <div className="rounded-xl border border-museum-amber/40 bg-museum-surface/95 p-4 backdrop-blur">
              <div className="text-lg font-semibold text-museum-spotlight">{exhibit.title}</div>
              <div className="text-sm text-museum-muted mt-1">{exhibit.plaque}</div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-museum-spotlight/80 rounded-full pointer-events-none mix-blend-difference" />
      <div className="absolute bottom-4 right-4 text-xs text-museum-dim bg-museum-bg-elevated/90 border border-museum-amber/25 rounded px-2 py-1 backdrop-blur-sm">
        Click an exhibit to narrate • WASD move • Shift sprint
      </div>
    </div>
  );
}
