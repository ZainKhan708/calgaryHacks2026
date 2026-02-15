export const MEMORY_CATEGORIES = [
  "science",
  "history",
  "arts",
  "sports",
  "nature",
  "technology",
  "culture",
  "travel"
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

type CategoryKeywordMap = Record<MemoryCategory, readonly string[]>;

const CATEGORY_KEYWORDS: CategoryKeywordMap = {
  science: ["science", "lab", "research", "experiment", "physics", "chemistry", "biology", "astronomy"],
  history: ["history", "historical", "heritage", "archive", "ancient", "museum", "monument", "war"],
  arts: ["art", "painting", "music", "theater", "film", "creative", "gallery", "dance"],
  sports: ["sport", "sports", "soccer", "basketball", "football", "tennis", "athlete", "stadium"],
  nature: ["nature", "forest", "mountain", "river", "ocean", "wildlife", "animal", "landscape"],
  technology: ["technology", "tech", "software", "hardware", "robot", "computer", "code", "ai"],
  culture: ["culture", "tradition", "festival", "community", "ceremony", "family", "food", "language"],
  travel: ["travel", "trip", "journey", "vacation", "tour", "flight", "destination", "adventure"]
};

export interface RenderHints {
  colorTheme: string;
  frameStyle: string;
  importance: number;
}

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function scoreCategoryText(text: string): Record<MemoryCategory, number> {
  const lower = text.toLowerCase();
  const scores = {} as Record<MemoryCategory, number>;

  for (const category of MEMORY_CATEGORIES) {
    const score = CATEGORY_KEYWORDS[category].reduce((sum, keyword) => {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
      return sum + (lower.match(regex)?.length ?? 0);
    }, 0);
    scores[category] = score;
  }

  return scores;
}

export function chooseCategory(text: string, seed = text): MemoryCategory {
  const scores = scoreCategoryText(text);
  const ranked = MEMORY_CATEGORIES
    .map((category) => ({ category, score: scores[category] }))
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) return "culture";
  const secondScore = ranked[1]?.score ?? 0;
  if (ranked[0].score > secondScore) return ranked[0].category;

  const tieSet = ranked.filter((entry) => entry.score === ranked[0].score).map((entry) => entry.category);
  const index = stableHash(seed) % tieSet.length;
  return tieSet[index] ?? "culture";
}

const CATEGORY_THEME: Record<MemoryCategory, { colorTheme: string; frameStyle: string }> = {
  science: { colorTheme: "cool-lab", frameStyle: "metallic-thin" },
  history: { colorTheme: "sepia-archive", frameStyle: "aged-wood" },
  arts: { colorTheme: "vibrant-gallery", frameStyle: "ornate-classic" },
  sports: { colorTheme: "energetic-contrast", frameStyle: "dynamic-wide" },
  nature: { colorTheme: "earthy-organic", frameStyle: "natural-grain" },
  technology: { colorTheme: "neon-minimal", frameStyle: "sleek-carbon" },
  culture: { colorTheme: "warm-social", frameStyle: "textured-matte" },
  travel: { colorTheme: "sunset-postcard", frameStyle: "polaroid-clean" }
};

export function renderHintsForCategory(category: MemoryCategory, confidence: number): RenderHints {
  const base = CATEGORY_THEME[category] ?? CATEGORY_THEME.culture;
  const importance = clamp01(0.4 + confidence * 0.6);
  return {
    colorTheme: base.colorTheme,
    frameStyle: base.frameStyle,
    importance
  };
}
