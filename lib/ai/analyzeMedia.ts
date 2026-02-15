import type { MemoryArtifact, UploadedFileRef } from "@/types/ai";
import { makeId } from "@/lib/utils/id";
import { getOpenAIClient } from "./client";
import { analysisPrompt } from "./promptBuilders";
import { inferCategoryFromSignals, resolveCategoryPrediction } from "./categoryClassifier";

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

function pseudoEmbedding(seed: string, dims = 24): number[] {
  let x = hashString(seed) || 1;
  const out: number[] = [];
  for (let i = 0; i < dims; i += 1) {
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    out.push(((x >>> 0) / 0xffffffff) * 2 - 1);
  }
  return out;
}

function clampSentimentScore(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0.5;
  return Math.min(1, Math.max(0, num));
}

function asStringArray(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function fallbackArtifact(file: UploadedFileRef): MemoryArtifact {
  const base = file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").trim();
  const title = file.providedTitle?.trim() || base || "Untitled Memory";
  const description =
    file.providedDescription?.trim() || `A ${["warm nostalgia", "joy", "calm reflection", "wonder", "melancholy"][hashString(file.name) % 5]} moment inferred from ${file.name}.`;

  const emotion = ["warm nostalgia", "joy", "calm reflection", "wonder", "melancholy"][hashString(file.name) % 5];
  const tags = `${title} ${description} ${base}`
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);
  const objects = file.sourceType === "image" ? ["person", "scene"] : ["memory fragment"];
  const category = inferCategoryFromSignals([title, description, file.name, file.textContent, ...tags, ...objects]);

  return {
    id: makeId("artifact"),
    fileId: file.id,
    sourceType: file.sourceType,
    title,
    description,
    emotion,
    sentimentScore: 0.55,
    objects,
    semanticTags: tags.length ? tags : ["memory", "archive"],
    category,
    palette: ["#d9c2a7", "#7e5f4a", "#2c2f3a"],
    embedding: pseudoEmbedding(`${file.id}:${file.name}`)
  };
}

export async function analyzeFile(file: UploadedFileRef): Promise<MemoryArtifact> {
  const client = getOpenAIClient();
  if (!client) return fallbackArtifact(file);

  try {
    const metadataContext = [
      `Original file name: ${file.name}`,
      `User title: ${file.providedTitle?.trim() || "N/A"}`,
      `User description: ${file.providedDescription?.trim() || "N/A"}`
    ].join("\n");
    const inputText = file.textContent?.slice(0, 6000) ?? file.name;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: analysisPrompt(file.sourceType) },
            { type: "input_text", text: metadataContext },
            ...(file.sourceType === "image" && file.dataUrl
              ? [{ type: "input_image" as const, image_url: file.dataUrl }]
              : [{ type: "input_text" as const, text: `Source content:\n${inputText}` }])
          ]
        }
      ],
      text: { format: { type: "json_object" } }
    });

    const parsed = JSON.parse(response.output_text || "{}");
    const title =
      typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim()
        : file.providedTitle?.trim() || file.name;
    const description =
      typeof parsed.description === "string" && parsed.description.trim()
        ? parsed.description.trim()
        : file.providedDescription?.trim() || "No description.";
    const objects = asStringArray(parsed.objects, 8);
    const semanticTags = asStringArray(parsed.semanticTags, 10);
    const category = resolveCategoryPrediction(parsed.category ?? parsed.predictedCategory, [
      title,
      description,
      file.name,
      file.textContent,
      ...objects,
      ...semanticTags
    ]);

    return {
      id: makeId("artifact"),
      fileId: file.id,
      sourceType: file.sourceType,
      title,
      description,
      emotion: parsed.emotion ?? "neutral",
      sentimentScore: clampSentimentScore(parsed.sentimentScore),
      objects,
      semanticTags,
      category,
      palette: Array.isArray(parsed.palette) ? parsed.palette.slice(0, 6) : ["#888888"],
      embedding: pseudoEmbedding(`${file.id}:${JSON.stringify(parsed)}`)
    };
  } catch {
    return fallbackArtifact(file);
  }
}

export async function analyzeFiles(files: UploadedFileRef[]): Promise<MemoryArtifact[]> {
  return Promise.all(files.map((file) => analyzeFile(file)));
}
