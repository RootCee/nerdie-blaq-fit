-- 1) Lock down the admin-only Pro override.
-- Users can still upsert their own profile, but only the service role or the
-- dashboard (postgres) can change is_premium_override.
create or replace function public.protect_premium_override()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    if tg_op = 'INSERT' then
      new.is_premium_override := false;
    else
      new.is_premium_override := old.is_premium_override;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_premium_override on public.profiles;

create trigger profiles_protect_premium_override
before insert or update on public.profiles
for each row
execute function public.protect_premium_override();

-- 2) Per-user daily AI usage caps for the Gemini Edge Functions.
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default (timezone('utc', now()))::date,
  feature text not null,
  request_count int not null default 0,
  primary key (user_id, usage_date, feature)
);

alter table public.ai_usage enable row level security;

drop policy if exists "Users can read own ai usage" on public.ai_usage;
create policy "Users can read own ai usage"
on public.ai_usage for select
to authenticated
using (auth.uid() = user_id);

-- Atomically counts one request for the calling user and returns whether it is
-- within the daily limit. SECURITY DEFINER so users cannot write the table directly.
create or replace function public.consume_ai_quota(p_feature text, p_daily_limit int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_count int;
begin
  if v_user is null then
    return false;
  end if;

  insert into public.ai_usage (user_id, usage_date, feature, request_count)
  values (v_user, (timezone('utc', now()))::date, p_feature, 1)
  on conflict (user_id, usage_date, feature)
  do update set request_count = public.ai_usage.request_count + 1
  returning request_count into v_count;

  return v_count <= p_daily_limit;
end;
$$;

revoke all on function public.consume_ai_quota(text, int) from public, anon;
grant execute on function public.consume_ai_quota(text, int) to authenticated;
