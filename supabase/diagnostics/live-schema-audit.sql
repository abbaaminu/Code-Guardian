-- supabase/diagnostics/live-schema-audit.sql
--
-- READ-ONLY audit. It mutates nothing: every row it collects lands in a
-- session-private TEMP table (pg_temp.diag), and the final SELECT returns ONE
-- result set so the Supabase SQL editor does not hide all but the last
-- statement.
--
-- WHY THIS EXISTS: this project's schema was assembled from three migrations
-- (supabase/migrations/0001..0003) PLUS a run of ad-hoc statements typed into
-- the SQL editor. Several of those ad-hoc statements re-created tables that
-- already existed (so they silently did nothing) and others altered columns the
-- migrations had already handled. This script prints the live truth for the six
-- tables the application touches, so it can be diffed against src/lib/*.ts
-- before (and after) applying 0004_reconcile_live_drift.sql.
--
-- HOW TO READ THE OUTPUT
--   00 MISSING      a table the app needs does not exist at all
--   01 columns      every column: type, nullability, default
--   02 rls          ENABLED / DISABLED per table (DISABLED is a leak)
--   03 constraints  pk / fk / unique / check, verbatim
--   04 indexes      spots duplicate single-column user_id indexes
--   05 policies     every RLS policy; [PERMISSIVE] == USING (true) or WITH CHECK
--                   (true), i.e. readable/writable by anyone holding the public
--                   anon key that ships in the browser bundle
--   06 rows         row counts (is anything actually in there?)
--   07 functions    every search_repo_context overload
--   08 duplicates   rows that break .maybeSingle() / the ON CONFLICT targets
--   09 app contract the exact columns src/**/*.ts reads or writes that are
--                   missing, legacy columns still hanging around, and FKs whose
--                   delete rule would block account deletion

do $$
declare
  t text;
  r record;
