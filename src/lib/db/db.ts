import { aiAnalysisOutputSchema, clusterResultSchema, type AIAnalysisOutput, type ClusterResult } from "@/src/lib/ai/schemas";

export interface DBAdapter {
  readonly name: string;
  saveAnalysis(analysis: AIAnalysisOutput): Promise<void>;
  getAnalysis(userId: string, memoryId: string): Promise<AIAnalysisOutput | null>;
  listAnalysesByUser(userId: string): Promise<AIAnalysisOutput[]>;
  saveClusters(userId: string, clusters: ClusterResult[]): Promise<void>;
  listClustersByUser(userId: string): Promise<ClusterResult[]>;
}

class InMemoryDBAdapter implements DBAdapter {
  readonly name = "in-memory";

  private analysisByKey = new Map<string, AIAnalysisOutput>();
  private clusterByUser = new Map<string, ClusterResult[]>();

  private analysisKey(userId: string, memoryId: string): string {
    return `${userId}:${memoryId}`;
  }

  async saveAnalysis(analysis: AIAnalysisOutput): Promise<void> {
    const safe = aiAnalysisOutputSchema.parse(analysis);
    this.analysisByKey.set(this.analysisKey(safe.userId, safe.memoryId), safe);
  }

  async getAnalysis(userId: string, memoryId: string): Promise<AIAnalysisOutput | null> {
    return this.analysisByKey.get(this.analysisKey(userId, memoryId)) ?? null;
  }

  async listAnalysesByUser(userId: string): Promise<AIAnalysisOutput[]> {
    const out: AIAnalysisOutput[] = [];
    const prefix = `${userId}:`;

    for (const [key, value] of this.analysisByKey.entries()) {
      if (key.startsWith(prefix)) out.push(value);
    }

    return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async saveClusters(userId: string, clusters: ClusterResult[]): Promise<void> {
    const safe = clusters.map((cluster) => clusterResultSchema.parse(cluster));
    this.clusterByUser.set(userId, safe);
  }

  async listClustersByUser(userId: string): Promise<ClusterResult[]> {
    return this.clusterByUser.get(userId) ?? [];
  }
}

const memoryAdapter = new InMemoryDBAdapter();

export function resolveDBAdapter(): DBAdapter {
  // Hackathon fallback: always functional in-memory adapter.
  // Add external adapters later behind env-based switching.
  return memoryAdapter;
}

export const db = resolveDBAdapter();
