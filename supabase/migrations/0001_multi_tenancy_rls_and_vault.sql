-- 0001_multi_tenancy_rls_and_vault.sql
--
-- WHY THIS MIGRATION EXISTS
-- --------------------------
-- The generated src/integrations/supabase/types.ts has NO `user_id` column on
-- `scans`, and RLS is not enabled anywhere in this project. Meanwhile the
-- application code (src/lib/scan.functions.ts) already inserts and filters on
-- `scans.user_id`. Two possible explanations: either types.ts is stale (a
-- migration added the column but types were never regenerated), or the column
-- genuinely doesn't exist and every insert has been failing / every "user_id"
-- filter has been silently returning nothing. Either way, run this migration
-- and then regenerate types.ts (`supabase gen types typescript`) so the app and
-- the schema agree.
--
-- All server functions currently query through `supabaseAdmin` (the service-role
-- client, which bypasses RLS) and enforce ownership manually with `.eq("user_id", ...)`.
-- That means RLS as added here is a *defense-in-depth* backstop, not the primary
-- access control today — but it's the difference between "one missing .eq() is
-- an IDOR" and "one missing .eq() is caught by the database." Add it regardless.
--
-- Run this in the Supabase SQL editor or via `supabase db push`.

-- 1. Multi-tenancy: attach every scan to the user who created it.
alter table public.scans
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists scans_user_id_idx on public.scans (user_id);

-- Existing rows with no owner (pre-migration data) are not visible to anyone
-- under RLS below until manually assigned — that's intentional; it's safer to
-- have orphaned rows go dark than to guess an owner.

-- 2. Enable RLS everywhere it should have been on from day one.
alter table public.scans enable row level security;
alter table public.vulnerabilities enable row level security;
alter table public.policies enable row level security;

-- scans: owner-only read/write.
drop policy if exists "scans_select_own" on public.scans;
create policy "scans_select_own" on public.scans
  for select using (auth.uid() = user_id);

drop policy if exists "scans_insert_own" on public.scans;
create policy "scans_insert_own" on public.scans
  for insert with check (auth.uid() = user_id);

drop policy if exists "scans_update_own" on public.scans;
create policy "scans_update_own" on public.scans
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "scans_delete_own" on public.scans;
create policy "scans_delete_own" on public.scans
  for delete using (auth.uid() = user_id);

-- vulnerabilities: no user_id of their own — scoped via the parent scan.
drop policy if exists "vulnerabilities_select_via_scan" on public.vulnerabilities;
create policy "vulnerabilities_select_via_scan" on public.vulnerabilities
  for select using (
    exists (
      select 1 from public.scans s
      where s.id = vulnerabilities.scan_id and s.user_id = auth.uid()
    )
  );

-- Inserts/updates to vulnerabilities only ever happen server-side via the
-- service-role client (see scan.functions.ts), so there is deliberately no
-- authenticated insert/update policy here — the RLS default (deny) is correct.

-- policies: every signed-in user can read the shared policy catalog; only the
-- service role can write. There is no per-org policy table yet (see
-- togglePolicy's SECURITY FIX comment in scan.functions.ts) — once
-- organizations exist, this table needs an org_id column and scoped policies
-- instead of being global.
drop policy if exists "policies_select_authenticated" on public.policies;
create policy "policies_select_authenticated" on public.policies
  for select using (auth.role() = 'authenticated');

-- 3. Vault for encrypted repository access tokens (GitHub/GitLab PATs, or
-- refresh tokens if you move to GitHub App installation tokens per
-- src/lib/github/app-auth.ts). Ciphertext + auth tag are stored; the raw
-- token never touches the database. See src/lib/vault/encryption.ts.
create table if not exists public.vault_secrets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('github', 'gitlab')),
  label text not null default 'default',
  encrypted_token text not null,       -- base64 ciphertext
  iv text not null,                    -- base64, AES-GCM nonce
  auth_tag text not null,              -- base64, AES-GCM auth tag
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, label)
);

alter table public.vault_secrets enable row level security;

drop policy if exists "vault_secrets_owner_only" on public.vault_secrets;
create policy "vault_secrets_owner_only" on public.vault_secrets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- NOTE: even with RLS, vault_secrets should only ever be written/read via
-- server functions using supabaseAdmin + src/lib/vault/encryption.ts — never
-- expose encrypted_token/iv/auth_tag to a client-side select("*"). Select only
-- (id, provider, label, created_at) for anything rendered in the UI.
