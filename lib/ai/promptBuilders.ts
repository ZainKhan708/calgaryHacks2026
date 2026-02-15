import type { SourceType } from "@/types/ai";
import { CATEGORY_OPTIONS } from "@/lib/categories/catalog";

export function analysisPrompt(sourceType: SourceType): string {
  const categoryList = CATEGORY_OPTIONS.map((category) => category.slug).join(", ");
  const common =
    "Return strict JSON with keys: title, description, emotion, sentimentScore, objects, semanticTags, category, palette.";
  const categoryInstruction = `Category must be one of: ${categoryList}.`;

  if (sourceType === "image") {
    return `${common} ${categoryInstruction} Analyze visual semantics, user-provided title/description context, emotional tone, and color palette from the image.`;
  }

  if (sourceType === "audio") {
    return `${common} ${categoryInstruction} Use transcript text plus user-provided title/description to infer narrative themes and emotion.`;
  }

  return `${common} ${categoryInstruction} Analyze text meaning, user-provided title/description, entities, and narrative relevance.`;
}
