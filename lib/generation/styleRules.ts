import type { RoomNode } from "@/types/scene";

export function roomStyleFromEmotion(emotion: string): RoomNode["style"] {
  const e = emotion.toLowerCase();
  if (e.includes("joy")) return "joy";
  if (e.includes("warm") || e.includes("nostalgia")) return "warm";
  if (e.includes("chaos") || e.includes("anx")) return "chaotic";
  if (e.includes("calm") || e.includes("serene")) return "calm";
  return "minimal";
}
