-- 0004_reconcile_live_drift.sql
--
-- WHY THIS MIGRATION EXISTS
-- -------------------------
-- The live project was built from 0001..0003 PLUS a run of ad-hoc statements
-- typed into the Supabase SQL editor. Those statements and the migrations
-- disagree in five places, and the disagreements are load-bearing:
--
--   1. RLS holes. The bootstrap granted `for all using (true) with check (true)`
--      policies on scans / vulnerabilities / policies (and a public SELECT +
--      public UPDATE pair on policies). 0001 added owner-scoped policies on top,
--      but Postgres ORs every applicable policy together, so ONE permissive
--      policy keeps the whole table world-readable AND world-writable to anyone
--      holding the public anon key that ships in the browser bundle. Section 1
--      below is name-independent (it reads pg_policies) so it also removes
--      permissive policies this repo has never seen, including the "…_1"
--      duplicates the SQL editor creates when the same statement is run twice.
--
--   2. repo_embeddings drift. The ad-hoc CREATE TABLE declared no user_id
--      column, no unique key and NO RLS; 0003 declares all three (and its
--      `alter table ... enable row level security` never committed if the whole
--      0003 script aborted on the missing user_id column). The app's upsert
--      targets (user_id, owner, repo, file_path) and every read filters
--      user_id, so with the ad-hoc shape indexRepository fails and
--      retrieveRepoContext silently returns nothing. Section 6 repairs it in
--      place and recreates the RPC the app actually calls.
--
--   3. policies.is_active was renamed to `enabled` (scan.functions.ts filters
--      `.eq("enabled", true)` and togglePolicy writes `enabled`). Section 4
--      finishes that rename on any database where it only half landed.
--
--   4. scans.language was NOT NULL in the bootstrap while scan.functions.ts
--      never sends it (the app stores the language in `file_type`); the ad-hoc
--      DROP only exists in a chat message, not in this repo. Section 2 backfills
--      file_type from language and then drops it.
--
--   5. scans.user_id was added by an ad-hoc ALTER before 0001 ran, so 0001's
--      `add column if not exists ... on delete cascade` was a no-op and the live
--      FK has no ON DELETE CASCADE: deleting an auth user with scans fails.
--      Section 2 rebuilds that constraint.
--
-- This file is IDEMPOTENT and safe to re-run; it never drops a table or a
-- tenant's rows except where the rows are provably unusable (see 2c and 6b).
-- Run supabase/diagnostics/live-schema-audit.sql before and after to see the
-- diff. Then regenerate types: `npx supabase gen types typescript --project-id
-- <ref> --schema public > src/integrations/supabase/types.ts`.


-- ============================================================================
-- 1. REMOVE EVERY PERMISSIVE RLS POLICY ON TENANT TABLES
-- ============================================================================
-- Name-independent sweep: any policy whose USING or WITH CHECK expression is
-- literally `true` grants unrestricted access to anon as well as authenticated.
-- Owner-scoped policies (auth.uid() = user_id) and the authenticated-read policy
-- on `policies` are untouched because their expressions are not `true`.
do $sweep$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'scans', 'vulnerabilities', 'policies',
        'user_roles', 'vault_secrets', 'repo_embeddings'
      )
      -- Never touch the policies this repo deliberately creates.
      and policyname not in (
        'scans_select_own', 'scans_insert_own', 'scans_update_own',
        'scans_delete_own', 'vulnerabilities_select_via_scan',
        'policies_select_authenticated', 'user_roles_select_own',
        'vault_secrets_owner_only', 'repo_embeddings_owner_only'
      )
      and (
        coalesce(qual, 'true') = 'true'
        or coalesce(with_check, 'true') = 'true'
      )
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    raise notice 'dropped permissive policy %.%', r.tablename, r.policyname;
  end loop;
end
$sweep$;

