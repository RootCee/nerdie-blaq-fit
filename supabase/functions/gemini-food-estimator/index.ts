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
    return jsonResponse({ error: "Gemini food estimator authentication is not configured." }, 500);
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
    return jsonResponse({ error: "Sign in again before using AI food estimates." }, 401);
  }

  let body;

  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  if (!body?.foodName || !body?.amount) {
    return jsonResponse({ error: "Food name and amount are required." }, 400);
  }

  try {
    const geminiJson = await requestGeminiFoodEstimate(body, geminiApiKey);
    return jsonResponse(normalizeEstimate(body, geminiJson), 200);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Gemini food estimate failed." },
      502,
    );
  }
});

async function requestGeminiFoodEstimate(input, apiKey) {
  let lastError;

  for (const model of GEMINI_MODELS) {
    try {
      return await requestGeminiFoodEstimateWithModel(input, apiKey, model);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Gemini food estimate failed.");
}

async function requestGeminiFoodEstimateWithModel(input, apiKey, model) {
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
          temperature: 0.1,
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
    throw new Error("Gemini food estimator did not return JSON text.");
  }

  return JSON.parse(text);
}

async function buildGeminiErrorMessage(response, model) {
  const fallback = `Gemini food estimator failed with ${response.status} using ${model}.`;

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
    "You are a nutrition estimate helper for Nerdie Blaq Fit.",
    "Estimate calories and macros from a user-entered food name and amount.",
    "Do not make medical claims. Do not imply exact lab accuracy.",
    "Use common nutrition references and typical preparation assumptions.",
    "If the amount is vague, make a reasonable serving interpretation and lower confidence.",
    "Return strict JSON with exactly these fields: foodName, amount, servingInterpretation, calories, proteinG, carbsG, fatG, confidence, notes.",
    "Use integer calories and gram values. confidence must be low, medium, or high.",
    "The notes field must remind the user it is an estimate and should be confirmed before saving.",
    JSON.stringify({
      foodName: input.foodName,
      amount: input.amount,
      mealType: input.mealType,
    }),
  ].join("\n");
}

function normalizeEstimate(input, estimate) {
  return {
    foodName: typeof estimate?.foodName === "string" && estimate.foodName.trim()
      ? estimate.foodName.trim()
      : String(input.foodName ?? "").trim(),
    amount: typeof estimate?.amount === "string" && estimate.amount.trim()
      ? estimate.amount.trim()
      : String(input.amount ?? "").trim(),
    servingInterpretation: typeof estimate?.servingInterpretation === "string"
      ? estimate.servingInterpretation.trim()
      : String(input.amount ?? "").trim(),
    calories: clampNumber(estimate?.calories),
    proteinG: clampNumber(estimate?.proteinG),
    carbsG: clampNumber(estimate?.carbsG),
    fatG: clampNumber(estimate?.fatG),
    confidence: ["low", "medium", "high"].includes(estimate?.confidence) ? estimate.confidence : "low",
    notes: typeof estimate?.notes === "string" && estimate.notes.trim()
      ? estimate.notes.trim()
      : "Estimated nutrition. Confirm before saving.",
  };
}

function clampNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
}

function jsonResponse(payload, status) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
