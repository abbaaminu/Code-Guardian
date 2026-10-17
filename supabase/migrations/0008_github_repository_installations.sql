create table if not exists public.user_repositories (
  user_id uuid not null references auth.users(id) on delete cascade,
  owner text not null,
  repo_name text not null,
  installation_id bigint not null,
  active boolean not null default true,
  permissions jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, owner, repo_name)
);

create index if not exists user_repositories_installation_idx
  on public.user_repositories (installation_id);

alter table public.user_repositories enable row level security;

drop policy if exists user_repositories_select_own on public.user_repositories;
create policy user_repositories_select_own on public.user_repositories
  for select to authenticated using (auth.uid() = user_id);

notify pgrst, 'reload schema';
