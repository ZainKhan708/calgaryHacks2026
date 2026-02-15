import type { MemoryArtifact, UploadedFileRef } from "@/types/ai";
import type { MemoryCluster } from "@/types/cluster";
import type { SceneDefinition } from "@/types/scene";

interface SessionState {
  createdAt: string;
  files: UploadedFileRef[];
  artifacts: MemoryArtifact[];
  clusters: MemoryCluster[];
  selectedCategory?: string;
  scene?: SceneDefinition;
}

declare global {
  // eslint-disable-next-line no-var
  var __mnemosyneSessions: Map<string, SessionState> | undefined;
}

const sessions = globalThis.__mnemosyneSessions ?? new Map<string, SessionState>();
if (!globalThis.__mnemosyneSessions) {
  globalThis.__mnemosyneSessions = sessions;
}

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
