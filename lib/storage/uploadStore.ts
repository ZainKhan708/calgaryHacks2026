import type { MemoryArtifact, UploadedFileRef } from "@/types/ai";
import type { MemoryCluster } from "@/types/cluster";
import type { SceneDefinition } from "@/types/scene";

export interface SessionState {
  createdAt: string;
  files: UploadedFileRef[];
  artifacts: MemoryArtifact[];
  clusters: MemoryCluster[];
  selectedCategory?: string;
  scene?: SceneDefinition;
}

const sessions = new Map<string, SessionState>();

export function createSession(sessionId: string): SessionState {
  const state: SessionState = {
    createdAt: new Date().toISOString(),
    files: [],
    artifacts: [],
    clusters: []
  };
  sessions.set(sessionId, state);
  return state;
}

export function getSession(sessionId: string): SessionState | undefined {
  return sessions.get(sessionId);
}

export function upsertSession(sessionId: string): SessionState {
  return getSession(sessionId) ?? createSession(sessionId);
}

export function setFiles(sessionId: string, files: UploadedFileRef[]): void {
  const state = upsertSession(sessionId);
  state.files = files;
}

export function appendFiles(sessionId: string, files: UploadedFileRef[]): void {
  const state = upsertSession(sessionId);
  state.files = [...state.files, ...files];
}

export function setArtifacts(sessionId: string, artifacts: MemoryArtifact[]): void {
  const state = upsertSession(sessionId);
  state.artifacts = artifacts;
}

export function setClusters(sessionId: string, clusters: MemoryCluster[]): void {
  const state = upsertSession(sessionId);
  state.clusters = clusters;
}

export function setScene(sessionId: string, scene: SceneDefinition): void {
  const state = upsertSession(sessionId);
  state.scene = scene;
}

export function setSelectedCategory(sessionId: string, category?: string): void {
  const state = upsertSession(sessionId);
  if (category) state.selectedCategory = category;
}

/** Restore a full session from Firestore data into the in-memory store. */
export function restoreSession(
  sessionId: string,
  data: {
    files: UploadedFileRef[];
    artifacts: MemoryArtifact[];
    clusters: MemoryCluster[];
    scene?: SceneDefinition;
    selectedCategory?: string;
  }
): void {
  const state = upsertSession(sessionId);
  state.files = data.files ?? [];
  state.artifacts = data.artifacts ?? [];
  state.clusters = data.clusters ?? [];
  if (data.scene) state.scene = data.scene;
  if (data.selectedCategory) state.selectedCategory = data.selectedCategory;
}
