import { MEMORY_CATEGORIES } from "@/src/lib/ai/categories";
import type { AnalyzeMemoryInput } from "@/src/lib/ai/schemas";

export function buildAnalyzePrompt(input: AnalyzeMemoryInput): string {
  const categoryList = MEMORY_CATEGORIES.join(", ");
  const imageNote = input.imageDataUrl
    ? "An image is attached. Use it together with title and description."
    : "No image is attached. Use title and description only.";
  const selectedCategoryNote = input.selectedCategory
    ? `User selected category hint: ${input.selectedCategory}. Use this as strong context unless evidence clearly contradicts it.`
    : "No category hint was selected by the user.";

  return [
    "You are an AI analysis layer for a memory archive.",
    "Classify the memory into EXACTLY one category from this list:",
    categoryList,
    imageNote,
    selectedCategoryNote,
    "Return strict JSON only (no markdown) with keys:",
    "category, tags, caption, summary, sentiment, confidence",
    "Rules:",
    "- tags: array of 3 to 8 concise tags",
    "- caption: one short descriptive sentence",
    "- summary: 2-3 sentence improved description grounded in the image/text and user input",
    "- sentiment: one of positive|negative|neutral|mixed",
    "- confidence: float between 0 and 1",
    "",
    `Title: ${input.title}`,
    `Description: ${input.description}`
  ].join("\n");
}

export function buildEmbeddingText(input: Pick<AnalyzeMemoryInput, "title" | "description">, tags: string[]): string {
  return [input.title, input.description, tags.join(", ")].filter(Boolean).join("\n");
}