-- Same statement, written out by hand, so the intent is visible in a diff and
-- so the audit test has something concrete to assert on. These are the names
-- the Supabase SQL editor generates for `using (true)` policies.
drop policy if exists "Allow public read/write on scans" on public.scans;
drop policy if exists "Allow public read/write on vulnerabilities" on public.vulnerabilities;
drop policy if exists "Allow public read/write on policies" on public.policies;
drop policy if exists "Allow public select policies" on public.policies;
drop policy if exists "Allow public update policies" on public.policies;
drop policy if exists "policies_select_all" on public.policies;
drop policy if exists "Public read access" on public.scans;
drop policy if exists "Public write access" on public.scans;

-- ----------------------------------------------------------------------------
-- 1b. vault_secrets — the same sweep applies, but this table stores the
-- encrypted GitHub/GitLab access tokens, and 0001 is its only source (it is not
-- touched anywhere else in this repo, so a hand-written statement in the SQL
-- editor is free to have added a permissive policy next to the correct one).
-- Re-asserting costs four lines and cannot fail on a healthy database.
-- If this errors with "relation public.vault_secrets does not exist", run
-- 0001_multi_tenancy_rls_and_vault.sql first: the vault feature has no table.
-- ----------------------------------------------------------------------------
alter table public.vault_secrets enable row level security;

drop policy if exists "vault_secrets_owner_only" on public.vault_secrets;
create policy "vault_secrets_owner_only" on public.vault_secrets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ============================================================================
-- 2. scans — the columns src/lib/scan.functions.ts actually writes
-- ============================================================================
-- 2a. Columns the app inserts / selects. `create table if not exists` in the
-- bootstrap means every `add column` has to be repeated here defensively.
alter table public.scans add column if not exists project_name text;
alter table public.scans add column if not exists file_type text;
alter table public.scans add column if not exists status text;
alter table public.scans add column if not exists source_code text;
alter table public.scans add column if not exists user_id uuid;
alter table public.scans add column if not exists health_score integer;
alter table public.scans add column if not exists vulnerabilities_count jsonb;
alter table public.scans add column if not exists created_at timestamptz;

-- runScan always INSERTs an explicit status, but 'scanning' is the correct
-- default for any other insert path: a row with no status would render as a
-- completed-but-empty scan in the dashboard.
alter table public.scans alter column status set default 'scanning';

-- 2b. `language` is dead weight: runScan has never sent it (it sends file_type,
-- and the dashboard reads file_type back), while the bootstrap declared it
-- NOT NULL, which is exactly the kind of drift that makes an insert fail with a
-- not-null violation and no obvious cause. Preserve the information it holds
-- before dropping it.
do $lang$
begin
  if exists (
    select 1 from pg_attribute
    where attrelid = 'public.scans'::regclass
      and attname = 'language' and attnum > 0 and not attisdropped
  ) then
    update public.scans
       set file_type = language
     where file_type is null and language is not null;

    alter table public.scans drop column language;
    raise notice 'scans.language backfilled into file_type and dropped';
  end if;

  -- `threat_level` and `findings` are read by nothing in src/. They are kept as
  -- nullable columns so no data is destroyed, but they are no longer part of the
  -- app's contract. Uncomment the two lines below if you want them gone.
  -- alter table public.scans drop column if exists threat_level;
  -- alter table public.scans drop column if exists findings;
end
$lang$;

