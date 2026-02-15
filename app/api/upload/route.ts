import { NextRequest, NextResponse } from "next/server";
import { makeId } from "@/lib/utils/id";
import { getSession, setFiles, upsertSession } from "@/lib/storage/uploadStore";
import type { SourceType, UploadedFileRef } from "@/types/ai";

interface UploadEntryMetadata {
  title?: string;
  description?: string;
}

function sourceTypeFromMime(type: string): SourceType {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("audio/")) return "audio";
  return "text";
}

function parseEntryMetadata(rawMetadata: FormDataEntryValue | null): UploadEntryMetadata[] {
  if (typeof rawMetadata !== "string") return [];
  try {
    const parsed = JSON.parse(rawMetadata);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      title: typeof item?.title === "string" ? item.title.trim() : undefined,
      description: typeof item?.description === "string" ? item.description.trim() : undefined
    }));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const fileId = req.nextUrl.searchParams.get("id");
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!fileId || !sessionId) return NextResponse.json({ error: "Missing id/sessionId" }, { status: 400 });

  const session = getSession(sessionId);
  const file = session?.files.find((f) => f.id === fileId);
  if (!file?.dataUrl) return NextResponse.json({ error: "File not found" }, { status: 404 });

  const match = file.dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) return NextResponse.json({ error: "Invalid asset" }, { status: 400 });

  const mime = match[1];
  const bytes = Buffer.from(match[2], "base64");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "no-store"
    }
  });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const sessionId = (formData.get("sessionId") as string) || makeId("session");
  const entryMetadata = parseEntryMetadata(formData.get("entries"));

  const files = formData.getAll("files");
  if (!files.length) return NextResponse.json({ error: "No files uploaded" }, { status: 400 });

  upsertSession(sessionId);

  const uploaded: UploadedFileRef[] = [];
  for (const [index, f] of files.entries()) {
    if (!(f instanceof File)) continue;
    const sourceType = sourceTypeFromMime(f.type || "text/plain");
    const fileId = makeId("file");
    const metadata = entryMetadata[index];

    const item: UploadedFileRef = {
      id: fileId,
      name: f.name,
      type: f.type || "text/plain",
      sourceType,
      size: f.size,
      providedTitle: metadata?.title || undefined,
      providedDescription: metadata?.description || undefined,
      uploadedAt: new Date().toISOString()
    };

    if (sourceType === "image") {
      const buf = Buffer.from(await f.arrayBuffer());
      item.dataUrl = `data:${item.type};base64,${buf.toString("base64")}`;
    } else {
      item.textContent = await f.text();
    }

    uploaded.push(item);
  }

  setFiles(sessionId, uploaded);
  return NextResponse.json({ sessionId, files: uploaded });
}
