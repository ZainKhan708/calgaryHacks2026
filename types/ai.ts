export type SourceType = "image" | "text" | "audio";

export interface UploadedFileRef {
  id: string;
  name: string;
  type: string;
  sourceType: SourceType;
  size: number;
  userTitle?: string;
  userDescription?: string;
  aiCategory?: string;
  aiTags?: string[];
  aiCaption?: string;
  aiSummary?: string;
  aiSentiment?: string;
  aiConfidence?: number;
  dataUrl?: string;
  textContent?: string;
  uploadedAt: string;
}

export interface MemoryArtifact {
  id: string;
  fileId: string;
  sourceType: SourceType;
  title: string;
  description: string;
  emotion: string;
  sentimentScore: number;
  objects: string[];
  semanticTags: string[];
  palette: string[];
  timestamp?: string;
  embedding: number[];
}

export interface AnalyzeResponse {
  sessionId: string;
  artifacts: MemoryArtifact[];
}