-- 2c. Ownership. A pre-0001 ad-hoc ALTER created scans.user_id without a FK
-- delete rule, after which 0001's `add column if not exists ... on delete
-- cascade` did nothing (the column already existed). Rebuild it so deleting an
-- auth user cascades instead of erroring. If this ADD fails, there are scans
-- whose user_id has no matching auth.users row:
--   select distinct s.user_id from public.scans s
--   left join auth.users u on u.id = s.user_id where u.id is null;
-- either null those rows out or delete them, then re-run this migration.
alter table public.scans drop constraint if exists scans_user_id_fkey;
alter table public.scans
  add constraint scans_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

-- 2d. Indexes. listScans() is `.eq("user_id", ...).order("created_at", desc)`,
-- so one composite index serves it and makes the old single-column ones
-- redundant. The ad-hoc ALTER created BOTH idx_scans_user_id and (via 0001)
-- scans_user_id_idx.
create index if not exists scans_user_created_idx
  on public.scans (user_id, created_at desc);
drop index if exists public.idx_scans_user_id;
drop index if exists public.scans_user_id_idx;

-- 2e. Re-assert RLS. Idempotent, and it repairs a database where 0001's
-- `enable row level security` was followed by nothing.
alter table public.scans enable row level security;

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


-- ============================================================================
-- 3. vulnerabilities — one row per finding written by scan.functions.ts
-- ============================================================================
alter table public.vulnerabilities add column if not exists scan_id uuid;
alter table public.vulnerabilities add column if not exists title text;
alter table public.vulnerabilities add column if not exists severity text;
alter table public.vulnerabilities add column if not exists cwe_id text;
alter table public.vulnerabilities add column if not exists vulnerable_code_block text;
alter table public.vulnerabilities add column if not exists fixed_code_block text;
alter table public.vulnerabilities add column if not exists remediation_steps text;
alter table public.vulnerabilities add column if not exists file_path text;
alter table public.vulnerabilities add column if not exists line_start integer;
alter table public.vulnerabilities add column if not exists line_end integer;
alter table public.vulnerabilities add column if not exists created_at timestamptz;

-- 3a. The ad-hoc `add column if not exists ... not null default ''` statements
-- were no-ops for the four text columns the bootstrap had already created as
-- nullable, so types.ts claims these are non-null while the live columns accept
-- NULL: a legacy row can hand `null` to the findings UI and to buildSarifLog,
-- which are typed as strings. Backfill, then enforce. The backfill values are the
-- ones the app already produces for these exact fields — safeString() returns ""
-- for anything that is not a string (src/lib/scan.functions.ts:52) and
-- normalizeVulns falls back to "Unnamed finding" and "medium"
-- (src/lib/scan.functions.ts:74-75) — so no new convention is invented here.
update public.vulnerabilities set vulnerable_code_block = '' where vulnerable_code_block is null;
update public.vulnerabilities set fixed_code_block = '' where fixed_code_block is null;
update public.vulnerabilities set remediation_steps = '' where remediation_steps is null;
update public.vulnerabilities set title = 'Unnamed finding' where title is null;
update public.vulnerabilities
   set severity = 'medium'
 where severity is null
    or severity not in ('critical', 'high', 'medium', 'low');

alter table public.vulnerabilities alter column vulnerable_code_block set default '';
alter table public.vulnerabilities alter column fixed_code_block set default '';
alter table public.vulnerabilities alter column remediation_steps set default '';
alter table public.vulnerabilities alter column severity set default 'medium';

alter table public.vulnerabilities alter column vulnerable_code_block set not null;
alter table public.vulnerabilities alter column fixed_code_block set not null;
alter table public.vulnerabilities alter column remediation_steps set not null;
alter table public.vulnerabilities alter column severity set not null;

-- 3b. Severity check constraint. normalizeVulns() already coerces anything
-- outside this set to 'medium', so the constraint can only ever fire on a bug —
-- which is the point. Guarded because the bootstrap may have created it under a
-- different name (or not at all).
do $sev$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.vulnerabilities'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%severity%'
  ) then
    alter table public.vulnerabilities
      add constraint vulnerabilities_severity_check
      check (severity in ('critical', 'high', 'medium', 'low'));
  end if;
end
$sev$;

-- 3c. Findings must die with their scan. Without ON DELETE CASCADE, deleting a
-- scan (or an auth user, via scans) fails on the FK, and orphaned findings stay
-- readable forever under RLS (the policy's EXISTS subquery cannot match a
-- missing scan, so they are invisible rather than exposed — they just leak disk).
do $vk$
begin
  if not exists (
    select 1 from pg_constraint con
    where con.conrelid = 'public.vulnerabilities'::regclass
      and con.contype = 'f'
      and con.conkey = array[
        (select attnum from pg_attribute
          where attrelid = 'public.vulnerabilities'::regclass and attname = 'scan_id')
      ]
  ) then
    alter table public.vulnerabilities
      add constraint vulnerabilities_scan_id_fkey
      foreign key (scan_id) references public.scans (id) on delete cascade;
  end if;
end
$vk$;

-- 3d. getScanReport()/getScanSarif() filter by scan_id and order by severity.
create index if not exists vulnerabilities_scan_id_idx
  on public.vulnerabilities (scan_id, severity);

-- 3e. RLS: readable only through a scan the caller owns. Inserts/updates happen
-- exclusively through the service-role client, so there is deliberately no
-- authenticated write policy — default deny is the correct answer, and section 1
-- above is what makes "default deny" actually mean deny.
alter table public.vulnerabilities enable row level security;

drop policy if exists "vulnerabilities_select_via_scan" on public.vulnerabilities;
create policy "vulnerabilities_select_via_scan" on public.vulnerabilities
  for select using (
    exists (
      select 1 from public.scans s
      where s.id = vulnerabilities.scan_id and s.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 4. policies — the catalog the AI prompt is steered by
-- ============================================================================
alter table public.policies add column if not exists name text;
alter table public.policies add column if not exists category text;
alter table public.policies add column if not exists description text;
alter table public.policies add column if not exists enabled boolean;
alter table public.policies add column if not exists created_at timestamptz;

-- 4a. Finish the is_active -> enabled rename. listPolicies() selects * and
-- runScan() filters `.eq("enabled", true)`; togglePolicy() writes `enabled`. A
-- database where the ad-hoc DO block only half ran (enabled added, is_active
-- still present and authoritative) silently ignores every toggle: the scan keeps
-- enforcing a policy the admin just switched off. Copy the only meaningful state
-- across, then drop the stale column.
do $pol$
begin
  if exists (
    select 1 from pg_attribute
    where attrelid = 'public.policies'::regclass
      and attname = 'is_active' and attnum > 0 and not attisdropped
  ) then
    execute 'update public.policies set enabled = coalesce(is_active, enabled)';
    execute 'alter table public.policies drop column is_active';
    raise notice 'policies.is_active migrated into policies.enabled and dropped';
  end if;

  update public.policies set enabled = true where enabled is null;

  alter table public.policies alter column enabled set default true;
  alter table public.policies alter column enabled set not null;
end
$pol$;

-- 4b. unique_policy_name was created by an ad-hoc statement (after a TRUNCATE)
-- and by nothing in this repo, so a database that only ran 0001..0003 has no
-- uniqueness guarantee. Duplicates would make listPolicies() show the same
-- policy twice and togglePolicy() flip both rows. Guarded: if duplicate names
-- exist this raises on purpose — dedupe first (see the 08 section of
-- supabase/diagnostics/live-schema-audit.sql), then re-run this migration.
do $pname$
begin
  if not exists (
    select 1 from pg_index i
    where i.indrelid = 'public.policies'::regclass
      and i.indisunique
      and pg_get_indexdef(i.indexrelid) ~ '\(name\)'
  ) then
    alter table public.policies add constraint unique_policy_name unique (name);
  end if;

  if exists (select 1 from public.policies where name is null) then
    raise notice 'policies.name has NULL rows: fill them in, then re-run to enforce NOT NULL';
  else
    alter table public.policies alter column name set not null;
  end if;
end
$pname$;

-- 4c. listPolicies() orders by category then name.
create index if not exists policies_category_name_idx
  on public.policies (category, name);

-- 4d. RLS. The catalog is shared and non-sensitive, but the ad-hoc bootstrap also
-- granted public SELECT *and public UPDATE*, i.e. anyone with the anon key could
-- disable every security policy the scans are steered by. Section 1 removed that;
-- the only policy left should be this one, and only for signed-in users.
alter table public.policies enable row level security;

drop policy if exists "policies_select_authenticated" on public.policies;
create policy "policies_select_authenticated" on public.policies
  for select using (auth.role() = 'authenticated');

-- ============================================================================
-- 5. user_roles — the gate on togglePolicy()
-- ============================================================================
alter table public.user_roles add column if not exists role text;
alter table public.user_roles add column if not exists created_at timestamptz;
alter table public.user_roles add column if not exists updated_at timestamptz;

update public.user_roles set created_at = now() where created_at is null;
update public.user_roles set updated_at = now() where updated_at is null;

-- 5a. Exactly one row per user. requireAdminRole() reads the role column with
-- .maybeSingle(), which raises PGRST116 when a user has two rows — so a
-- duplicated grant locks that admin out of togglePolicy() with a confusing
-- database error instead of the intended Forbidden. Keep the strongest role per
-- user and then enforce the cardinality the code assumes.
delete from public.user_roles
where ctid not in (
  select distinct on (user_id) ctid
  from public.user_roles
  order by user_id, (role = 'admin') desc, ctid
);

update public.user_roles set role = 'user' where role is null;

do $roles$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.user_roles'::regclass
      and contype in ('p', 'u')
      and pg_get_constraintdef(oid) ilike '%(user_id)%'
  ) then
    alter table public.user_roles
      add constraint user_roles_user_id_key unique (user_id);
  end if;

  -- `not valid`: existing rows are grandfathered so this cannot fail on legacy
  -- data, while every new row must satisfy it. Run
  -- `alter table public.user_roles validate constraint user_roles_role_check;`
  -- once you are happy with what is in there.
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.user_roles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  ) then
    alter table public.user_roles
      add constraint user_roles_role_check
      check (role in ('user', 'admin')) not valid;
  end if;
end
$roles$;

alter table public.user_roles alter column role set default 'user';
alter table public.user_roles alter column role set not null;
alter table public.user_roles alter column created_at set default now();
alter table public.user_roles alter column updated_at set default now();
alter table public.user_roles alter column created_at set not null;
alter table public.user_roles alter column updated_at set not null;

-- 5b. Deleting an auth user must not fail because of the role row.
alter table public.user_roles drop constraint if exists user_roles_user_id_fkey;
alter table public.user_roles
  add constraint user_roles_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

-- 5c. RLS. Reads of your own role are all the client needs (to hide admin
-- controls); granting a role happens through the service role, so there is
-- deliberately no INSERT/UPDATE/DELETE policy for authenticated users.
alter table public.user_roles enable row level security;

drop policy if exists "user_roles_select_own" on public.user_roles;
create policy "user_roles_select_own" on public.user_roles
  for select using (auth.uid() = user_id);

-- ============================================================================
-- 6. repo_embeddings — the semantic index behind the autonomous agent
-- ============================================================================
create extension if not exists vector;

-- 6a. Create the table in 0003's shape if it is missing entirely; the
-- `add column` block below then repairs an ad-hoc table in place. 0003's
-- `alter table ... enable row level security` and `create policy` both aborted
-- (the script runs as one transaction) if the ad-hoc table it found had no
-- user_id column, which is why this table can be live-but-unprotected.
do $re$
begin
  if to_regclass('public.repo_embeddings') is null then
    execute $ddl$
      create table public.repo_embeddings (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references auth.users (id) on delete cascade,
        owner text not null,
        repo text not null,
        file_path text not null,
        content text not null,
        file_sha text not null,
        embedding vector(768) not null,
        created_at timestamptz not null default now(),
        unique (user_id, owner, repo, file_path)
      )
    $ddl$;
    raise notice 'created public.repo_embeddings';
  end if;
end
$re$;

alter table public.repo_embeddings add column if not exists user_id uuid;
alter table public.repo_embeddings add column if not exists owner text;
alter table public.repo_embeddings add column if not exists repo text;
alter table public.repo_embeddings add column if not exists file_path text;
alter table public.repo_embeddings add column if not exists content text;
alter table public.repo_embeddings add column if not exists file_sha text;
alter table public.repo_embeddings add column if not exists embedding vector(768);
alter table public.repo_embeddings add column if not exists created_at timestamptz default now();

-- 6b. Rows written before user_id existed have no owner: no tenant query can
-- reach them (indexRepository filters user_id, retrieveRepoContext passes
-- match_user_id) and RLS cannot match them either, so they are unreachable
-- duplicates of an index the user can simply rebuild. Removing them is what
-- makes `set not null` possible.
delete from public.repo_embeddings where user_id is null;
alter table public.repo_embeddings alter column user_id set not null;

alter table public.repo_embeddings drop constraint if exists repo_embeddings_user_id_fkey;
alter table public.repo_embeddings
  add constraint repo_embeddings_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

-- 6c. The unique key the code's upsert already depends on:
-- indexRepository() calls .upsert(records, { onConflict: "user_id,owner,repo,file_path" }),
-- which PostgREST turns into ON CONFLICT (…) — and Postgres rejects that with
-- error 42P10 ("no unique or exclusion constraint matching the ON CONFLICT
-- specification") when the key does not exist. Without it, re-indexing a repo
-- duplicates every chunk instead of replacing it.
do $runiq$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.repo_embeddings'::regclass
      and conname = 'repo_embeddings_user_repo_path_key'
  ) and not exists (
    select 1 from pg_index i
    where i.indrelid = 'public.repo_embeddings'::regclass
      and i.indisunique
      and pg_get_indexdef(i.indexrelid) ~ '\(user_id, owner, repo, file_path\)'
  ) then
    alter table public.repo_embeddings
      add constraint repo_embeddings_user_repo_path_key
      unique (user_id, owner, repo, file_path);
  end if;
end
$runiq$;

-- 6d. Indexes. The ad-hoc CREATE INDEX statement (no name given) is auto-named
-- repo_embeddings_embedding_idx, which collides with 0003's — sweep up any
-- other HNSW index on this table so the planner has exactly one to consider.
do $ridx$
declare
  r record;
begin
  for r in
    select c.relname as name
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
    where i.indrelid = 'public.repo_embeddings'::regclass
      and pg_get_indexdef(i.indexrelid) ilike '%using hnsw%'
      and c.relname <> 'repo_embeddings_embedding_idx'
  loop
    execute format('drop index public.%I', r.name);
    raise notice 'dropped duplicate hnsw index %', r.name;
  end loop;
end
$ridx$;

create index if not exists repo_embeddings_owner_repo_idx
  on public.repo_embeddings (owner, repo);
create index if not exists repo_embeddings_embedding_idx
  on public.repo_embeddings using hnsw (embedding vector_cosine_ops);

-- 6e. RLS. This table is the one the audit found truly naked: the ad-hoc CREATE
-- TABLE never enabled RLS, so the public anon key (shipped to every browser and
-- visible in devtools) could read the full contents of every repository the
-- agent had ever indexed. Owner-scoped, for all commands, so a future client
-- path cannot drift into using it unguarded.
alter table public.repo_embeddings enable row level security;

drop policy if exists "repo_embeddings_owner_only" on public.repo_embeddings;
create policy "repo_embeddings_owner_only" on public.repo_embeddings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6f. The RPC. Two overloads of search_repo_context can legally coexist, and
-- PostgREST then has to guess (PGRST203) or picks the wrong one, so the ad-hoc
-- (query_embedding, target_owner, target_repo, match_threshold, match_count)
-- version — which ignores ownership entirely and is scoped only by (owner, repo)
-- — is dropped. agent.functions.ts calls the 0003 signature, re-stated here so a
-- database where 0003 never committed still ends up with a working, owner-scoped
-- search.
drop function if exists public.search_repo_context(vector, text, text, double precision, integer);

create or replace function public.search_repo_context(
  query_embedding vector(768),
  match_threshold double precision,
  match_count integer,
  repo_owner text,
  repo_name text,
  match_user_id uuid default null
)
returns table (file_path text, content text, similarity double precision)
language sql
stable
as $fn$
  select
    e.file_path,
    e.content,
    1 - (e.embedding <=> query_embedding) as similarity
  from public.repo_embeddings e
  where e.owner = repo_owner
    and e.repo = repo_name
    and (match_user_id is null or e.user_id = match_user_id)
    and 1 - (e.embedding <=> query_embedding) >= match_threshold
  order by e.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 50)
$fn$;

grant execute on function
  public.search_repo_context(vector, double precision, integer, text, text, uuid)
  to authenticated, service_role;

-- 6g. Ask PostgREST to reload its schema cache. DDL run from the SQL editor
-- normally triggers this anyway, but a stale cache is the whole difference
-- between "column file_type does not exist" and a working insert, and this costs
-- nothing.
notify pgrst, 'reload schema';


-- ============================================================================
-- 7. THINGS THIS MIGRATION DELIBERATELY LEAVES ALONE
-- ============================================================================
-- 7a. policies.description is nullable in the database while the hand-maintained
-- src/integrations/supabase/types.ts calls it non-null, so nothing in src/ ever
-- writes that column: no code path is affected. If you would rather make the two
-- agree than regenerate the types, uncomment this pair:
--   update public.policies set description = '' where description is null;
--   alter table public.policies alter column description set not null;

-- 7b. The service role bypasses RLS entirely (it owns the tables), and every read
-- and write in src/lib/*.functions.ts goes through src/integrations/supabase/
-- client.server.ts, i.e. through the service role. The owner-scoped policies
-- above therefore only matter for direct-from-browser access with the anon key:
-- they are defence in depth, not the mechanism the app uses. Do not "fix" a
-- broken read by reaching for the anon key — check that SUPABASE_SERVICE_ROLE_KEY
-- is set in the server environment first.
--
-- Optional, for the paranoid: nothing in src/ reads these tables from the
-- browser (all four *.functions.ts files are createServerFn, and the client
-- bundle only calls them), so denying anon outright is safe:
--   revoke all on public.scans, public.vulnerabilities, public.policies,
--     public.user_roles, public.vault_secrets, public.repo_embeddings
--     from anon;

-- 7c. Granting the admin role. The ad-hoc statement
--   insert into public.user_roles (user_id, role) values (…, 'admin')
--     on conflict (user_id, role) do nothing;
-- is INVALID on the shape 0002 creates, because user_id is the primary key of
-- user_roles and there is no (user_id, role) unique constraint, so the ON
-- CONFLICT clause cannot match. Use one of these instead (run as the service
-- role, i.e. in the SQL editor):
--   insert into public.user_roles (user_id, role)
--   select id, 'admin' from auth.users where email = 'you@example.com'
--   on conflict (user_id) do update set role = 'admin', updated_at = now();
--
-- or, matching every existing row for that person:
--   update public.user_roles set role = 'admin', updated_at = now()
--   where user_id = (select id from auth.users where email = 'you@example.com');


-- ============================================================================
-- 8. AFTER RUNNING THIS
-- ============================================================================
-- 1. Re-run supabase/diagnostics/live-schema-audit.sql. The 02, 05 and 09
--    sections should show ENABLED, no [PERMISSIVE] markers and no MISSING or
--    LEGACY rows.
-- 2. Regenerate the types so the hand-maintained file stops lying:
--    npx supabase gen types typescript --project-id <ref> --schema public \
--      > src/integrations/supabase/types.ts
-- 3. npx vitest run src/lib/supabase-schema.test.ts, then npx tsc --noEmit.
