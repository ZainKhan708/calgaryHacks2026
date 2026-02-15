import { NextRequest, NextResponse } from "next/server";
import { buildScene } from "@/lib/generation/sceneBuilder";
import { getSession, setScene } from "@/lib/storage/uploadStore";

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Unknown session" }, { status: 404 });

  const scene = buildScene(sessionId, session.artifacts, session.clusters);
  setScene(sessionId, scene);
  return NextResponse.json(scene);
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  const session = getSession(sessionId);
  if (!session?.scene) return NextResponse.json({ error: "Scene not ready" }, { status: 404 });

  return NextResponse.json(session.scene);
}
