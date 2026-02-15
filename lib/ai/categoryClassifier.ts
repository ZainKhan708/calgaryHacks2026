import { CATEGORY_SLUGS, normalizeCategory, type CategorySlug } from "@/lib/categories/catalog";

const CATEGORY_KEYWORDS: Record<CategorySlug, string[]> = {
  science: [
    "science",
    "experiment",
    "physics",
    "chemistry",
    "biology",
    "research",
    "laboratory",
    "astronomy",
    "space",
    "scientific"
  ],
  history: [
    "history",
    "historical",
    "heritage",
    "archive",
    "ancient",
    "century",
    "civilization",
    "artifact",
    "war",
    "museum"
  ],
  arts: [
    "art",
    "painting",
    "sculpture",
    "music",
    "dance",
    "theater",
    "gallery",
    "creative",
    "poem",
    "film"
  ],
  sports: [
    "sports",
    "soccer",
    "football",
    "basketball",
    "tennis",
    "athlete",
    "stadium",
    "match",
    "tournament",
    "training"
  ],
  nature: [
    "nature",
    "forest",
    "mountain",
    "river",
    "ocean",
    "wildlife",
    "animal",
    "landscape",
    "garden",
    "park"
  ],
  technology: [
    "technology",
    "tech",
    "software",
    "computer",
    "robot",
    "digital",
    "device",
    "code",
    "programming",
    "ai"
  ],
  culture: [
    "culture",
    "festival",
    "tradition",
    "community",
    "language",
    "ceremony",
    "custom",
    "family",
    "food",
    "lifestyle"
  ],
  travel: [
    "travel",
    "trip",
    "journey",
    "vacation",
    "tour",
    "flight",
    "hotel",
    "destination",
    "adventure",
    "road"
  ]
};

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordScore(text: string, keyword: string): number {
  const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, "g");
  const matches = text.match(pattern);
  return matches?.length ?? 0;
}

export function inferCategoryFromSignals(signals: Array<string | undefined | null>): CategorySlug {
  const text = signals
    .filter((signal): signal is string => typeof signal === "string" && signal.trim().length > 0)
    .join(" ")
    .toLowerCase();

  if (!text) return "culture";

  let best: CategorySlug = "culture";
  let bestScore = 0;

  for (const category of CATEGORY_SLUGS) {
    const score = CATEGORY_KEYWORDS[category].reduce((sum, keyword) => sum + keywordScore(text, keyword), 0);
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  }

  return best;
}

export function resolveCategoryPrediction(
  prediction: unknown,
  signals: Array<string | undefined | null>
): CategorySlug {
  if (typeof prediction === "string") {
    const normalized = normalizeCategory(prediction);
    if (normalized) return normalized;
  }

  return inferCategoryFromSignals(signals);
}
