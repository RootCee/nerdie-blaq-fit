create table if not exists public.user_food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name text not null,
  calories int not null default 0 check (calories >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  carbs_g numeric not null default 0 check (carbs_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  serving_notes text,
  created_at timestamptz not null default now()
);

create index if not exists user_food_logs_user_date_idx
on public.user_food_logs (user_id, log_date, created_at desc);

alter table public.user_food_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_food_logs' and policyname = 'Users can read own food logs'
  ) then
    create policy "Users can read own food logs"
    on public.user_food_logs for select
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_food_logs' and policyname = 'Users can insert own food logs'
  ) then
    create policy "Users can insert own food logs"
    on public.user_food_logs for insert
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_food_logs' and policyname = 'Users can update own food logs'
  ) then
    create policy "Users can update own food logs"
    on public.user_food_logs for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_food_logs' and policyname = 'Users can delete own food logs'
  ) then
    create policy "Users can delete own food logs"
    on public.user_food_logs for delete
    using (auth.uid() = user_id);
  end if;
end $$;
