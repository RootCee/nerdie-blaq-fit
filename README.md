# Nerdie Blaq Fit

Nerdie Blaq Fit is an Expo SDK 54 React Native app built with TypeScript and Expo Router. It currently includes:

- branded dark-theme mobile UI
- onboarding flow for fitness profile capture
- Supabase anonymous auth
- Supabase-backed onboarding persistence
- deterministic weekly workout-plan generation from saved profile data

## Tech Stack

- Expo SDK 54
- React Native
- TypeScript
- Expo Router
- Supabase Auth + Postgres

## Prerequisites

- Node `20.19+`
- npm
- Expo Go or iOS/Android simulator
- Supabase project

## Local Setup

Install dependencies:

```bash
npm install
```

Create a root `.env` file:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Start the app:

```bash
npx expo start -c
```

## Supabase Setup

Enable anonymous auth:

1. Open your Supabase project
2. Go to `Authentication` → `Providers`
3. Enable `Anonymous`

Run this SQL in the Supabase SQL Editor:

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  age text,
  sex text,
  height text,
  weight text,
  activity_level text,
  fitness_goal text,
  workout_experience text,
  workout_location text,
  available_equipment text[] not null default '{}',
  dietary_preference text,
  injuries_or_limitations text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "users can read own profile" on public.profiles;
drop policy if exists "users can insert own profile" on public.profiles;
drop policy if exists "users can update own profile" on public.profiles;

create policy "users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
```

## Available Scripts

```bash
npm run start
npm run ios
npm run android
npm run web
npm run typecheck
```

## Current Feature Flow

1. App launches
2. If Supabase is configured, anonymous auth session is created or restored
3. Profile is hydrated from `public.profiles`
4. User completes onboarding
5. Onboarding data is persisted to Supabase
6. Workout tab generates a deterministic weekly plan from saved profile data

If Supabase env vars are missing, the app falls back to local in-memory onboarding state.

## Workout Generator Rules

The first workout planner is deterministic and uses:

- `fitness_goal`
- `workout_experience`
- `workout_location`
- `available_equipment`
- `activity_level`

Supported planning goals:

- fat loss
- muscle gain
- general fitness

The generator adjusts:

- training days per week
- full-body vs split structure
- exercise pool based on home/gym + equipment
- sets, reps, and rest by goal and experience level

## Project Structure

```text
app/
  (tabs)/
  _layout.tsx
  index.tsx
  onboarding.tsx
src/
  components/
  constants/
  features/
    workouts/
  lib/
  store/
  theme/
  types/
```

## Next Recommended Work

- persist workout-plan snapshots
- add completed-workout logging
- add account upgrade flows from anonymous auth to email, Apple, and Google
