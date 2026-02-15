import { NextResponse } from "next/server";
import { MEMORY_CATEGORIES } from "@/src/lib/ai/categories";
import { getOpenAIClient, getOpenAIModel } from "@/src/lib/ai/openaiClient";
import { db } from "@/src/lib/db/db";
import { nowIso } from "@/src/lib/ai/utils";

export async function GET() {
  const mode = getOpenAIClient() ? "openai" : "mock";
  return NextResponse.json(
    {
      ok: true,
      mode,
      model: mode === "openai" ? getOpenAIModel() : "deterministic-mock-v1",
      dbAdapter: db.name,
      categories: MEMORY_CATEGORIES,
      timestamp: nowIso()
    },
    { status: 200 }
  );
}
