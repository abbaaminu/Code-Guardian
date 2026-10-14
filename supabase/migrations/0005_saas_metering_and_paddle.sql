-- SaaS audit quotas and Paddle subscription state.

create table if not exists public.usage_quotas (
  user_id uuid primary key references auth.users (id) on delete cascade,
  audit_credits_remaining integer not null default 3
    check (audit_credits_remaining >= 0),
  tier text not null default 'free'
    check (tier in ('free', 'starter', 'pro')),
  billing_period_start timestamptz not null default now(),
  current_period_audits_used integer not null default 0
    check (current_period_audits_used >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.paddle_subscriptions (
  paddle_subscription_id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  paddle_customer_id text,
  paddle_price_id text not null,
  tier text not null check (tier in ('starter', 'pro')),
  status text not null,
  current_period_start timestamptz,
  last_event_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists paddle_subscriptions_user_id_idx
  on public.paddle_subscriptions (user_id);

create table if not exists public.paddle_webhook_events (
  event_id text primary key,
  processed_at timestamptz not null default now()
);

alter table public.usage_quotas enable row level security;
alter table public.paddle_subscriptions enable row level security;
alter table public.paddle_webhook_events enable row level security;

drop policy if exists usage_quotas_select_own on public.usage_quotas;
create policy usage_quotas_select_own
  on public.usage_quotas for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists paddle_subscriptions_select_own on public.paddle_subscriptions;
create policy paddle_subscriptions_select_own
  on public.paddle_subscriptions for select to authenticated
  using (auth.uid() = user_id);

revoke all on public.usage_quotas from anon, authenticated;
grant select on public.usage_quotas to authenticated;
revoke all on public.paddle_subscriptions from anon, authenticated;
grant select on public.paddle_subscriptions to authenticated;
revoke all on public.paddle_webhook_events from anon, authenticated;

create or replace function public.create_audit_quota_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usage_quotas (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_audit_quota_after_user_signup on auth.users;
create trigger create_audit_quota_after_user_signup
  after insert on auth.users
  for each row execute function public.create_audit_quota_for_new_user();

insert into public.usage_quotas (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.increment_audit_usage(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usage_quotas (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  update public.usage_quotas
  set audit_credits_remaining = case
        when tier = 'free' then audit_credits_remaining - 1
        else audit_credits_remaining
      end,
      current_period_audits_used = case
        when tier <> 'free'
          and billing_period_start + interval '1 month' <= now()
          then 1
        else current_period_audits_used + 1
      end,
      billing_period_start = case
        when tier <> 'free'
          and billing_period_start + interval '1 month' <= now()
          then now()
        else billing_period_start
      end,
      updated_at = now()
  where user_id = p_user_id
    and (
      (tier = 'free' and audit_credits_remaining > 0)
      or (tier = 'starter' and (
        current_period_audits_used < 25
        or billing_period_start + interval '1 month' <= now()
      ))
      or (tier = 'pro' and (
        current_period_audits_used < 150
        or billing_period_start + interval '1 month' <= now()
      ))
    );

  return found;
end;
$$;

revoke all on function public.increment_audit_usage(uuid) from public, anon, authenticated;
grant execute on function public.increment_audit_usage(uuid) to service_role;

create or replace function public.apply_paddle_subscription_event(
  p_event_id text,
  p_event_type text,
  p_user_id uuid,
  p_subscription_id text,
  p_customer_id text,
  p_price_id text,
  p_tier text,
  p_status text,
  p_period_start timestamptz,
  p_occurred_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.paddle_subscriptions%rowtype;
  v_user_id uuid;
  v_tier text;
  v_effective_tier text;
  v_effective_period_start timestamptz;
  v_rows integer;
begin
  if p_event_type not in (
    'subscription.created', 'subscription.updated', 'subscription.canceled'
  ) then
    raise exception 'Unsupported Paddle subscription event';
  end if;

  select * into v_existing
  from public.paddle_subscriptions
  where paddle_subscription_id = p_subscription_id
  for update;

  v_user_id := coalesce(p_user_id, v_existing.user_id);
  if v_user_id is null then
    return false;
  end if;

  if v_existing.user_id is not null and v_existing.user_id <> v_user_id then
    raise exception 'Paddle subscription user does not match existing owner';
  end if;

  v_tier := coalesce(p_tier, v_existing.tier);
  if v_tier is null or coalesce(p_price_id, v_existing.paddle_price_id) is null then
    return false;
  end if;

  if exists (
    select 1 from public.paddle_webhook_events where event_id = p_event_id
  ) then
    return true;
  end if;

  insert into public.paddle_webhook_events (event_id) values (p_event_id);

  if v_existing.last_event_at is not null
    and p_occurred_at < v_existing.last_event_at then
    return true;
  end if;

  insert into public.paddle_subscriptions (
    paddle_subscription_id, user_id, paddle_customer_id, paddle_price_id,
    tier, status, current_period_start, last_event_at, updated_at
  ) values (
    p_subscription_id, v_user_id, p_customer_id, coalesce(p_price_id, v_existing.paddle_price_id),
    v_tier, p_status, p_period_start, p_occurred_at, now()
  )
  on conflict (paddle_subscription_id) do update set
    paddle_customer_id = coalesce(excluded.paddle_customer_id, paddle_subscriptions.paddle_customer_id),
    paddle_price_id = coalesce(p_price_id, paddle_subscriptions.paddle_price_id),
    tier = excluded.tier,
    status = excluded.status,
    current_period_start = coalesce(excluded.current_period_start, paddle_subscriptions.current_period_start),
    last_event_at = excluded.last_event_at,
    updated_at = now()
  where paddle_subscriptions.last_event_at <= excluded.last_event_at;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return true;
  end if;

  select case
    when exists (
      select 1 from public.paddle_subscriptions
      where user_id = v_user_id and status in ('active', 'trialing') and tier = 'pro'
    ) then 'pro'
    when exists (
      select 1 from public.paddle_subscriptions
      where user_id = v_user_id and status in ('active', 'trialing') and tier = 'starter'
    ) then 'starter'
    else null
  end into v_effective_tier;

  if v_effective_tier is not null then
    select current_period_start into v_effective_period_start
    from public.paddle_subscriptions
    where user_id = v_user_id
      and tier = v_effective_tier
      and status in ('active', 'trialing')
    order by current_period_start desc nulls last
    limit 1;
  end if;

  insert into public.usage_quotas (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  update public.usage_quotas
  set tier = coalesce(v_effective_tier, 'free'),
      current_period_audits_used = case
        when v_effective_period_start is not null
          and billing_period_start is distinct from v_effective_period_start
          then 0
        else current_period_audits_used
      end,
      billing_period_start = case
        when v_effective_period_start is not null
          then v_effective_period_start
        else billing_period_start
      end,
      updated_at = now()
  where user_id = v_user_id;

  return true;
end;
$$;

revoke all on function public.apply_paddle_subscription_event(
  text, text, uuid, text, text, text, text, text, timestamptz, timestamptz
) from public, anon, authenticated;
grant execute on function public.apply_paddle_subscription_event(
  text, text, uuid, text, text, text, text, text, timestamptz, timestamptz
) to service_role;
