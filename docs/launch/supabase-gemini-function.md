# Supabase Gemini Training Coach Setup

The mobile app should not ship a Gemini API key in an `EXPO_PUBLIC_` variable. Use the Supabase Edge Function instead.

## Function

- Function name: `gemini-training-coach`
- Source: `supabase/functions/gemini-training-coach/index.ts`
- App caller: `src/lib/ai/geminiTrainingCoach.ts`

## Set The Secret

Run this from the project root after logging in to the Supabase CLI:

```bash
supabase secrets set GEMINI_API_KEY=your_key_here
```

You can also set `GEMINI_API_KEY` from the Supabase dashboard:

- Project Settings
- Edge Functions
- Secrets
- Add `GEMINI_API_KEY`

## Deploy

```bash
supabase functions deploy gemini-training-coach
```

## Local App Env

Remove this from mobile `.env` before shipping:

```env
EXPO_PUBLIC_GEMINI_API_KEY=
```

The app only needs the existing Supabase public env vars. If Supabase or the function is unavailable, the app falls back to deterministic adaptive training.
