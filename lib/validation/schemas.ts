import { z } from "zod";

export const uploadedFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  sourceType: z.enum(["image", "text", "audio"]),
  size: z.number(),
  dataUrl: z.string().optional(),
  textContent: z.string().optional(),
  uploadedAt: z.string()
});

export const memoryArtifactSchema = z.object({
  id: z.string(),
  fileId: z.string(),
  sourceType: z.enum(["image", "text", "audio"]),
  title: z.string(),
  description: z.string(),
  emotion: z.string(),
  sentimentScore: z.number(),
  objects: z.array(z.string()),
  semanticTags: z.array(z.string()),
  palette: z.array(z.string()),
  timestamp: z.string().optional(),
  embedding: z.array(z.number())
});

export const clusterSchema = z.object({
  id: z.string(),
  theme: z.string(),
  emotionProfile: z.string(),
  centroid: z.array(z.number()),
  memberIds: z.array(z.string()),
  tags: z.array(z.string())
});
