import { AdaptiveTrainingInput, AdaptiveTrainingResult, adaptWorkoutForReadiness, ExerciseSwap } from "@/lib/adaptiveTraining";
import { ensureSupabaseSession, getSupabaseConfig, supabase } from "@/lib/supabase";

export interface GeminiTrainingCoachJson {
  readinessScore: number;
  volumeAdjustment: number;
  exerciseSwaps: ExerciseSwap[];
  removedExercises: string[];
  coachingCues: string[];
  coachMessage: string;
  safetyFlags: string[];
}

export async function adaptWorkoutWithGeminiCoach(input: AdaptiveTrainingInput): Promise<AdaptiveTrainingResult> {
  const fallback = adaptWorkoutForReadiness(input);

  if (!getSupabaseConfig().isConfigured || !supabase) {
    return fallback;
  }

  try {
    const geminiJson = await requestGeminiAdaptation(input);

    return {
      ...fallback,
      readinessScore: clampScore(geminiJson.readinessScore),
      volumeAdjustment: clampVolume(geminiJson.volumeAdjustment),
      exerciseSwaps: Array.isArray(geminiJson.exerciseSwaps) ? geminiJson.exerciseSwaps : fallback.exerciseSwaps,
      removedExercises: Array.isArray(geminiJson.removedExercises) ? geminiJson.removedExercises : fallback.removedExercises,
      coachingCues: Array.isArray(geminiJson.coachingCues) ? geminiJson.coachingCues : fallback.coachingCues,
      coachMessage: typeof geminiJson.coachMessage === "string" ? geminiJson.coachMessage : fallback.coachMessage,
      safetyFlags: Array.isArray(geminiJson.safetyFlags)
        ? [...new Set([...fallback.safetyFlags, ...geminiJson.safetyFlags])]
        : fallback.safetyFlags,
      adjustmentSummary: buildGeminiSummary(geminiJson, fallback.adjustmentSummary),
    };
  } catch {
    return fallback;
  }
}

async function requestGeminiAdaptation(input: AdaptiveTrainingInput): Promise<GeminiTrainingCoachJson> {
  const session = await ensureSupabaseSession();

  if (!session?.access_token || !supabase) {
    throw new Error("Supabase session is not available for Gemini coach.");
  }

  const { data, error } = await supabase.functions.invoke("gemini-training-coach", {
    body: input,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new Error(error.message || "Gemini training coach function failed.");
  }

  return data as GeminiTrainingCoachJson;
}

function buildGeminiSummary(json: GeminiTrainingCoachJson, fallbackSummary: string) {
  if (!json || typeof json.volumeAdjustment !== "number") {
    return fallbackSummary;
  }

  const parts = [`AI adaptation target: ${Math.round(clampVolume(json.volumeAdjustment) * 100)}% volume.`];

  if (json.exerciseSwaps?.length) {
    parts.push(`${json.exerciseSwaps.length} movement swap${json.exerciseSwaps.length === 1 ? "" : "s"} suggested.`);
  }

  if (json.removedExercises?.length) {
    parts.push(`${json.removedExercises.length} item${json.removedExercises.length === 1 ? "" : "s"} removed.`);
  }

  return parts.join(" ");
}

function clampScore(value: number) {
  return Math.min(Math.max(Math.round(Number(value) || 0), 0), 100);
}

function clampVolume(value: number) {
  return Math.min(Math.max(Number(value) || 1, 0.5), 1);
}
