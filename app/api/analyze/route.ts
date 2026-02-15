import { NextRequest, NextResponse } from "next/server";
import { getSession, setArtifacts } from "@/lib/storage/uploadStore";
import { analyzeFiles } from "@/lib/ai/analyzeMedia";

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Unknown session" }, { status: 404 });

  const artifacts = await analyzeFiles(session.files);
  setArtifacts(sessionId, artifacts);

  return NextResponse.json({ sessionId, artifacts });
}
