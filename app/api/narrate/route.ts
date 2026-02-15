import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const text = String(body?.text || "").trim();
  if (!text) return NextResponse.json({ error: "Missing text" }, { status: 400 });

  // Browser-native speech synthesis is used client-side for MVP.
  return NextResponse.json({ ok: true, text });
}
