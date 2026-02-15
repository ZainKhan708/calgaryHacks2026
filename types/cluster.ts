export interface MemoryCluster {
  id: string;
  theme: string;
  emotionProfile: string;
  centroid: number[];
  memberIds: string[];
  tags: string[];
}

export interface ClusterResult {
  sessionId: string;
  clusters: MemoryCluster[];
}
