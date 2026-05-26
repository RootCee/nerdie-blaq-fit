// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

const GEMINI_MODELS = (Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash-lite,gemini-2.0-flash,gemini-2.5-flash")
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_API_KEY");
  const authorization = req.headers.get("Authorization");

  if (!supabaseUrl || !anonKey || !authorization) {
    return jsonResponse({ error: "Gemini coach authentication is not configured." }, 500);
  }

  if (!geminiApiKey) {
    return jsonResponse({ error: "Gemini API key is not configured." }, 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: "Sign in again before using AI coaching." }, 401);
  }

  let body;

  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  try {
    const geminiJson = await requestGeminiAdaptation(body, geminiApiKey);
    return jsonResponse(geminiJson, 200);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Gemini adaptation failed." },
      502,
    );
  }
});

async function requestGeminiAdaptation(input, apiKey) {
  let lastError;

  for (const model of GEMINI_MODELS) {
    try {
      return await requestGeminiAdaptationWithModel(input, apiKey, model);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Gemini adaptation failed.");
}

async function requestGeminiAdaptationWithModel(input, apiKey, model) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
    throw new Error(await buildGeminiErrorMessage(response, model));
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (typeof text !== "string") {
    throw new Error("Gemini training coach did not return JSON text.");
  }

  return JSON.parse(text);
}

async function buildGeminiErrorMessage(response, model) {
  const fallback = `Gemini training coach failed with ${response.status} using ${model}.`;

  try {
    const payload = await response.clone().json();
    const message = payload?.error?.message;

    return typeof message === "string" && message.trim()
      ? `${fallback} ${message.trim()}`
      : fallback;
  } catch {
    try {
      const text = await response.clone().text();

      return text.trim() ? `${fallback} ${text.trim().slice(0, 240)}` : fallback;
    } catch {
      return fallback;
    }
  }
}

function buildPrompt(input) {
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
        fitnessGoal: input.profile?.fitnessGoal,
        workoutExperience: input.profile?.workoutExperience,
        workoutLocation: input.profile?.workoutLocation,
        injuriesOrLimitations: input.profile?.injuriesOrLimitations,
      },
      checkIn: input.checkIn,
      plannedWorkout: input.plannedWorkout,
    }),
  ].join("\n");
}

function jsonResponse(payload, status) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
