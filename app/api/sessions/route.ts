import { NextResponse } from "next/server";
import { listAllSessionsFromFirestore } from "@/lib/firebase";

export async function GET() {
  try {
    const sessions = await listAllSessionsFromFirestore();
    return NextResponse.json(sessions);
  } catch {
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
  }
}
