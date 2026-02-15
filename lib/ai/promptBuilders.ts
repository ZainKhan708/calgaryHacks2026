import type { SourceType } from "@/types/ai";

export function analysisPrompt(sourceType: SourceType): string {
  const common =
    "Return strict JSON with keys: title, description, emotion, sentimentScore, objects, semanticTags, palette.";

  if (sourceType === "image") {
    return `${common} Analyze visual semantics, emotional tone, and color palette from the image.`;
  }

  if (sourceType === "audio") {
    return `${common} Use transcript text to infer narrative themes and emotion.`;
  }

  return `${common} Analyze text meaning, entities, and narrative relevance.`;
}
