import type { CategorySlug } from "@/lib/categories/catalog";
import type { SourceType } from "@/types/ai";

export interface CreateArchiveEntryInput {
  title: string;
  description: string;
  imageDataUrl?: string;
  imageMimeType?: string;
  category: CategorySlug;
  sourceType: SourceType;
  fileName: string;
  fileType: string;
  fileSize: number;
  textContent?: string;
  fileId: string;
  artifactId: string;
  emotion: string;
  sentimentScore: number;
  objects: string[];
  semanticTags: string[];
  palette: string[];
  embedding: number[];
}

export interface ArchiveEntryRecord extends CreateArchiveEntryInput {
  id: string;
  index: number;
  createdAt: string;
}
