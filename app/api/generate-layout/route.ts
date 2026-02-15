import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/storage/uploadStore";
import { buildLayout } from "@/lib/generation/layoutEngine";

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Unknown session" }, { status: 404 });

  const layout = buildLayout(sessionId, session.clusters, session.artifacts, session.selectedCategory);
  return NextResponse.json({ sessionId, ...layout });
}
