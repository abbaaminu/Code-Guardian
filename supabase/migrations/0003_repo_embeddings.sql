-- 0003_repo_embeddings.sql
--
-- WHY THIS MIGRATION EXISTS
-- -------------------------
-- src/integrations/supabase/types.ts declares a `repo_embeddings` table (with
-- an `embedding` column typed as number[]) and src/lib/agent.functions.ts calls
-- an RPC named `search_repo_context`, but NO migration in this repo creates
-- either one. The application code therefore worked against a table that only
-- ever existed in the generated types:
--
--   * indexRepository (src/lib/embedding.functions.ts) cleared rows from a
--     non-existent relation, swallowed the "relation does not exist" error as a
--     warning, generated embeddings (paid Gemini calls), and then failed the
--     insert — so a full index run cost real money and stored nothing.
--   * retrieveRepoContext (src/lib/agent.functions.ts) called a non-existent
--     RPC, caught the error, and proceeded with zero context — a silent
--     quality degradation with no signal.
--
-- This migration makes both real. Run it in the Supabase SQL editor or via
-- `supabase db push`, then regenerate types (`supabase gen types typescript`)
-- so types.ts reflects the `user_id` column added below.
--
-- EMBEDDING DIMENSION: 768 — that is Google `text-embedding-004`, the model both
-- indexRepository and getInstructionEmbedding call. If you switch to a model
-- with a different output size, the column must be recreated with the new
-- dimension AND the index rebuilt; a mismatch surfaces as
-- "expected 768 dimensions, not N" on insert.

create extension if not exists vector;

-- pgvector's cosine-distance operator class is usable without enabling the
-- "public" schema explicitly, but the extension must land in a schema on the
-- search_path of the role running these queries.
create table if not exists public.repo_embeddings (
  id uuid primary key default gen_random_uuid(),
  -- Owned per-user, same as scans/policies: repository content is tenant data,
  -- and the vector index is useless if it can leak across accounts.
  user_id uuid not null references auth.users(id) on delete cascade,
  owner text not null,
  repo text not null,
  file_path text not null,
  content text not null,
  file_sha text not null,
  embedding vector(768) not null,
  created_at timestamptz not null default now(),
  -- Makes re-indexing idempotent: indexRepository can upsert on this key and
  -- a changed file_sha simply replaces the previous chunk.
  unique (user_id, owner, repo, file_path)
);

create index if not exists repo_embeddings_owner_repo_idx
  on public.repo_embeddings (owner, repo);

-- Approximate nearest-neighbour index for cosine distance. HNSW is the right
-- default here (better recall/latency than ivfflat at this scale, no training
-- step, and it tolerates incremental inserts from re-indexing).
create index if not exists repo_embeddings_embedding_idx
  on public.repo_embeddings using hnsw (embedding vector_cosine_ops);

alter table public.repo_embeddings enable row level security;

-- Owner-only, mirroring the vault_secrets policy in 0001. Server code reaches
-- this table through supabaseAdmin (service role), which bypasses RLS — the
-- explicit user_id filter in the RPC below is what scopes service-role reads,
-- since RLS alone cannot. This policy is the backstop that makes a leaked anon
-- key useless for reading someone else's index.
drop policy if exists "repo_embeddings_owner_only" on public.repo_embeddings;
create policy "repo_embeddings_owner_only" on public.repo_embeddings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Semantic search used by retrieveRepoContext. Parameters are named to match
-- the existing call site in src/lib/agent.functions.ts; `match_user_id` is the
-- addition that makes a service-role call tenant-safe (auth.uid() is null when
-- there is no end-user JWT, so RLS cannot do it for us).
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
-- security invoker (the default): an authenticated caller is additionally
-- constrained by the RLS policy above, so it can never read past its own rows
-- even if it passes a different match_user_id.
as $$
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
  limit least(greatest(match_count, 1), 50);
$$;

grant execute on function public.search_repo_context(
  vector, double precision, integer, text, text, uuid
) to authenticated, service_role;
