-- Adds an admin-controlled tester override for Pro access.
-- This is intentionally false by default and non-null so normal users stay on
-- RevenueCat-backed access unless an admin explicitly enables the override.
alter table public.profiles
add column if not exists is_premium_override boolean not null default false;

comment on column public.profiles.is_premium_override is
  'Admin-only tester flag. When true, the app treats the user as Pro without requiring RevenueCat entitlement.';

-- Admin/service-role example: enable tester access for one user.
-- Replace the UUID with auth.users.id for the tester account.
--
-- update public.profiles
-- set is_premium_override = true
-- where id = '00000000-0000-0000-0000-000000000000';
