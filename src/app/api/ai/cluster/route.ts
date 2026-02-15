import { NextResponse } from "next/server";
import { clusterAndPersist } from "@/src/lib/ai/cluster";
import { db } from "@/src/lib/db/db";
import { clusterRequestSchema } from "@/src/lib/ai/schemas";
import { extractValidationDetails, toApiError } from "@/src/lib/ai/utils";
import { isValidationError } from "@/src/lib/ai/analyzeMemory";

function resolveUserId(explicitUserId: string | undefined, analysisUserIds: string[]): string | null {
  if (explicitUserId) return explicitUserId;
  const first = analysisUserIds[0];
  if (!first) return null;
  const sameUser = analysisUserIds.every((userId) => userId === first);
  return sameUser ? first : null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = clusterRequestSchema.parse(body);

    const analyses = input.analyses?.length ? input.analyses : await db.listAnalysesByUser(input.userId ?? "");
    if (!analyses.length) {
      return NextResponse.json(
        toApiError("NO_ANALYSES", "No analyses found to cluster."),
        { status: 404 }
      );
    }

    const userId = resolveUserId(input.userId, analyses.map((analysis) => analysis.userId));
    if (!userId) {
      return NextResponse.json(
        toApiError("INVALID_USER_SCOPE", "Unable to resolve a single userId for clustering."),
        { status: 400 }
      );
    }

    const clusters = await clusterAndPersist(userId, analyses, input.threshold);
    return NextResponse.json(
      {
        data: {
          userId,
          count: clusters.length,
          clusters
        }
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        toApiError("INVALID_JSON", "Request body must be valid JSON."),
        { status: 400 }
      );
    }

    if (isValidationError(error)) {
      return NextResponse.json(
        toApiError("VALIDATION_ERROR", "Invalid cluster payload.", extractValidationDetails(error)),
        { status: 400 }
      );
    }

    return NextResponse.json(
      toApiError("CLUSTER_FAILED", "Failed to cluster analyzed memories.", {
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500 }
    );
  }
}
