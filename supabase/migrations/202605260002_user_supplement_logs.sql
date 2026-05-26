create table if not exists public.user_supplement_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  timing text not null check (timing in ('morning', 'pre-workout', 'intra-workout', 'post-workout', 'evening')),
  supplement_name text not null,
  amount text not null,
  calories int not null default 0 check (calories >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  carbs_g numeric not null default 0 check (carbs_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists user_supplement_logs_user_date_idx
on public.user_supplement_logs (user_id, log_date, created_at desc);

alter table public.user_supplement_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_supplement_logs' and policyname = 'Users can read own supplement logs'
  ) then
    create policy "Users can read own supplement logs"
    on public.user_supplement_logs for select
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_supplement_logs' and policyname = 'Users can insert own supplement logs'
  ) then
    create policy "Users can insert own supplement logs"
    on public.user_supplement_logs for insert
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_supplement_logs' and policyname = 'Users can update own supplement logs'
  ) then
    create policy "Users can update own supplement logs"
    on public.user_supplement_logs for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_supplement_logs' and policyname = 'Users can delete own supplement logs'
  ) then
    create policy "Users can delete own supplement logs"
    on public.user_supplement_logs for delete
    using (auth.uid() = user_id);
  end if;
end $$;