begin
  drop table if exists pg_temp.diag;
  create temp table diag (section text, item text, detail text);

  foreach t in array array[
    'scans', 'vulnerabilities', 'policies',
    'user_roles', 'vault_secrets', 'repo_embeddings'
  ]
  loop
    if to_regclass('public.' || t) is null then
      insert into diag
      values ('00 MISSING', 'public.' || t, 'relation does not exist [FIX]');
      continue;
    end if;

    insert into diag
    select '01 columns', t || '.' || a.attname,
           format_type(a.atttypid, a.atttypmod)
             || case when a.attnotnull then ' NOT NULL' else ' NULL' end
             || coalesce(' default ' || left(pg_get_expr(d.adbin, d.adrelid), 60), '')
    from pg_attribute a
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where a.attrelid = ('public.' || t)::regclass
      and a.attnum > 0
      and not a.attisdropped;

    insert into diag
    select '02 rls', 'public.' || t,
           case when c.relrowsecurity then 'ENABLED' else 'DISABLED [FIX]' end
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = t;

    insert into diag
    select '03 constraints', t || ' :: ' || con.conname,
           pg_get_constraintdef(con.oid)
    from pg_constraint con
    where con.conrelid = ('public.' || t)::regclass;

    insert into diag
    select '04 indexes',
           t || ' :: ' || (select relname from pg_class where oid = i.indexrelid),
           pg_get_indexdef(i.indexrelid)
    from pg_index i
    where i.indrelid = ('public.' || t)::regclass;

    insert into diag
    select '05 policies', t || ' :: ' || p.policyname,
           p.cmd || ' to ' || array_to_string(p.roles, ',')
             || ' using ' || coalesce(p.qual, '(none)')
             || ' check ' || coalesce(p.with_check, '(none)')
             || case
                  when coalesce(p.qual, 'true') = 'true'
                    or coalesce(p.with_check, 'true') = 'true'
                  then '  [PERMISSIVE: the anon key can read/write this table]'
                  else ''
                end
    from pg_policies p
    where p.schemaname = 'public' and p.tablename = t;

    execute format(
      'insert into diag select %L, %L, count(*)::text from public.%I',
      '06 rows', t, t
    );
  end loop;

  for r in
    select p.oid as oid,
           pg_get_function_arguments(p.oid) as args,
           pg_get_function_result(p.oid) as result
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'search_repo_context'
  loop
    insert into diag values (
      '07 functions',
      'search_repo_context(' || r.args || ')',
      'returns ' || r.result ||
        case
          when r.args like '%match_user_id%'
          then ' [matches src/lib/agent.functions.ts]'
          else ' [unusable by the app call site: drop this overload]'
        end
    );
  end loop;

  if to_regclass('public.user_roles') is not null then
    insert into diag
    select '08 duplicates', 'user_roles ' || user_id || ' has ' || count(*) || ' rows',
           'requireAdminRole() uses .maybeSingle(), so >1 row raises PGRST116 [FIX]'
    from public.user_roles
    group by user_id
    having count(*) > 1;

    insert into diag
    select '08 duplicates', 'user_roles admins',
           count(*) || ' row(s) with role = admin'
    from public.user_roles
    where role = 'admin';
  end if;

  if to_regclass('public.policies') is not null then
    insert into diag
    select '08 duplicates', 'policies ' || name || ' appears ' || count(*) || ' times',
           'unique_policy_name is missing (or was bypassed) [FIX]'
    from public.policies
    group by name
    having count(*) > 1;
  end if;

  for r in
    select * from (values
      ('scans', 'project_name'), ('scans', 'file_type'), ('scans', 'status'),
      ('scans', 'source_code'), ('scans', 'user_id'), ('scans', 'health_score'),
      ('scans', 'vulnerabilities_count'), ('scans', 'created_at'),
      ('vulnerabilities', 'scan_id'), ('vulnerabilities', 'title'),
      ('vulnerabilities', 'severity'), ('vulnerabilities', 'cwe_id'),
      ('vulnerabilities', 'vulnerable_code_block'),
      ('vulnerabilities', 'fixed_code_block'),
      ('vulnerabilities', 'remediation_steps'), ('vulnerabilities', 'file_path'),
      ('vulnerabilities', 'line_start'), ('vulnerabilities', 'line_end'),
      ('policies', 'name'), ('policies', 'category'), ('policies', 'enabled'),
      ('user_roles', 'user_id'), ('user_roles', 'role'),
      ('vault_secrets', 'user_id'), ('vault_secrets', 'provider'),
      ('vault_secrets', 'label'), ('vault_secrets', 'encrypted_token'),
      ('vault_secrets', 'iv'), ('vault_secrets', 'auth_tag'),
      ('repo_embeddings', 'user_id'), ('repo_embeddings', 'owner'),
      ('repo_embeddings', 'repo'), ('repo_embeddings', 'file_path'),
      ('repo_embeddings', 'content'), ('repo_embeddings', 'file_sha'),
      ('repo_embeddings', 'embedding')
    ) as v(tbl, col)
  loop
    if to_regclass('public.' || r.tbl) is null then
      continue;
    end if;

    if not exists (
      select 1 from pg_attribute a
      where a.attrelid = ('public.' || r.tbl)::regclass
        and a.attname = r.col
        and a.attnum > 0
        and not a.attisdropped
    ) then
      insert into diag values (
        '09 app contract',
        'MISSING ' || r.tbl || '.' || r.col,
        'src/**/*.ts selects or inserts this column [FIX]'
      );
    end if;
  end loop;

  for r in
    select * from (values
      ('scans', 'language', 'dropped from the app (file_type replaced it)'),
      ('policies', 'is_active', 'renamed to policies.enabled by the app'),
      ('scans', 'threat_level', 'never read or written by any code path'),
      ('scans', 'findings', 'never read or written by any code path')
    ) as v(tbl, col, why)
  loop
    if to_regclass('public.' || r.tbl) is not null
      and exists (
        select 1 from pg_attribute a
        where a.attrelid = ('public.' || r.tbl)::regclass
          and a.attname = r.col
          and a.attnum > 0
          and not a.attisdropped
      )
    then
      insert into diag values (
        '09 app contract', 'LEGACY ' || r.tbl || '.' || r.col, r.why || ' [FIX]'
      );
    end if;
  end loop;

  for r in
    select c.relname as tbl, con.confdeltype as deltype, con.oid as oid
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    where con.contype = 'f'
      and c.relname in (
        'scans', 'vulnerabilities', 'policies',
        'user_roles', 'vault_secrets', 'repo_embeddings'
      )
  loop
    insert into diag values (
      '09 app contract',
      r.tbl || ' foreign key',
      pg_get_constraintdef(r.oid) ||
        case
          when r.deltype = 'c' then ' [ok: deletes cascade]'
          else ' [no ON DELETE CASCADE: deleting the auth user fails]'
        end
    );
  end loop;
end $$;

select section, item, detail from pg_temp.diag order by section, item;
