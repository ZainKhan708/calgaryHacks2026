import OpenAI from "openai";

let cachedClient: OpenAI | null | undefined;

export function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
}

export function getEmbeddingModel(): string {
  return process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
}

export function getOpenAIClient(): OpenAI | null {
  if (cachedClient !== undefined) return cachedClient;
  if (!hasOpenAIKey()) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  return cachedClient;
}
