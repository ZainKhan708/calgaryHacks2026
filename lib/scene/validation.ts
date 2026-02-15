import type { ExhibitNode, RoomNode, SceneDefinition } from "@/types/scene";

const MAX_COORD = 2000;
const MIN_ROOM_SIZE = 0.5;
const MAX_ROOM_SIZE = 500;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isVec3(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    isFiniteNumber(value[0]) &&
    isFiniteNumber(value[1]) &&
    isFiniteNumber(value[2]) &&
    Math.abs(value[0]) <= MAX_COORD &&
    Math.abs(value[1]) <= MAX_COORD &&
    Math.abs(value[2]) <= MAX_COORD
  );
}

function isRoom(value: unknown): value is RoomNode {
  if (!value || typeof value !== "object") return false;
  const room = value as Partial<RoomNode>;
  const styleValid =
    room.style === "warm" ||
    room.style === "joy" ||
    room.style === "calm" ||
    room.style === "chaotic" ||
    room.style === "minimal";

  if (
    typeof room.id !== "string" ||
    typeof room.clusterId !== "string" ||
    typeof room.label !== "string" ||
    !styleValid ||
    !isVec3(room.center) ||
    !isVec3(room.size)
  ) {
    return false;
  }

  const [w, h, d] = room.size;
  return (
    w >= MIN_ROOM_SIZE &&
    h >= MIN_ROOM_SIZE &&
    d >= MIN_ROOM_SIZE &&
    w <= MAX_ROOM_SIZE &&
    h <= MAX_ROOM_SIZE &&
    d <= MAX_ROOM_SIZE
  );
}

function isExhibit(value: unknown): value is ExhibitNode {
  if (!value || typeof value !== "object") return false;
  const exhibit = value as Partial<ExhibitNode>;
  return (
    typeof exhibit.id === "string" &&
    typeof exhibit.roomId === "string" &&
    typeof exhibit.artifactId === "string" &&
    typeof exhibit.title === "string" &&
    typeof exhibit.plaque === "string" &&
    isVec3(exhibit.position) &&
    isVec3(exhibit.rotation)
  );
}

export function isSceneDefinitionValid(candidate: unknown): candidate is SceneDefinition {
  if (!candidate || typeof candidate !== "object") return false;

  const scene = candidate as Partial<SceneDefinition>;
  if (
    typeof scene.sessionId !== "string" ||
    !Array.isArray(scene.rooms) ||
    scene.rooms.length === 0 ||
    !Array.isArray(scene.exhibits) ||
    scene.exhibits.length === 0 ||
    !Array.isArray(scene.connections)
  ) {
    return false;
  }

  if (!scene.rooms.every(isRoom)) return false;
  if (!scene.exhibits.every(isExhibit)) return false;

  const roomIds = new Set(scene.rooms.map((room) => room.id));
  if (!scene.exhibits.every((exhibit) => roomIds.has(exhibit.roomId))) return false;

  return true;
}
