import { describe, expect, it } from "vitest";
import { inferCategoryFromSignals, resolveCategoryPrediction } from "@/lib/ai/categoryClassifier";

describe("categoryClassifier", () => {
  it("infers sports from common sports keywords", () => {
    const category = inferCategoryFromSignals([
      "Championship night",
      "The team won the soccer tournament in a packed stadium."
    ]);
    expect(category).toBe("sports");
  });

  it("normalizes model category labels", () => {
    const category = resolveCategoryPrediction("Technology", ["Robotics fair", "Student coding showcase"]);
    expect(category).toBe("technology");
  });

  it("falls back to culture when no clear signals exist", () => {
    const category = inferCategoryFromSignals(["memories", "reflections"]);
    expect(category).toBe("culture");
  });
});
