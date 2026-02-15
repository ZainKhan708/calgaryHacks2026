import { z } from "zod";
import { MEMORY_CATEGORIES } from "@/src/lib/ai/categories";

export const memoryCategorySchema = z.enum(MEMORY_CATEGORIES);
export const sentimentSchema = z.enum(["positive", "negative", "neutral", "mixed"]);

export const renderHintsSchema = z
  .object({
    colorTheme: z.string().min(1),
    frameStyle: z.string().min(1),
    importance: z.number().min(0).max(1)
  })
  .strict();

export const modelInfoSchema = z
  .object({
    provider: z.enum(["openai", "mock"]),
    model: z.string().min(1),
    fallbackUsed: z.boolean(),
    latencyMs: z.number().nonnegative()
  })
  .strict();

export const analyzeMemoryInputSchema = z
  .object({
    memoryId: z.string().min(1).optional(),
    userId: z.string().min(1),
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(5000),
    imageDataUrl: z.string().startsWith("data:").optional()
  })
  .strict();

export const aiModelResponseSchema = z
  .object({
    category: memoryCategorySchema,
    tags: z.array(z.string().min(1)).min(1).max(12),
    caption: z.string().min(1).max(400),
    summary: z.string().min(1).max(1200),
    sentiment: sentimentSchema,
    confidence: z.number().min(0).max(1)
  })
  .strict();

export const aiAnalysisOutputSchema = z
  .object({
    memoryId: z.string().min(1),
    userId: z.string().min(1),
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(5000),
    category: memoryCategorySchema,
    tags: z.array(z.string().min(1)).min(1).max(12),
    caption: z.string().min(1).max(400),
    summary: z.string().min(1).max(1200),
    sentiment: sentimentSchema,
    confidence: z.number().min(0).max(1),
    embedding: z.array(z.number()).min(8),
    createdAt: z.string().datetime(),
    modelInfo: modelInfoSchema,
    renderHints: renderHintsSchema
  })
  .strict();

export const sceneObjectSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(["room", "hallway", "frame", "anchor"]),
    memoryIds: z.array(z.string().min(1)).min(1),
    importance: z.number().min(0).max(1),
    style: z.string().min(1).optional()
  })
  .strict();

export const clusterResultSchema = z
  .object({
    clusterId: z.string().min(1),
    category: memoryCategorySchema,
    memoryIds: z.array(z.string().min(1)).min(1),
    centroid: z.array(z.number()).min(8),
    averageSimilarity: z.number().min(0).max(1),
    sceneObjects: z.array(sceneObjectSchema).min(1),
    createdAt: z.string().datetime()
  })
  .strict();

export const clusterRequestSchema = z
  .object({
    analyses: z.array(aiAnalysisOutputSchema).min(1).optional(),
    userId: z.string().min(1).optional(),
    threshold: z.number().min(0).max(1).default(0.82)
  })
  .strict()
  .refine((value) => Boolean(value.analyses?.length || value.userId), {
    message: "Provide analyses or userId."
  });

export const apiErrorSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.unknown().optional()
  })
  .strict();

export const apiErrorResponseSchema = z
  .object({
    error: apiErrorSchema
  })
  .strict();

export type AnalyzeMemoryInput = z.infer<typeof analyzeMemoryInputSchema>;
export type AIModelResponse = z.infer<typeof aiModelResponseSchema>;
export type AIAnalysisOutput = z.infer<typeof aiAnalysisOutputSchema>;
export type SceneObject = z.infer<typeof sceneObjectSchema>;
export type ClusterResult = z.infer<typeof clusterResultSchema>;
export type ClusterRequest = z.infer<typeof clusterRequestSchema>;
