import type { MemoryArtifact, UploadedFileRef } from "@/types/ai";
import { makeId } from "@/lib/utils/id";
import { getOpenAIClient } from "./client";
import { analysisPrompt } from "./promptBuilders";

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

function fallbackArtifact(file: UploadedFileRef): MemoryArtifact {
  const base = file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
  const userTitle = file.userTitle?.trim();
  const userDescription = file.userDescription?.trim();
  const emotion = ["warm nostalgia", "joy", "calm reflection", "wonder", "melancholy"][hashString(file.name) % 5];
  const tags = base
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);

  return {
    id: makeId("artifact"),
    fileId: file.id,
    sourceType: file.sourceType,
    title: userTitle || base || "Untitled Memory",
    description: userDescription || `A ${emotion} moment inferred from ${file.name}.`,
    emotion,
    sentimentScore: 0.55,
    objects: file.sourceType === "image" ? ["person", "scene"] : ["memory fragment"],
    semanticTags: tags.length ? tags : ["memory", "archive"],
    palette: ["#d9c2a7", "#7e5f4a", "#2c2f3a"],
    embedding: pseudoEmbedding(`${file.id}:${file.name}`)
  };
}

export async function analyzeFile(file: UploadedFileRef): Promise<MemoryArtifact> {
  const client = getOpenAIClient();
  if (!client) return fallbackArtifact(file);

  try {
    const inputText = file.sourceType === "text" ? file.textContent ?? file.name : `File name: ${file.name}`;
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: analysisPrompt(file.sourceType) },
            ...(file.sourceType === "image" && file.dataUrl
              ? [{ type: "input_image" as const, image_url: file.dataUrl, detail: "auto" as const }]
              : [{ type: "input_text" as const, text: inputText }])
          ]
        }
      ],
      text: { format: { type: "json_object" } }
    });

    const parsed = JSON.parse(response.output_text || "{}");
    const userTitle = file.userTitle?.trim();
    const userDescription = file.userDescription?.trim();

    return {
      id: makeId("artifact"),
      fileId: file.id,
      sourceType: file.sourceType,
      title: userTitle || parsed.title || file.name,
      description: userDescription || parsed.description || "No description.",
      emotion: parsed.emotion ?? "neutral",
      sentimentScore: Number(parsed.sentimentScore ?? 0.5),
      objects: Array.isArray(parsed.objects) ? parsed.objects.slice(0, 8) : [],
      semanticTags: Array.isArray(parsed.semanticTags) ? parsed.semanticTags.slice(0, 10) : [],
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
