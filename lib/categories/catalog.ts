export const CATEGORY_SLUGS = [
  "science",
  "history",
  "arts",
  "sports",
  "nature",
  "technology",
  "culture",
  "travel"
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export const CATEGORY_OPTIONS = [
  { slug: "science", label: "Science" },
  { slug: "history", label: "History" },
  { slug: "arts", label: "Arts" },
  { slug: "sports", label: "Sports" },
  { slug: "nature", label: "Nature" },
  { slug: "technology", label: "Technology" },
  { slug: "culture", label: "Culture" },
  { slug: "travel", label: "Travel" }
] as const;

const CATEGORY_SET = new Set<string>(CATEGORY_SLUGS);

const NORMALIZED_CATEGORY_LOOKUP = new Map<string, CategorySlug>(
  CATEGORY_OPTIONS.flatMap((category) => [
    [category.slug, category.slug],
    [category.label.toLowerCase(), category.slug]
  ])
);

export function isCategorySlug(value: string): value is CategorySlug {
  return CATEGORY_SET.has(value);
}

export function normalizeCategory(value?: string | null): CategorySlug | undefined {
  if (!value) return undefined;
  return NORMALIZED_CATEGORY_LOOKUP.get(value.trim().toLowerCase());
}

export function categoryLabel(category: CategorySlug): string {
  return CATEGORY_OPTIONS.find((option) => option.slug === category)?.label ?? category;
}
