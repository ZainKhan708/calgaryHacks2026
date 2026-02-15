import { NextResponse } from "next/server";
import { listAllSessionsFromFirestore, listSessionsByCategoryFromFirestore } from "@/lib/firebase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category")?.trim();
    const limitRaw = searchParams.get("limit");
    const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    const limit = parsedLimit && parsedLimit > 0 ? parsedLimit : undefined;

    const sessions = category
      ? await listSessionsByCategoryFromFirestore(category)
      : await listAllSessionsFromFirestore();

    const payload = limit ? sessions.slice(0, limit) : sessions;
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
  }
}
