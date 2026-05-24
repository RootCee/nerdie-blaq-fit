create table if not exists public.user_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id text not null,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_challenges_user_status_idx
on public.user_challenges (user_id, challenge_id, status);

create table if not exists public.user_challenge_daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_challenge_id uuid not null references public.user_challenges(id) on delete cascade,
  log_date date not null,
  workout_completed boolean not null default false,
  missed_reason text check (
    missed_reason is null or missed_reason in ('not-enough-time', 'too-sore', 'low-energy', 'injury-pain', 'forgot', 'other')
  ),
  readiness_score int check (readiness_score is null or (readiness_score >= 0 and readiness_score <= 100)),
  pain_flag boolean not null default false,
  strength_notes text,
  created_at timestamptz not null default now(),
  unique (user_challenge_id, log_date)
);

create index if not exists user_challenge_daily_logs_user_date_idx
on public.user_challenge_daily_logs (user_id, log_date);

alter table public.user_challenges enable row level security;
alter table public.user_challenge_daily_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_challenges' and policyname = 'Users can read own challenges'
  ) then
    create policy "Users can read own challenges"
    on public.user_challenges for select
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_challenges' and policyname = 'Users can insert own challenges'
  ) then
    create policy "Users can insert own challenges"
    on public.user_challenges for insert
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_challenges' and policyname = 'Users can update own challenges'
  ) then
    create policy "Users can update own challenges"
    on public.user_challenges for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_challenge_daily_logs' and policyname = 'Users can read own challenge logs'
  ) then
    create policy "Users can read own challenge logs"
    on public.user_challenge_daily_logs for select
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_challenge_daily_logs' and policyname = 'Users can insert own challenge logs'
  ) then
    create policy "Users can insert own challenge logs"
    on public.user_challenge_daily_logs for insert
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_challenge_daily_logs' and policyname = 'Users can update own challenge logs'
  ) then
    create policy "Users can update own challenge logs"
    on public.user_challenge_daily_logs for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end $$;
