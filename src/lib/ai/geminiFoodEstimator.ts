import { ensureSupabaseSession, getSupabaseConfig, supabase } from "@/lib/supabase";
import { FoodNutritionEstimate, FoodNutritionEstimateInput } from "@/types/nutrition";

function clampMacro(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
}

function normalizeConfidence(value: unknown): FoodNutritionEstimate["confidence"] {
  return value === "high" || value === "medium" || value === "low" ? value : "low";
}

function normalizeEstimate(
  input: FoodNutritionEstimateInput,
  estimate: Partial<FoodNutritionEstimate>,
): FoodNutritionEstimate {
  return {
    foodName: typeof estimate.foodName === "string" && estimate.foodName.trim()
      ? estimate.foodName.trim()
      : input.foodName.trim(),
    amount: typeof estimate.amount === "string" && estimate.amount.trim()
      ? estimate.amount.trim()
      : input.amount.trim(),
    servingInterpretation: typeof estimate.servingInterpretation === "string"
      ? estimate.servingInterpretation.trim()
      : "",
    calories: clampMacro(estimate.calories),
    proteinG: clampMacro(estimate.proteinG),
    carbsG: clampMacro(estimate.carbsG),
    fatG: clampMacro(estimate.fatG),
    confidence: normalizeConfidence(estimate.confidence),
    notes: typeof estimate.notes === "string"
      ? estimate.notes.trim()
      : "Estimated nutrition. Confirm before saving.",
  };
}

export async function estimateFoodNutritionWithGemini(
  input: FoodNutritionEstimateInput,
): Promise<FoodNutritionEstimate> {
  if (!input.foodName.trim()) {
    throw new Error("Add a food name before estimating macros.");
  }

  if (!input.amount.trim()) {
    throw new Error("Add an amount or serving size before estimating macros.");
  }

  if (!getSupabaseConfig().isConfigured || !supabase) {
    throw new Error("AI food estimates need Supabase and Gemini configured. You can still enter calories manually.");
  }

  const session = await ensureSupabaseSession();

  if (!session?.access_token) {
    throw new Error("Sign in again before using AI food estimates.");
  }

  const { data, error } = await supabase.functions.invoke("gemini-food-estimator", {
    body: input,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new Error(error.message || "AI food estimate failed.");
  }

  return normalizeEstimate(input, data as Partial<FoodNutritionEstimate>);
}
