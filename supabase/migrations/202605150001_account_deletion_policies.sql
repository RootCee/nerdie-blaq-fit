drop policy if exists "users can delete own profile" on public.profiles;
create policy "users can delete own profile"
on public.profiles
for delete
to authenticated
using (auth.uid() = id);

drop policy if exists "users can delete own workout plan" on public.user_workout_plans;
create policy "users can delete own workout plan"
on public.user_workout_plans
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can delete own body weight logs" on public.user_body_weight_logs;
create policy "users can delete own body weight logs"
on public.user_body_weight_logs
for delete
to authenticated
using (auth.uid() = user_id);
