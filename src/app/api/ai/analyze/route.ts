import { NextResponse } from "next/server";
import { analyzeMemoryEntry, isValidationError } from "@/src/lib/ai/analyzeMemory";
import { analyzeMemoryInputSchema } from "@/src/lib/ai/schemas";
import { extractValidationDetails, toApiError } from "@/src/lib/ai/utils";

/**
 * AI Analyze Route
 *
 * Example curl request:
 * curl -X POST http://localhost:3000/api/ai/analyze \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "userId":"user_123",
 *     "title":"Sunset at Banff",
 *     "description":"A calm mountain evening with orange skies and pine trees.",
 *     "imageDataUrl":"data:image/jpeg;base64,/9j/4AAQSk..."
 *   }'
 *
 * Example success response:
 * {
 *   "data": {
 *     "memoryId": "...",
 *     "userId": "user_123",
 *     "category": "travel",
 *     "tags": ["sunset","mountain"],
 *     ...
 *   }
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = analyzeMemoryInputSchema.parse(body);
    const analysis = await analyzeMemoryEntry(input, { persist: true });
    return NextResponse.json({ data: analysis }, { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        toApiError("INVALID_JSON", "Request body must be valid JSON."),
        { status: 400 }
      );
    }

    if (isValidationError(error)) {
      return NextResponse.json(
        toApiError("VALIDATION_ERROR", "Invalid analyze payload.", extractValidationDetails(error)),
        { status: 400 }
      );
    }

    return NextResponse.json(
      toApiError("ANALYSIS_FAILED", "Failed to analyze memory entry.", {
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500 }
    );
  }
}
