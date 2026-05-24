import { AdaptiveTrainingInput, AdaptiveTrainingResult, adaptWorkoutForReadiness, ExerciseSwap } from "@/lib/adaptiveTraining";

export interface GeminiTrainingCoachJson {
  readinessScore: number;
  volumeAdjustment: number;
  exerciseSwaps: ExerciseSwap[];
  removedExercises: string[];
  coachingCues: string[];
  coachMessage: string;
  safetyFlags: string[];
}

const GEMINI_MODEL = "gemini-1.5-flash";

export async function adaptWorkoutWithGeminiCoach(input: AdaptiveTrainingInput): Promise<AdaptiveTrainingResult> {
  const fallback = adaptWorkoutForReadiness(input);
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return fallback;
  }

  try {
    const geminiJson = await requestGeminiAdaptation(input, apiKey);

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

async function requestGeminiAdaptation(input: AdaptiveTrainingInput, apiKey: string): Promise<GeminiTrainingCoachJson> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: buildPrompt(input),
              },
            ],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini training coach failed with ${response.status}.`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (typeof text !== "string") {
    throw new Error("Gemini training coach did not return JSON text.");
  }

  return JSON.parse(text) as GeminiTrainingCoachJson;
}

function buildPrompt(input: AdaptiveTrainingInput) {
  return [
    "You are an AI bodybuilding plan adapter for Nerdie Blaq Fit.",
    "Only adapt today's plan. Do not assess injuries, provide health claims, or replace the whole workout.",
    "Preserve the training path, target muscles, compounds, and progression philosophy.",
    "Return strict JSON with exactly these fields: readinessScore, volumeAdjustment, exerciseSwaps, removedExercises, coachingCues, coachMessage, safetyFlags.",
    "Use readinessScore 0-100 and volumeAdjustment 0.5-1.0.",
    "If joint pain is mentioned, suggest safer exercise swaps and include a safety flag telling the user to consider safer alternatives, use pain-free range, and stop if pain worsens.",
    JSON.stringify({
      selectedTrainingPath: input.selectedTrainingPath,
      profile: {
        fitnessGoal: input.profile.fitnessGoal,
        workoutExperience: input.profile.workoutExperience,
        workoutLocation: input.profile.workoutLocation,
        injuriesOrLimitations: input.profile.injuriesOrLimitations,
      },
      checkIn: input.checkIn,
      plannedWorkout: input.plannedWorkout,
    }),
  ].join("\n");
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
