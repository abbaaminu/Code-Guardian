-- 0002_policy_admin_roles.sql
--
-- WHY THIS MIGRATION EXISTS
-- --------------------------
-- SECURITY AUDIT (H5): `togglePolicy` previously accepted any signed-in user —
-- there was no roles table, so the app could not distinguish "a user" from "an
-- admin who is allowed to change the org's security policies". This migration
-- adds a minimal `user_roles` table with a single `admin` role. The server
-- function (scan.functions.ts -> requireAdminRole) refuses policy writes unless
-- the caller's row says `role = 'admin'`.
--
-- This is intentionally minimal. When real organizations exist, replace this
-- with an org-scoped model (organization_members / organization_roles) and make
-- `policies` carry an org_id; the check in scan.functions.ts is the only place
-- that needs to change to honor scoping.
--
-- Run this in the Supabase SQL editor or via `supabase db push`, then regenerate
-- types (`supabase gen types typescript`) — or hand-add `user_roles` to
-- src/integrations/supabase/types.ts as done for vault_secrets in batch 1.

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

-- Authenticated users can read their own role (so the UI can hide admin
-- controls); writes are service-role only, mirroring vault_secrets.
drop policy if exists "user_roles_select_own" on public.user_roles;
create policy "user_roles_select_own" on public.user_roles
  for select using (auth.uid() = user_id);

-- Example — grant the admin role to an existing user (run in SQL editor):
--   insert into public.user_roles (user_id, role)
--   values ('00000000-0000-0000-0000-000000000000', 'admin');
