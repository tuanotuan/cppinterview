-- Site-wide accounting for guest/non-admin Luna traffic. This ledger is
-- service-role-only and intentionally separate from the owner's ai_usage_* rows.

create table if not exists public.public_ai_site_budget_monthly (
  month_start date primary key,
  actual_usd_micros bigint not null default 0 check (actual_usd_micros >= 0),
  reserved_usd_micros bigint not null default 0 check (reserved_usd_micros >= 0),
  request_count integer not null default 0 check (request_count >= 0),
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  cached_input_tokens bigint not null default 0
    check (cached_input_tokens >= 0),
  cache_write_tokens bigint not null default 0
    check (cache_write_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  last_model text,
  updated_at timestamptz not null default now()
);

create table if not exists public.public_ai_site_budget_daily (
  usage_date date primary key,
  actual_usd_micros bigint not null default 0 check (actual_usd_micros >= 0),
  reserved_usd_micros bigint not null default 0 check (reserved_usd_micros >= 0),
  request_count integer not null default 0 check (request_count >= 0),
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  cached_input_tokens bigint not null default 0
    check (cached_input_tokens >= 0),
  cache_write_tokens bigint not null default 0
    check (cache_write_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  last_model text,
  updated_at timestamptz not null default now()
);

create table if not exists public.public_ai_site_budget_reservations (
  reservation_id uuid primary key
    references public.public_ai_quota_reservations(id) on delete cascade,
  status text not null default 'reserved'
    check (status in ('reserved', 'finalized', 'released')),
  requested_usd_micros bigint not null
    check (requested_usd_micros between 1 and 500000),
  actual_usd_micros bigint
    check (actual_usd_micros is null or actual_usd_micros >= 0),
  usage_date date not null,
  month_start date not null,
  dispatched_at timestamptz,
  expires_at timestamptz not null,
  model text,
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  cached_input_tokens bigint not null default 0
    check (cached_input_tokens >= 0),
  cache_write_tokens bigint not null default 0
    check (cache_write_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  finalized_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (month_start = date_trunc('month', usage_date)::date),
  check (
    (status = 'reserved'
      and actual_usd_micros is null
      and finalized_at is null
      and released_at is null)
    or (status = 'finalized'
      and actual_usd_micros is not null
      and finalized_at is not null
      and released_at is null)
    or (status = 'released'
      and actual_usd_micros is null
      and finalized_at is null
      and released_at is not null)
  )
);

create index if not exists public_ai_site_budget_reservations_expiry_idx
  on public.public_ai_site_budget_reservations (status, expires_at);
create index if not exists public_ai_site_budget_reservations_day_idx
  on public.public_ai_site_budget_reservations (usage_date);

alter table public.public_ai_site_budget_monthly enable row level security;
alter table public.public_ai_site_budget_daily enable row level security;
alter table public.public_ai_site_budget_reservations enable row level security;

revoke all on table public.public_ai_site_budget_monthly
  from public, anon, authenticated;
revoke all on table public.public_ai_site_budget_daily
  from public, anon, authenticated;
revoke all on table public.public_ai_site_budget_reservations
  from public, anon, authenticated;

create or replace function public.public_ai_site_budget_result(
  p_reservation public.public_ai_site_budget_reservations
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'status', p_reservation.status,
    'reservation_id', p_reservation.reservation_id,
    'requested_usd_micros', p_reservation.requested_usd_micros,
    'actual_usd_micros', p_reservation.actual_usd_micros,
    'usage_date', p_reservation.usage_date,
    'month_start', p_reservation.month_start,
    'dispatched', p_reservation.dispatched_at is not null
  );
$$;

create or replace function public.expire_public_ai_site_budget_reservations()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.public_ai_site_budget_reservations%rowtype;
begin
  for v_reservation in
    select *
    from public.public_ai_site_budget_reservations
    where status = 'reserved'
      and expires_at <= now()
    order by month_start, usage_date, reservation_id
    for update
  loop
    insert into public.public_ai_site_budget_monthly (month_start)
    values (v_reservation.month_start)
    on conflict (month_start) do nothing;
    insert into public.public_ai_site_budget_daily (usage_date)
    values (v_reservation.usage_date)
    on conflict (usage_date) do nothing;

    perform 1
    from public.public_ai_site_budget_monthly
    where month_start = v_reservation.month_start
    for update;
    perform 1
    from public.public_ai_site_budget_daily
    where usage_date = v_reservation.usage_date
    for update;

    if v_reservation.dispatched_at is null then
      update public.public_ai_site_budget_reservations
      set status = 'released',
          released_at = now(),
          updated_at = now()
      where reservation_id = v_reservation.reservation_id
        and status = 'reserved';
    else
      update public.public_ai_site_budget_reservations
      set status = 'finalized',
          actual_usd_micros = requested_usd_micros,
          model = 'unknown-openai-request',
          finalized_at = now(),
          updated_at = now()
      where reservation_id = v_reservation.reservation_id
        and status = 'reserved';

      update public.public_ai_site_budget_monthly
      set actual_usd_micros = actual_usd_micros
            + v_reservation.requested_usd_micros,
          request_count = request_count + 1,
          last_model = 'unknown-openai-request',
          updated_at = now()
      where month_start = v_reservation.month_start;

      update public.public_ai_site_budget_daily
      set actual_usd_micros = actual_usd_micros
            + v_reservation.requested_usd_micros,
          request_count = request_count + 1,
          last_model = 'unknown-openai-request',
          updated_at = now()
      where usage_date = v_reservation.usage_date;
    end if;

    update public.public_ai_site_budget_monthly
    set reserved_usd_micros = greatest(
          0,
          reserved_usd_micros - v_reservation.requested_usd_micros
        ),
        updated_at = now()
    where month_start = v_reservation.month_start;
    update public.public_ai_site_budget_daily
    set reserved_usd_micros = greatest(
          0,
          reserved_usd_micros - v_reservation.requested_usd_micros
        ),
        updated_at = now()
    where usage_date = v_reservation.usage_date;
  end loop;
end;
$$;

create or replace function public.reserve_public_ai_site_budget(
  p_reservation_id uuid,
  p_reservation_usd_micros bigint,
  p_daily_limit_usd_micros bigint,
  p_monthly_limit_usd_micros bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usage_date date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_month_start date := date_trunc(
    'month',
    (now() at time zone 'Asia/Ho_Chi_Minh')
  )::date;
  v_daily public.public_ai_site_budget_daily%rowtype;
  v_monthly public.public_ai_site_budget_monthly%rowtype;
  v_reservation public.public_ai_site_budget_reservations%rowtype;
begin
  if p_reservation_id is null
    or p_reservation_usd_micros is null
    or p_reservation_usd_micros not between 1 and 500000
    or p_daily_limit_usd_micros is null
    or p_daily_limit_usd_micros not between 1 and 4000000
    or p_monthly_limit_usd_micros is null
    or p_monthly_limit_usd_micros not between 1 and 100000000
  then
    raise exception 'Public AI budget values are invalid';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('public-ai-site-budget', 0)
  );
  perform public.expire_public_ai_site_budget_reservations();

  select *
  into v_reservation
  from public.public_ai_site_budget_reservations
  where reservation_id = p_reservation_id
  for update;
  if found then
    if v_reservation.requested_usd_micros <> p_reservation_usd_micros then
      raise exception 'Public AI budget reservation payload does not match';
    end if;
    return public.public_ai_site_budget_result(v_reservation);
  end if;

  perform 1
  from public.public_ai_quota_reservations
  where id = p_reservation_id
    and status = 'reserved'
  for update;
  if not found then
    raise exception 'Public AI quota reservation is not available';
  end if;

  insert into public.public_ai_site_budget_monthly (month_start)
  values (v_month_start)
  on conflict (month_start) do nothing;
  insert into public.public_ai_site_budget_daily (usage_date)
  values (v_usage_date)
  on conflict (usage_date) do nothing;

  select *
  into v_monthly
  from public.public_ai_site_budget_monthly
  where month_start = v_month_start
  for update;
  select *
  into v_daily
  from public.public_ai_site_budget_daily
  where usage_date = v_usage_date
  for update;

  if v_daily.actual_usd_micros + v_daily.reserved_usd_micros
      + p_reservation_usd_micros > p_daily_limit_usd_micros then
    return jsonb_build_object(
      'status', 'daily_exceeded',
      'usage_date', v_usage_date,
      'month_start', v_month_start
    );
  end if;
  if v_monthly.actual_usd_micros + v_monthly.reserved_usd_micros
      + p_reservation_usd_micros > p_monthly_limit_usd_micros then
    return jsonb_build_object(
      'status', 'monthly_exceeded',
      'usage_date', v_usage_date,
      'month_start', v_month_start
    );
  end if;

  insert into public.public_ai_site_budget_reservations (
    reservation_id,
    requested_usd_micros,
    usage_date,
    month_start,
    expires_at
  )
  values (
    p_reservation_id,
    p_reservation_usd_micros,
    v_usage_date,
    v_month_start,
    now() + interval '10 minutes'
  )
  returning * into v_reservation;

  update public.public_ai_site_budget_monthly
  set reserved_usd_micros = reserved_usd_micros + p_reservation_usd_micros,
      updated_at = now()
  where month_start = v_month_start;
  update public.public_ai_site_budget_daily
  set reserved_usd_micros = reserved_usd_micros + p_reservation_usd_micros,
      updated_at = now()
  where usage_date = v_usage_date;

  return public.public_ai_site_budget_result(v_reservation);
end;
$$;

create or replace function public.mark_public_ai_admission_dispatched(
  p_reservation_id uuid,
  p_lease_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quota public.public_ai_quota_reservations%rowtype;
  v_budget public.public_ai_site_budget_reservations%rowtype;
begin
  if p_reservation_id is null or p_lease_token is null then
    raise exception 'Public AI reservation and lease token are required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('public-ai-site-budget', 0)
  );
  perform public.expire_public_ai_site_budget_reservations();

  select *
  into v_quota
  from public.public_ai_quota_reservations
  where id = p_reservation_id
  for update;
  select *
  into v_budget
  from public.public_ai_site_budget_reservations
  where reservation_id = p_reservation_id
  for update;

  if not found or v_budget.reservation_id is null or v_quota.status = 'released' then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_quota.status in ('dispatched', 'completed', 'outcome_unknown')
    and v_budget.dispatched_at is not null then
    return jsonb_build_object('status', v_quota.status);
  end if;
  if v_quota.status <> 'reserved'
    or v_budget.status <> 'reserved'
    or v_quota.lease_token is distinct from p_lease_token
    or v_quota.lease_expires_at <= now()
  then
    return jsonb_build_object('status', 'transition_invalid');
  end if;

  update public.public_ai_quota_reservations
  set status = 'dispatched',
      lease_token = null,
      lease_expires_at = null,
      dispatched_at = now(),
      updated_at = now()
  where id = p_reservation_id;

  update public.public_ai_site_budget_reservations
  set dispatched_at = now(),
      expires_at = greatest(expires_at, now() + interval '2 hours'),
      updated_at = now()
  where reservation_id = p_reservation_id;

  return jsonb_build_object('status', 'dispatched');
end;
$$;

create or replace function public.finalize_public_ai_site_budget(
  p_reservation_id uuid,
  p_actual_usd_micros bigint,
  p_model text,
  p_input_tokens bigint,
  p_cached_input_tokens bigint,
  p_cache_write_tokens bigint,
  p_output_tokens bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.public_ai_site_budget_reservations%rowtype;
begin
  if p_reservation_id is null
    or p_actual_usd_micros is null
    or p_actual_usd_micros not between 0 and 4000000
    or p_input_tokens is null
    or p_input_tokens not between 0 and 10000000
    or p_cached_input_tokens is null
    or p_cached_input_tokens not between 0 and 10000000
    or p_cache_write_tokens is null
    or p_cache_write_tokens not between 0 and 10000000
    or p_output_tokens is null
    or p_output_tokens not between 0 and 10000000
    or nullif(btrim(p_model), '') is null
    or octet_length(p_model) > 200
  then
    raise exception 'Public AI budget finalization values are invalid';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('public-ai-site-budget', 0)
  );
  perform public.expire_public_ai_site_budget_reservations();

  select *
  into v_reservation
  from public.public_ai_site_budget_reservations
  where reservation_id = p_reservation_id
  for update;
  if not found then
    raise exception 'Public AI budget reservation not found';
  end if;
  if v_reservation.status <> 'reserved' then
    return public.public_ai_site_budget_result(v_reservation);
  end if;
  if v_reservation.dispatched_at is null then
    raise exception 'Public AI budget reservation was not dispatched';
  end if;

  perform 1
  from public.public_ai_site_budget_monthly
  where month_start = v_reservation.month_start
  for update;
  perform 1
  from public.public_ai_site_budget_daily
  where usage_date = v_reservation.usage_date
  for update;

  update public.public_ai_site_budget_reservations
  set status = 'finalized',
      actual_usd_micros = p_actual_usd_micros,
      model = p_model,
      input_tokens = p_input_tokens,
      cached_input_tokens = p_cached_input_tokens,
      cache_write_tokens = p_cache_write_tokens,
      output_tokens = p_output_tokens,
      finalized_at = now(),
      updated_at = now()
  where reservation_id = p_reservation_id
  returning * into v_reservation;

  update public.public_ai_site_budget_monthly
  set reserved_usd_micros = greatest(
        0,
        reserved_usd_micros - v_reservation.requested_usd_micros
      ),
      actual_usd_micros = actual_usd_micros + p_actual_usd_micros,
      request_count = request_count + 1,
      input_tokens = input_tokens + p_input_tokens,
      cached_input_tokens = cached_input_tokens + p_cached_input_tokens,
      cache_write_tokens = cache_write_tokens + p_cache_write_tokens,
      output_tokens = output_tokens + p_output_tokens,
      last_model = p_model,
      updated_at = now()
  where month_start = v_reservation.month_start;
  update public.public_ai_site_budget_daily
  set reserved_usd_micros = greatest(
        0,
        reserved_usd_micros - v_reservation.requested_usd_micros
      ),
      actual_usd_micros = actual_usd_micros + p_actual_usd_micros,
      request_count = request_count + 1,
      input_tokens = input_tokens + p_input_tokens,
      cached_input_tokens = cached_input_tokens + p_cached_input_tokens,
      cache_write_tokens = cache_write_tokens + p_cache_write_tokens,
      output_tokens = output_tokens + p_output_tokens,
      last_model = p_model,
      updated_at = now()
  where usage_date = v_reservation.usage_date;

  return public.public_ai_site_budget_result(v_reservation);
end;
$$;

create or replace function public.release_public_ai_site_budget(
  p_reservation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.public_ai_site_budget_reservations%rowtype;
begin
  if p_reservation_id is null then
    raise exception 'Public AI budget reservation is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('public-ai-site-budget', 0)
  );
  perform public.expire_public_ai_site_budget_reservations();

  select *
  into v_reservation
  from public.public_ai_site_budget_reservations
  where reservation_id = p_reservation_id
  for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_reservation.status <> 'reserved' then
    return public.public_ai_site_budget_result(v_reservation);
  end if;
  if v_reservation.dispatched_at is not null then
    return jsonb_build_object('status', 'transition_invalid');
  end if;

  perform 1
  from public.public_ai_site_budget_monthly
  where month_start = v_reservation.month_start
  for update;
  perform 1
  from public.public_ai_site_budget_daily
  where usage_date = v_reservation.usage_date
  for update;

  update public.public_ai_site_budget_reservations
  set status = 'released',
      released_at = now(),
      updated_at = now()
  where reservation_id = p_reservation_id
  returning * into v_reservation;

  update public.public_ai_site_budget_monthly
  set reserved_usd_micros = greatest(
        0,
        reserved_usd_micros - v_reservation.requested_usd_micros
      ),
      updated_at = now()
  where month_start = v_reservation.month_start;
  update public.public_ai_site_budget_daily
  set reserved_usd_micros = greatest(
        0,
        reserved_usd_micros - v_reservation.requested_usd_micros
      ),
      updated_at = now()
  where usage_date = v_reservation.usage_date;

  return public.public_ai_site_budget_result(v_reservation);
end;
$$;

revoke all on function public.public_ai_site_budget_result(
  public.public_ai_site_budget_reservations
) from public, anon, authenticated;
revoke all on function public.expire_public_ai_site_budget_reservations()
  from public, anon, authenticated;
revoke all on function public.reserve_public_ai_site_budget(
  uuid, bigint, bigint, bigint
) from public, anon, authenticated;
revoke all on function public.mark_public_ai_admission_dispatched(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.finalize_public_ai_site_budget(
  uuid, bigint, text, bigint, bigint, bigint, bigint
) from public, anon, authenticated;
revoke all on function public.release_public_ai_site_budget(uuid)
  from public, anon, authenticated;

grant execute on function public.reserve_public_ai_site_budget(
  uuid, bigint, bigint, bigint
) to service_role;
grant execute on function public.mark_public_ai_admission_dispatched(uuid, uuid)
  to service_role;
grant execute on function public.finalize_public_ai_site_budget(
  uuid, bigint, text, bigint, bigint, bigint, bigint
) to service_role;
grant execute on function public.release_public_ai_site_budget(uuid)
  to service_role;

comment on table public.public_ai_site_budget_reservations is
  'Server-only site-wide cost ledger for guest and non-admin Luna Coach requests.';
