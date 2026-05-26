alter table public.profiles
add column if not exists goal_weight text,
add column if not exists goal_pace text
check (goal_pace in ('easy', 'steady', 'aggressive')),
add column if not exists training_path_id text
check (training_path_id in ('foundation', 'athlete', 'maintenance', 'beast'));

create table if not exists public.user_daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null,
  sleep_hours numeric,
  energy_level int,
  stress_level int,
  time_available_minutes int,
  previous_session_rpe int,
  soreness jsonb not null default '{}'::jsonb,
  joint_pain_notes text,
  created_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

alter table public.user_daily_checkins enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_daily_checkins' and policyname = 'Users can read own daily checkins'
  ) then
    create policy "Users can read own daily checkins"
    on public.user_daily_checkins for select
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_daily_checkins' and policyname = 'Users can insert own daily checkins'
  ) then
    create policy "Users can insert own daily checkins"
    on public.user_daily_checkins for insert
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_daily_checkins' and policyname = 'Users can update own daily checkins'
  ) then
    create policy "Users can update own daily checkins"
    on public.user_daily_checkins for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_daily_checkins' and policyname = 'Users can delete own daily checkins'
  ) then
    create policy "Users can delete own daily checkins"
    on public.user_daily_checkins for delete
    using (auth.uid() = user_id);
  end if;
end $$;
