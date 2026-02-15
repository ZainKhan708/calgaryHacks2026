import type { SourceType } from "@/types/ai";

interface PromptContextOptions {
  selectedCategory?: string;
  userTitle?: string;
  userDescription?: string;
}

function normalizeInline(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\s+/g, " ") : undefined;
}

export function analysisPrompt(sourceType: SourceType, context?: PromptContextOptions): string {
  const common =
    "Return strict JSON with keys: title, description, emotion, sentimentScore, objects, semanticTags, palette.";
  const selectedCategory = normalizeInline(context?.selectedCategory);
  const userTitle = normalizeInline(context?.userTitle);
  const userDescription = normalizeInline(context?.userDescription);
  const contextLines = [
    selectedCategory ? `Selected category: ${selectedCategory}.` : "Selected category: unknown.",
    userTitle ? `User title hint: ${userTitle}.` : "User title hint: none.",
    userDescription ? `User description hint: ${userDescription}.` : "User description hint: none."
  ].join(" ");
  const qualityInstruction =
    "Improve the description quality by combining user hints with visual/text evidence. " +
    "If user description is vague, rewrite it into a clear, specific museum-ready description. " +
    "Respect selected category context when choosing details and tags.";

  if (sourceType === "image") {
    return `${common} ${contextLines} ${qualityInstruction} Analyze visual semantics, emotional tone, and color palette from the image.`;
  }

  if (sourceType === "audio") {
    return `${common} ${contextLines} ${qualityInstruction} Use transcript text to infer narrative themes and emotion.`;
  }

  return `${common} ${contextLines} ${qualityInstruction} Analyze text meaning, entities, and narrative relevance.`;
}
