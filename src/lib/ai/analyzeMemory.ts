import { ZodError } from "zod";
import { chooseCategory, renderHintsForCategory } from "@/src/lib/ai/categories";
import { db } from "@/src/lib/db/db";
import { buildAnalyzePrompt, buildEmbeddingText } from "@/src/lib/ai/prompts";
import { getEmbeddingModel, getOpenAIClient, getOpenAIModel } from "@/src/lib/ai/openaiClient";
import {
  aiAnalysisOutputSchema,
  aiModelResponseSchema,
  analyzeMemoryInputSchema,
  type AIAnalysisOutput,
  type AIModelResponse,
  type AnalyzeMemoryInput
} from "@/src/lib/ai/schemas";
import {
  clamp,
  deterministicEmbedding,
  inferSentiment,
  normalizeWhitespace,
  nowIso,
  parseJsonObject,
  stableHash,
  uniqueTagsFromText
} from "@/src/lib/ai/utils";

interface AnalyzeMemoryOptions {
  persist?: boolean;
}

function toMemoryId(input: AnalyzeMemoryInput): string {
  if (input.memoryId) return input.memoryId;
  const seed = `${input.userId}|${input.title}|${input.description}`;
  return `mem_${stableHash(seed).toString(16)}`;
}

function buildFallbackModelResponse(input: AnalyzeMemoryInput): AIModelResponse {
  const fullText = `${input.title} ${input.description}`;
  const category = chooseCategory(fullText, `${input.userId}|${fullText}`);
  const tags = uniqueTagsFromText(`${fullText} ${category}`, 8);
  const summaryBase = normalizeWhitespace(input.description);

  return {
    category,
    tags: tags.length ? tags : [category],
    caption: normalizeWhitespace(`${input.title} - ${summaryBase.slice(0, 120)}`),
    summary: normalizeWhitespace(
      `${input.title} reflects the ${category} theme. ${summaryBase.slice(0, 260)}`
    ),
    sentiment: inferSentiment(fullText),
    confidence: clamp(0.58 + ((stableHash(fullText) % 25) / 100), 0, 1)
  };
}

async function fetchOpenAIAnalysis(input: AnalyzeMemoryInput): Promise<AIModelResponse> {
  const client = getOpenAIClient();
  if (!client) throw new Error("OpenAI client unavailable");

  const response = await client.responses.create({
    model: getOpenAIModel(),
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: buildAnalyzePrompt(input) },
          ...(input.imageDataUrl
            ? [{ type: "input_image" as const, image_url: input.imageDataUrl, detail: "auto" as const }]
            : [])
        ]
      }
    ],
    text: { format: { type: "json_object" } }
  });

  const rawOutput = response.output_text?.trim();
  if (!rawOutput) {
    throw new Error("OpenAI returned empty output.");
  }

  const parsed = parseJsonObject(rawOutput);
  return aiModelResponseSchema.parse(parsed);
}

async function fetchOpenAIEmbedding(inputText: string): Promise<number[]> {
  const client = getOpenAIClient();
  if (!client) throw new Error("OpenAI client unavailable");

  const response = await client.embeddings.create({
    model: getEmbeddingModel(),
    input: inputText
  });

  const embedding = response.data[0]?.embedding;
  if (!embedding?.length) {
    throw new Error("OpenAI returned empty embedding.");
  }

  return embedding;
}

function buildAnalysisOutput(
  input: AnalyzeMemoryInput,
  memoryId: string,
  modelResult: AIModelResponse,
  embedding: number[],
  provider: "openai" | "mock",
  fallbackUsed: boolean,
  modelName: string,
  latencyMs: number
): AIAnalysisOutput {
  const normalizedTitle = normalizeWhitespace(input.title);
  const normalizedDescription = normalizeWhitespace(input.description);

  return aiAnalysisOutputSchema.parse({
    memoryId,
    userId: input.userId,
    title: normalizedTitle,
    description: normalizedDescription,
    category: modelResult.category,
    tags: modelResult.tags.map((tag) => normalizeWhitespace(tag).toLowerCase()).filter(Boolean),
    caption: normalizeWhitespace(modelResult.caption),
    summary: normalizeWhitespace(modelResult.summary),
    sentiment: modelResult.sentiment,
    confidence: clamp(modelResult.confidence, 0, 1),
    embedding,
    createdAt: nowIso(),
    modelInfo: {
      provider,
      model: modelName,
      fallbackUsed,
      latencyMs
    },
    renderHints: renderHintsForCategory(modelResult.category, modelResult.confidence)
  });
}

export async function analyzeMemoryEntry(
  rawInput: AnalyzeMemoryInput,
  options: AnalyzeMemoryOptions = {}
): Promise<AIAnalysisOutput> {
  const input = analyzeMemoryInputSchema.parse(rawInput);
  const memoryId = toMemoryId(input);
  const startedAt = Date.now();
  const openAIModel = getOpenAIModel();

  let modelResult: AIModelResponse;
  let embedding: number[];
  let provider: "openai" | "mock" = "mock";
  let fallbackUsed = true;
  let modelName = "deterministic-mock-v1";

  try {
    modelResult = await fetchOpenAIAnalysis(input);
    const embeddingText = buildEmbeddingText(input, modelResult.tags);
    embedding = await fetchOpenAIEmbedding(embeddingText);
    provider = "openai";
    fallbackUsed = false;
    modelName = openAIModel;
  } catch {
    modelResult = buildFallbackModelResponse(input);
    const seed = `${input.userId}|${input.title}|${input.description}|${modelResult.category}`;
    embedding = deterministicEmbedding(seed, 64);
  }

  const output = buildAnalysisOutput(
    input,
    memoryId,
    modelResult,
    embedding,
    provider,
    fallbackUsed,
    modelName,
    Date.now() - startedAt
  );

  if (options.persist !== false) {
    await db.saveAnalysis(output);
  }

  return output;
}

export function isValidationError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}
