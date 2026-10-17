alter table public.scans
  add column if not exists repo_owner text,
  add column if not exists repo_name text;
