import { NextRequest, NextResponse } from "next/server";
import { analyzeFile } from "@/lib/ai/analyzeMedia";
import { normalizeCategory } from "@/lib/categories/catalog";
import { createArchiveEntry, listArchiveEntries, listArchiveEntriesByCategory } from "@/lib/storage/archiveRepository";
import { makeId } from "@/lib/utils/id";
import type { SourceType, UploadedFileRef } from "@/types/ai";

function sourceTypeFromMime(type: string): SourceType {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("audio/")) return "audio";
  return "text";
}

function asOptionalTrimmed(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

async function buildUploadedFile(file: File, title?: string, description?: string): Promise<UploadedFileRef> {
  const sourceType = sourceTypeFromMime(file.type || "text/plain");
  const uploaded: UploadedFileRef = {
    id: makeId("file"),
    name: file.name,
    type: file.type || "text/plain",
    sourceType,
    size: file.size,
    providedTitle: title,
    providedDescription: description,
    uploadedAt: new Date().toISOString()
  };

  if (sourceType === "image") {
    const buffer = Buffer.from(await file.arrayBuffer());
    uploaded.dataUrl = `data:${uploaded.type};base64,${buffer.toString("base64")}`;
  } else if (sourceType === "text") {
    uploaded.textContent = await file.text();
  } else {
    // MVP fallback until audio transcription is added.
    uploaded.textContent = description || title || file.name;
  }

  return uploaded;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const title = asOptionalTrimmed(formData.get("title"));
  const description = asOptionalTrimmed(formData.get("description"));
  const uploaded = await buildUploadedFile(file, title, description);
  const artifact = await analyzeFile(uploaded);

  const entry = await createArchiveEntry({
    title: artifact.title,
    description: artifact.description,
    imageDataUrl: uploaded.dataUrl,
    imageMimeType: uploaded.type,
    category: artifact.category,
    sourceType: uploaded.sourceType,
    fileName: uploaded.name,
    fileType: uploaded.type,
    fileSize: uploaded.size,
    textContent: uploaded.textContent,
    fileId: artifact.fileId,
    artifactId: artifact.id,
    emotion: artifact.emotion,
    sentimentScore: artifact.sentimentScore,
    objects: artifact.objects,
    semanticTags: artifact.semanticTags,
    palette: artifact.palette,
    embedding: artifact.embedding
  });

  return NextResponse.json({ entry, artifact });
}

export async function GET(req: NextRequest) {
  const categoryQuery = req.nextUrl.searchParams.get("category");
  if (!categoryQuery) {
    const entries = await listArchiveEntries();
    return NextResponse.json({ entries });
  }

  const category = normalizeCategory(categoryQuery);
  if (!category) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const entries = await listArchiveEntriesByCategory(category);
  return NextResponse.json({ category, entries });
}
