import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { MemoryArtifact, UploadedFileRef } from "@/types/ai";
import type { MemoryCluster } from "@/types/cluster";
import type { SceneDefinition } from "@/types/scene";

export interface SessionSnapshotPayload {
  files: UploadedFileRef[];
  artifacts: MemoryArtifact[];
  clusters: MemoryCluster[];
  scene?: SceneDefinition;
  selectedCategory?: string;
}

export interface PersistedSessionSnapshot extends SessionSnapshotPayload {
  sessionId: string;
}

const SNAPSHOT_DIR = path.join(os.tmpdir(), "mnemosyne-sessions");

function snapshotPath(sessionId: string): string {
  const safeSessionId = sessionId.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(SNAPSHOT_DIR, `${safeSessionId}.json`);
}

function parsePersistedSnapshot(value: unknown): PersistedSessionSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;

  if (typeof candidate.sessionId !== "string") return null;
  if (!Array.isArray(candidate.files)) return null;
  if (!Array.isArray(candidate.artifacts)) return null;
  if (!Array.isArray(candidate.clusters)) return null;

  return {
    sessionId: candidate.sessionId,
    files: candidate.files as UploadedFileRef[],
    artifacts: candidate.artifacts as MemoryArtifact[],
    clusters: candidate.clusters as MemoryCluster[],
    scene:
      candidate.scene && typeof candidate.scene === "object"
        ? (candidate.scene as SceneDefinition)
        : undefined,
    selectedCategory:
      typeof candidate.selectedCategory === "string" ? candidate.selectedCategory : undefined
  };
}

export async function saveSessionSnapshot(
  sessionId: string,
  payload: SessionSnapshotPayload
): Promise<boolean> {
  try {
    await mkdir(SNAPSHOT_DIR, { recursive: true });
    const snapshot: PersistedSessionSnapshot = { sessionId, ...payload };
    await writeFile(snapshotPath(sessionId), JSON.stringify(snapshot), "utf8");
    return true;
  } catch (error) {
    console.error("[sessionSnapshot] save failed:", error);
    return false;
  }
}

export async function loadSessionSnapshot(
  sessionId: string
): Promise<PersistedSessionSnapshot | null> {
  try {
    const raw = await readFile(snapshotPath(sessionId), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return parsePersistedSnapshot(parsed);
  } catch {
    return null;
  }
}
