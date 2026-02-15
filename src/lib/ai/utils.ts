import { ZodError } from "zod";

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "that",
  "with",
  "this",
  "from",
  "have",
  "were",
  "your",
  "into",
  "about",
  "they",
  "their",
  "them",
  "over",
  "there",
  "while",
  "where"
]);

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function toApiError(code: string, message: string, details?: unknown): ApiErrorPayload {
  return {
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {})
    }
  };
}

export function extractValidationDetails(error: ZodError): unknown {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code
  }));
}

export function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function nowIso(): string {
  return new Date().toISOString();
}

function seededRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1000000) / 1000000;
  };
}

export function deterministicEmbedding(seedText: string, dimensions = 64): number[] {
  const rand = seededRandom(stableHash(seedText));
  const vec = Array.from({ length: dimensions }, () => rand() * 2 - 1);
  const norm = Math.sqrt(vec.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) return vec;
  return vec.map((value) => value / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  if (!length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i += 1) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    normA += (a[i] ?? 0) * (a[i] ?? 0);
    normB += (b[i] ?? 0) * (b[i] ?? 0);
  }

  if (normA === 0 || normB === 0) return 0;
  return clamp(dot / (Math.sqrt(normA) * Math.sqrt(normB)), 0, 1);
}

export function averageVectors(vectors: number[][]): number[] {
  if (!vectors.length) return [];
  const dimensions = vectors[0]?.length ?? 0;
  if (!dimensions) return [];

  const acc = new Array<number>(dimensions).fill(0);
  for (const vector of vectors) {
    for (let i = 0; i < dimensions; i += 1) {
      acc[i] += vector[i] ?? 0;
    }
  }

  return acc.map((value) => value / vectors.length);
}

export function uniqueTagsFromText(text: string, maxTags = 8): string[] {
  const words = normalizeWhitespace(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word));

  const unique = [...new Set(words)];
  return unique.slice(0, maxTags);
}

export function inferSentiment(text: string): "positive" | "negative" | "neutral" | "mixed" {
  const lower = text.toLowerCase();
  const positiveWords = ["love", "happy", "joy", "great", "fun", "excited", "beautiful", "amazing"];
  const negativeWords = ["sad", "pain", "angry", "loss", "bad", "fear", "stress", "terrible"];

  const positive = positiveWords.reduce((sum, word) => sum + (lower.includes(word) ? 1 : 0), 0);
  const negative = negativeWords.reduce((sum, word) => sum + (lower.includes(word) ? 1 : 0), 0);

  if (positive > 0 && negative > 0) return "mixed";
  if (positive > negative) return "positive";
  if (negative > positive) return "negative";
  return "neutral";
}

export function parseJsonObject(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    const match = input.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Model did not return a JSON object.");
    }
    return JSON.parse(match[0]);
  }
}
