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

function getErrorMessageFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as { error?: unknown; message?: unknown };
  const message = typeof record.error === "string"
    ? record.error
    : typeof record.message === "string"
      ? record.message
      : null;

  return message?.trim() || null;
}

async function getFunctionErrorMessage(error: unknown) {
  const fallback = error instanceof Error && error.message.trim()
    ? error.message
    : "AI food estimate failed.";
  const response = typeof error === "object" && error !== null && "context" in error
    ? (error as { context?: unknown }).context
    : null;

  if (response instanceof Response) {
    try {
      const payload = await response.clone().json();
      const message = getErrorMessageFromPayload(payload);

      if (message) {
        return message;
      }
    } catch {
      try {
        const text = await response.clone().text();

        if (text.trim()) {
          return text.trim();
        }
      } catch {
        // Keep the original Supabase Functions error below.
      }
    }
  }

  return fallback === "Edge Function returned a non-2xx status code"
    ? "AI food estimate failed. Check the food estimator Edge Function configuration."
    : fallback;
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
    throw new Error(await getFunctionErrorMessage(error));
  }

  return normalizeEstimate(input, data as Partial<FoodNutritionEstimate>);
}
