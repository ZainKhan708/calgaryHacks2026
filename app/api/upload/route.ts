import { NextRequest, NextResponse } from "next/server";
import { makeId } from "@/lib/utils/id";
import { appendFiles, getSession, setSelectedCategory, upsertSession } from "@/lib/storage/uploadStore";
import type { SourceType, UploadedFileRef } from "@/types/ai";
import {
  isFirebaseConfigured,
  uploadImageToStorage,
  saveImageMetadata,
  getImageMetadata
} from "@/lib/firebase";

function sourceTypeFromMime(type: string): SourceType {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("audio/")) return "audio";
  return "text";
}

/* ─── GET: serve an image by fileId ─── */

export async function GET(req: NextRequest) {
  const fileId = req.nextUrl.searchParams.get("id");
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!fileId || !sessionId)
    return NextResponse.json({ error: "Missing id/sessionId" }, { status: 400 });

  console.log(`[upload/GET] Looking up fileId=${fileId} sessionId=${sessionId}`);

  // 1. Try Firestore images collection (works even after server restart)
  try {
    const meta = await getImageMetadata(fileId);
    if (meta?.downloadUrl) {
      console.log(`[upload/GET] Firebase FOUND, proxying...`);
      return proxyUrl(meta.downloadUrl, meta.type);
    }
    console.log(`[upload/GET] Firebase: not found`);
  } catch (err) {
    console.error(`[upload/GET] Firebase lookup error:`, err);
  }

  // 2. Try in-memory session (works during same dev session)
  const session = getSession(sessionId);
  const file = session?.files.find((f) => f.id === fileId);
  if (file?.dataUrl) {
    console.log(`[upload/GET] In-memory FOUND`);
    if (file.dataUrl.startsWith("http")) return proxyUrl(file.dataUrl, file.type);
    const match = file.dataUrl.match(/^data:(.*?);base64,(.*)$/);
    if (match) {
      return new NextResponse(Buffer.from(match[2], "base64"), {
        headers: { "Content-Type": match[1], "Cache-Control": "no-store" }
      });
    }
  }

  console.log(`[upload/GET] NOT FOUND for fileId=${fileId}`);
  return NextResponse.json({ error: "File not found" }, { status: 404 });
}

/** Fetch a remote URL server-side and return the bytes (avoids CORS). */
async function proxyUrl(url: string, fallbackType?: string): Promise<NextResponse> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[upload/proxy] Failed: ${res.status}`);
      return NextResponse.json({ error: `Image fetch failed: ${res.status}` }, { status: 502 });
    }
    const blob = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || fallbackType || "image/png";
    return new NextResponse(blob, {
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=3600" }
    });
  } catch (err) {
    console.error(`[upload/proxy] Error:`, err);
    return NextResponse.json({ error: "Image proxy error" }, { status: 502 });
  }
}

/* ─── POST: upload files ─── */

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const sessionId = (formData.get("sessionId") as string) || makeId("session");
  const category = (formData.get("category") as string | null)?.trim().toLowerCase() || undefined;
  const metadataRaw = formData.get("metadata");
  let metadata: Array<{ title?: string; description?: string }> = [];
  if (typeof metadataRaw === "string") {
    try {
      const parsed = JSON.parse(metadataRaw);
      if (Array.isArray(parsed)) metadata = parsed;
    } catch {
      metadata = [];
    }
  }

  const files = formData.getAll("files");
  if (!files.length) return NextResponse.json({ error: "No files uploaded" }, { status: 400 });

  upsertSession(sessionId);

  const uploaded: UploadedFileRef[] = [];
  for (let idx = 0; idx < files.length; idx += 1) {
    const f = files[idx];
    if (!(f instanceof File)) continue;
    const sourceType = sourceTypeFromMime(f.type || "text/plain");
    const fileId = makeId("file");
    const input = metadata[idx] ?? {};
    const userTitle = input.title?.trim() ?? "";
    const userDescription = input.description?.trim() ?? "";

    const item: UploadedFileRef = {
      id: fileId,
      name: f.name,
      type: f.type || "text/plain",
      sourceType,
      size: f.size,
      userTitle,
      userDescription,
      uploadedAt: new Date().toISOString()
    };

    if (sourceType === "image") {
      if (isFirebaseConfigured()) {
        console.log(`[upload/POST] Uploading ${f.name} to Firebase Storage...`);
        const result = await uploadImageToStorage(f, sessionId, fileId, item.type);
        if (result) {
          console.log(`[upload/POST] SUCCESS: ${result.storagePath}`);
          item.dataUrl = result.downloadUrl;
          await saveImageMetadata({
            id: fileId,
            sessionId,
            name: item.name,
            type: item.type,
            sourceType: item.sourceType,
            size: item.size,
            downloadUrl: result.downloadUrl,
            storagePath: result.storagePath,
            userTitle,
            userDescription,
            uploadedAt: item.uploadedAt
          });
        } else {
          console.warn(`[upload/POST] Firebase upload returned null, falling back to base64`);
          const buf = Buffer.from(await f.arrayBuffer());
          item.dataUrl = `data:${item.type};base64,${buf.toString("base64")}`;
        }
      } else {
        const buf = Buffer.from(await f.arrayBuffer());
        item.dataUrl = `data:${item.type};base64,${buf.toString("base64")}`;
      }
    } else {
      item.textContent = await f.text();
    }

    uploaded.push(item);
  }

  appendFiles(sessionId, uploaded);
  setSelectedCategory(sessionId, category);
  return NextResponse.json({ sessionId, files: uploaded });
}
