# Nerdie Blaq Fit

Nerdie Blaq Fit is an Expo SDK 54 React Native app built with TypeScript and Expo Router. It currently ships as a dark-themed fitness MVP with onboarding, Supabase-backed persistence, deterministic workout planning, workout logging, nutrition guidance, progress history, and a local education hub.

## Current Feature Set

- branded dark mobile UI inspired by Nerdie Blaq
- onboarding flow for fitness profile capture
- Supabase anonymous auth for secure user identity
- Supabase-backed onboarding persistence
- deterministic weekly workout-plan generation from saved profile data
- persisted active workout-plan snapshots
- exercise detail screens with local metadata
- workout day logging with per-exercise notes, reps, sets, and weight
- progress history with lightweight motivation stats
- meals tab with deterministic nutrition targets and simple meal guidance
- learn tab with local educational articles and category filters

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

Useful scripts:

```bash
npm run start
npm run ios
npm run android
npm run web
npm run typecheck
```

## Supabase Setup

Enable anonymous auth:

1. Open your Supabase project.
2. Go to `Authentication` → `Providers`.
3. Enable `Anonymous`.

Run the SQL below in the Supabase SQL Editor.

### 1. Profiles

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

### 2. Active Workout Plan Snapshot

```sql
create table if not exists public.user_workout_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_snapshot jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_user_workout_plans_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists user_workout_plans_set_updated_at on public.user_workout_plans;

create trigger user_workout_plans_set_updated_at
before update on public.user_workout_plans
for each row
execute function public.set_user_workout_plans_updated_at();

alter table public.user_workout_plans enable row level security;

drop policy if exists "users can read own workout plan" on public.user_workout_plans;
drop policy if exists "users can insert own workout plan" on public.user_workout_plans;
drop policy if exists "users can update own workout plan" on public.user_workout_plans;

create policy "users can read own workout plan"
on public.user_workout_plans
for select
to authenticated
using (auth.uid() = user_id);

create policy "users can insert own workout plan"
on public.user_workout_plans
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "users can update own workout plan"
on public.user_workout_plans
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

### 3. Workout Day Logs

```sql
create table if not exists public.user_workout_day_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  day_id text not null,
  day_title text not null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  exercise_logs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, day_id)
);

create or replace function public.set_user_workout_day_logs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists user_workout_day_logs_set_updated_at on public.user_workout_day_logs;

create trigger user_workout_day_logs_set_updated_at
before update on public.user_workout_day_logs
for each row
execute function public.set_user_workout_day_logs_updated_at();

alter table public.user_workout_day_logs enable row level security;

drop policy if exists "users can read own workout day logs" on public.user_workout_day_logs;
drop policy if exists "users can insert own workout day logs" on public.user_workout_day_logs;
drop policy if exists "users can update own workout day logs" on public.user_workout_day_logs;
drop policy if exists "users can delete own workout day logs" on public.user_workout_day_logs;

create policy "users can read own workout day logs"
on public.user_workout_day_logs
for select
to authenticated
using (auth.uid() = user_id);

create policy "users can insert own workout day logs"
on public.user_workout_day_logs
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "users can update own workout day logs"
on public.user_workout_day_logs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can delete own workout day logs"
on public.user_workout_day_logs
for delete
to authenticated
using (auth.uid() = user_id);
```

## App Flow

1. App launches.
2. If Supabase is configured, an anonymous auth session is created or restored.
3. The saved profile is hydrated from `public.profiles`.
4. Users complete onboarding once, then land in the main tabs.
5. The Workout tab loads a persisted active plan if one exists.
6. If no plan exists, the app generates one deterministically from the saved profile and stores it.
7. Workout sessions can be logged and revisited in `Progress`.
8. `Meals` uses saved profile data to derive deterministic nutrition guidance.
9. `Learn` provides a local library of educational content with category filters.

If Supabase env vars are missing, the app falls back to local onboarding state instead of remote persistence.

## Feature Notes

### Workout Planning

The workout generator is deterministic and currently uses:

- `fitness_goal`
- `workout_experience`
- `workout_location`
- `available_equipment`
- `activity_level`

Supported goals:

- fat loss
- muscle gain
- general fitness

The generator adjusts:

- training days per week
- full-body versus split structure
- exercise pool based on home or gym plus equipment
- sets, reps, and rest by goal and experience

### Progress

The Progress tab is driven by saved workout day logs and currently shows:

- completed workout history
- workouts completed this week
- total completed sessions
- current streak

Current streak is defined as consecutive calendar days with at least one completed workout, ending today or yesterday.

### Meals

The Meals tab uses saved onboarding data to derive:

- estimated daily calorie target
- daily protein target
- suggested carbs range
- suggested fats range
- daily water target
- sample meal structure
- simple supplement guidance

These are general wellness-oriented estimates, not medical advice.

### Learn

The Learn tab is a local education hub with:

- static article library
- article categories
- category filter chips
- article detail screens

## Project Structure

```text
app/
  (tabs)/
  learn/
  workout-history/
  workout-session/
  _layout.tsx
  index.tsx
  onboarding.tsx
assets/
  exercises/
src/
  components/
  constants/
  features/
    learn/
    nutrition/
    workouts/
  lib/
  store/
  theme/
  types/
```

## Development Notes

- `.env` should stay local and must not be committed.
- anonymous auth is the current identity layer
- TODO auth upgrades can later add email, Apple, and Google account linking
- workout plans are stored as JSON snapshots for MVP speed and simplicity
- workout day logs are stored per user and per day id

## Next Recommended Work

- add a lightweight grocery list or meal swap layer in `Meals`
- add related exercise substitutions in exercise detail views
- add a small “best week so far” summary in `Progress`
- plan an auth upgrade flow from anonymous users to recoverable accounts
