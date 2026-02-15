import { NextRequest, NextResponse } from "next/server";
import { getSession, setClusters } from "@/lib/storage/uploadStore";
import { clusterMemories } from "@/lib/clustering/clusterMemories";

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Unknown session" }, { status: 404 });
  if (!session.artifacts.length) {
    return NextResponse.json({ error: "No artifacts. Run /api/analyze first." }, { status: 400 });
  }

  const clusters = clusterMemories(session.artifacts);
  setClusters(sessionId, clusters);
  return NextResponse.json({ sessionId, clusters });
}
