-- Record each interactive AI reservation as a durable, account-scoped state
-- machine. The UUID is created by the app before admission, so every transition
-- can be repeated after a lost response without changing accounting twice.

create table public.ai_budget_reservations (
  user_id uuid not null references auth.users(id) on delete cascade,
  reservation_id uuid not null,
  status text not null default 'running'
    check (status in ('running', 'finalized', 'released')),
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
  primary key (user_id, reservation_id),
  check (month_start = date_trunc('month', usage_date)::date),
  check (
    (
      status = 'running'
      and actual_usd_micros is null
      and finalized_at is null
      and released_at is null
    )
    or (
      status = 'finalized'
      and actual_usd_micros is not null
      and finalized_at is not null
      and released_at is null
    )
    or (
      status = 'released'
      and actual_usd_micros is null
      and finalized_at is null
      and released_at is not null
    )
  )
);

create index ai_budget_reservations_expiry_idx
  on public.ai_budget_reservations (user_id, status, expires_at);
create index ai_budget_reservations_user_day_idx
  on public.ai_budget_reservations (user_id, usage_date);

alter table public.ai_budget_reservations enable row level security;
revoke all on table public.ai_budget_reservations
  from public, anon, authenticated;

create function public.ai_budget_reservation_result(
  p_reservation public.ai_budget_reservations
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

-- Caller functions hold a per-account advisory transaction lock before invoking
-- this helper. Undispatched work is safe to release. Dispatched work has an
-- unknown provider outcome after expiry, so it is finalized at the full
-- reservation instead of becoming free.
create function public.expire_ai_budget_reservations(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.ai_budget_reservations%rowtype;
  v_remaining_reserved bigint;
begin
  for v_reservation in
    select *
    from public.ai_budget_reservations
    where user_id = p_user_id
      and status = 'running'
      and expires_at <= now()
    order by month_start, usage_date, reservation_id
    for update
  loop
    insert into public.ai_usage_monthly (user_id, month_start)
    values (p_user_id, v_reservation.month_start)
    on conflict (user_id, month_start) do nothing;

    insert into public.ai_usage_daily (user_id, usage_date)
    values (p_user_id, v_reservation.usage_date)
    on conflict (user_id, usage_date) do nothing;

    perform 1
    from public.ai_usage_monthly
    where user_id = p_user_id
      and month_start = v_reservation.month_start
    for update;

    perform 1
    from public.ai_usage_daily
    where user_id = p_user_id
      and usage_date = v_reservation.usage_date
    for update;

    if v_reservation.dispatched_at is null then
      update public.ai_budget_reservations
      set status = 'released',
          released_at = now(),
          updated_at = now()
      where user_id = p_user_id
        and reservation_id = v_reservation.reservation_id
        and status = 'running';
    else
      update public.ai_budget_reservations
      set status = 'finalized',
          actual_usd_micros = requested_usd_micros,
          model = 'unknown-openai-request',
          finalized_at = now(),
          updated_at = now()
      where user_id = p_user_id
        and reservation_id = v_reservation.reservation_id
        and status = 'running';
    end if;

    select coalesce(sum(requested_usd_micros), 0)
    into v_remaining_reserved
    from public.ai_budget_reservations
    where user_id = p_user_id
      and month_start = v_reservation.month_start
      and status = 'running';

    update public.ai_usage_monthly
    set reserved_usd_micros = greatest(
          0,
          reserved_usd_micros - v_reservation.requested_usd_micros,
          v_remaining_reserved
        ),
        usage_floor_usd_micros = case
          when v_reservation.dispatched_at is null
            then usage_floor_usd_micros
          else greatest(usage_floor_usd_micros, actual_usd_micros)
            + v_reservation.requested_usd_micros
        end,
        actual_usd_micros = actual_usd_micros
          + case
              when v_reservation.dispatched_at is null then 0
              else v_reservation.requested_usd_micros
            end,
        request_count = request_count
          + case when v_reservation.dispatched_at is null then 0 else 1 end,
        last_model = case
          when v_reservation.dispatched_at is null then last_model
          else 'unknown-openai-request'
        end,
        updated_at = now()
    where user_id = p_user_id
      and month_start = v_reservation.month_start;

    select coalesce(sum(requested_usd_micros), 0)
    into v_remaining_reserved
    from public.ai_budget_reservations
    where user_id = p_user_id
      and usage_date = v_reservation.usage_date
      and status = 'running';

    update public.ai_usage_daily
    set reserved_usd_micros = greatest(
          0,
          reserved_usd_micros - v_reservation.requested_usd_micros,
          v_remaining_reserved
        ),
        usage_floor_usd_micros = case
          when v_reservation.dispatched_at is null
            then usage_floor_usd_micros
          else greatest(usage_floor_usd_micros, actual_usd_micros)
            + v_reservation.requested_usd_micros
        end,
        actual_usd_micros = actual_usd_micros
          + case
              when v_reservation.dispatched_at is null then 0
              else v_reservation.requested_usd_micros
            end,
        request_count = request_count
          + case when v_reservation.dispatched_at is null then 0 else 1 end,
        last_model = case
          when v_reservation.dispatched_at is null then last_model
          else 'unknown-openai-request'
        end,
        updated_at = now()
    where user_id = p_user_id
      and usage_date = v_reservation.usage_date;
  end loop;
end;
$$;

create function public.reserve_ai_budget_reservation(
  p_reservation_id uuid,
  p_reservation_usd_micros bigint,
  p_daily_limit_usd_micros bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_usage_date date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_month_start date := date_trunc(
    'month',
    (now() at time zone 'Asia/Ho_Chi_Minh')
  )::date;
  v_daily_actual bigint;
  v_daily_floor bigint;
  v_daily_reserved bigint;
  v_ledger_reserved bigint;
  v_monthly_reserved bigint;
  v_monthly_ledger_reserved bigint;
  v_daily_reservation_count bigint;
  v_reservation public.ai_budget_reservations%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_reservation_id is null
    or p_reservation_usd_micros is null
    or p_reservation_usd_micros <= 0
    or p_reservation_usd_micros > 500000
    or p_daily_limit_usd_micros is null
    or p_daily_limit_usd_micros <= 0
    or p_daily_limit_usd_micros > 4000000 then
    raise exception 'Budget values exceed the allowed bounds';
  end if;

  -- Serialize admission and terminal transitions for this account. Concurrent
  -- retries of one UUID therefore observe the committed row instead of adding
  -- another aggregate reservation.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 19421101)
  );
  perform public.expire_ai_budget_reservations(v_user_id);

  select *
  into v_reservation
  from public.ai_budget_reservations
  where user_id = v_user_id
    and reservation_id = p_reservation_id
  for update;

  if found then
    if v_reservation.requested_usd_micros
      <> p_reservation_usd_micros then
      raise exception 'Reservation payload does not match';
    end if;
    return public.ai_budget_reservation_result(v_reservation);
  end if;

  -- The authenticated RPC is intentionally callable with the user's JWT.
  -- Bound durable row creation independently of caller-supplied UUIDs and
  -- count terminal rows as well, so reserve/finalize churn cannot bypass it.
  select count(*)
  into v_daily_reservation_count
  from public.ai_budget_reservations
  where user_id = v_user_id
    and usage_date = v_usage_date;
  if v_daily_reservation_count >= 256 then
    return jsonb_build_object(
      'status', 'daily_exceeded',
      'usage_date', v_usage_date,
      'month_start', v_month_start
    );
  end if;

  insert into public.ai_usage_monthly (user_id, month_start)
  values (v_user_id, v_month_start)
  on conflict (user_id, month_start) do nothing;

  insert into public.ai_usage_daily (user_id, usage_date)
  values (v_user_id, v_usage_date)
  on conflict (user_id, usage_date) do nothing;

  select reserved_usd_micros
  into v_monthly_reserved
  from public.ai_usage_monthly
  where user_id = v_user_id and month_start = v_month_start
  for update;

  select actual_usd_micros, usage_floor_usd_micros, reserved_usd_micros
  into v_daily_actual, v_daily_floor, v_daily_reserved
  from public.ai_usage_daily
  where user_id = v_user_id and usage_date = v_usage_date
  for update;

  -- During a rolling deploy an old release RPC can still lower the aggregate
  -- counter. Never admit below the durable sum of running ledger rows.
  select coalesce(sum(requested_usd_micros), 0)
  into v_ledger_reserved
  from public.ai_budget_reservations
  where user_id = v_user_id
    and usage_date = v_usage_date
    and status = 'running';
  v_daily_reserved := greatest(v_daily_reserved, v_ledger_reserved);

  select coalesce(sum(requested_usd_micros), 0)
  into v_monthly_ledger_reserved
  from public.ai_budget_reservations
  where user_id = v_user_id
    and month_start = v_month_start
    and status = 'running';
  v_monthly_reserved := greatest(
    v_monthly_reserved,
    v_monthly_ledger_reserved
  );

  if greatest(v_daily_actual, v_daily_floor)
      + v_daily_reserved
      + p_reservation_usd_micros
    > p_daily_limit_usd_micros then
    return jsonb_build_object(
      'status', 'daily_exceeded',
      'usage_date', v_usage_date,
      'month_start', v_month_start
    );
  end if;

  insert into public.ai_budget_reservations (
    user_id,
    reservation_id,
    requested_usd_micros,
    usage_date,
    month_start,
    expires_at
  )
  values (
    v_user_id,
    p_reservation_id,
    p_reservation_usd_micros,
    v_usage_date,
    v_month_start,
    now() + interval '10 minutes'
  )
  returning * into v_reservation;

  update public.ai_usage_monthly
  set reserved_usd_micros = v_monthly_reserved
        + p_reservation_usd_micros,
      updated_at = now()
  where user_id = v_user_id and month_start = v_month_start;

  update public.ai_usage_daily
  set reserved_usd_micros = v_daily_reserved
        + p_reservation_usd_micros,
      usage_floor_usd_micros = greatest(
        usage_floor_usd_micros,
        actual_usd_micros
      ),
      updated_at = now()
  where user_id = v_user_id and usage_date = v_usage_date;

  return public.ai_budget_reservation_result(v_reservation);
end;
$$;

create function public.mark_ai_budget_reservation_dispatched(
  p_reservation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_reservation public.ai_budget_reservations%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_reservation_id is null then
    raise exception 'Reservation id is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 19421101)
  );
  perform public.expire_ai_budget_reservations(v_user_id);

  select *
  into v_reservation
  from public.ai_budget_reservations
  where user_id = v_user_id
    and reservation_id = p_reservation_id
  for update;
  if not found then
    raise exception 'Budget reservation not found';
  end if;

  if v_reservation.status = 'running' then
    update public.ai_budget_reservations
    set dispatched_at = coalesce(dispatched_at, now()),
        expires_at = greatest(expires_at, now() + interval '2 hours'),
        updated_at = now()
    where user_id = v_user_id
      and reservation_id = p_reservation_id
    returning * into v_reservation;
  end if;

  return public.ai_budget_reservation_result(v_reservation);
end;
$$;

create function public.finalize_ai_budget_reservation(
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
  v_user_id uuid := auth.uid();
  v_reservation public.ai_budget_reservations%rowtype;
  v_remaining_reserved bigint;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_reservation_id is null
    or p_actual_usd_micros is null
    or p_actual_usd_micros < 0
    or p_input_tokens is null
    or p_input_tokens < 0
    or p_cached_input_tokens is null
    or p_cached_input_tokens < 0
    or p_cached_input_tokens > 10000000
    or p_cache_write_tokens is null
    or p_cache_write_tokens < 0
    or p_cache_write_tokens > 10000000
    or p_output_tokens is null
    or p_output_tokens < 0
    or p_output_tokens > 10000000
    or p_input_tokens > 10000000
    or p_actual_usd_micros > 4000000
    or nullif(btrim(p_model), '') is null
    or octet_length(p_model) > 200 then
    raise exception 'Finalization values are invalid';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 19421101)
  );
  perform public.expire_ai_budget_reservations(v_user_id);

  select *
  into v_reservation
  from public.ai_budget_reservations
  where user_id = v_user_id
    and reservation_id = p_reservation_id
  for update;
  if not found then
    raise exception 'Budget reservation not found';
  end if;

  -- A repeated call after a committed-but-lost response returns the persisted
  -- terminal result and cannot increment cost or request counters again.
  if v_reservation.status <> 'running' then
    return public.ai_budget_reservation_result(v_reservation);
  end if;
  if v_reservation.dispatched_at is null then
    raise exception 'Budget reservation was not dispatched';
  end if;

  perform 1
  from public.ai_usage_monthly
  where user_id = v_user_id
    and month_start = v_reservation.month_start
  for update;

  perform 1
  from public.ai_usage_daily
  where user_id = v_user_id
    and usage_date = v_reservation.usage_date
  for update;

  update public.ai_budget_reservations
  set status = 'finalized',
      actual_usd_micros = p_actual_usd_micros,
      model = p_model,
      input_tokens = p_input_tokens,
      cached_input_tokens = p_cached_input_tokens,
      cache_write_tokens = p_cache_write_tokens,
      output_tokens = p_output_tokens,
      finalized_at = now(),
      updated_at = now()
  where user_id = v_user_id
    and reservation_id = p_reservation_id
    and status = 'running'
  returning * into v_reservation;

  select coalesce(sum(requested_usd_micros), 0)
  into v_remaining_reserved
  from public.ai_budget_reservations
  where user_id = v_user_id
    and month_start = v_reservation.month_start
    and status = 'running';

  update public.ai_usage_monthly
  set reserved_usd_micros = greatest(
        0,
        reserved_usd_micros - v_reservation.requested_usd_micros,
        v_remaining_reserved
      ),
      usage_floor_usd_micros = greatest(
        usage_floor_usd_micros,
        actual_usd_micros
      ) + p_actual_usd_micros,
      actual_usd_micros = actual_usd_micros + p_actual_usd_micros,
      request_count = request_count + 1,
      input_tokens = input_tokens + p_input_tokens,
      cached_input_tokens = cached_input_tokens + p_cached_input_tokens,
      cache_write_tokens = cache_write_tokens + p_cache_write_tokens,
      output_tokens = output_tokens + p_output_tokens,
      last_model = p_model,
      updated_at = now()
  where user_id = v_user_id
    and month_start = v_reservation.month_start;

  select coalesce(sum(requested_usd_micros), 0)
  into v_remaining_reserved
  from public.ai_budget_reservations
  where user_id = v_user_id
    and usage_date = v_reservation.usage_date
    and status = 'running';

  update public.ai_usage_daily
  set reserved_usd_micros = greatest(
        0,
        reserved_usd_micros - v_reservation.requested_usd_micros,
        v_remaining_reserved
      ),
      usage_floor_usd_micros = greatest(
        usage_floor_usd_micros,
        actual_usd_micros
      ) + p_actual_usd_micros,
      actual_usd_micros = actual_usd_micros + p_actual_usd_micros,
      request_count = request_count + 1,
      input_tokens = input_tokens + p_input_tokens,
      cached_input_tokens = cached_input_tokens + p_cached_input_tokens,
      cache_write_tokens = cache_write_tokens + p_cache_write_tokens,
      output_tokens = output_tokens + p_output_tokens,
      last_model = p_model,
      updated_at = now()
  where user_id = v_user_id
    and usage_date = v_reservation.usage_date;

  return public.ai_budget_reservation_result(v_reservation);
end;
$$;

create function public.release_ai_budget_reservation(
  p_reservation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_reservation public.ai_budget_reservations%rowtype;
  v_remaining_reserved bigint;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_reservation_id is null then
    raise exception 'Reservation id is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 19421101)
  );
  perform public.expire_ai_budget_reservations(v_user_id);

  select *
  into v_reservation
  from public.ai_budget_reservations
  where user_id = v_user_id
    and reservation_id = p_reservation_id
  for update;
  if not found then
    raise exception 'Budget reservation not found';
  end if;

  -- Finalized/released are cached terminal outcomes. In particular, a late
  -- release can never subtract a caller-supplied amount from an aggregate.
  if v_reservation.status <> 'running' then
    return public.ai_budget_reservation_result(v_reservation);
  end if;

  perform 1
  from public.ai_usage_monthly
  where user_id = v_user_id
    and month_start = v_reservation.month_start
  for update;

  perform 1
  from public.ai_usage_daily
  where user_id = v_user_id
    and usage_date = v_reservation.usage_date
  for update;

  update public.ai_budget_reservations
  set status = 'released',
      released_at = now(),
      updated_at = now()
  where user_id = v_user_id
    and reservation_id = p_reservation_id
    and status = 'running'
  returning * into v_reservation;

  select coalesce(sum(requested_usd_micros), 0)
  into v_remaining_reserved
  from public.ai_budget_reservations
  where user_id = v_user_id
    and month_start = v_reservation.month_start
    and status = 'running';

  update public.ai_usage_monthly
  set reserved_usd_micros = greatest(
        0,
        reserved_usd_micros - v_reservation.requested_usd_micros,
        v_remaining_reserved
      ),
      updated_at = now()
  where user_id = v_user_id
    and month_start = v_reservation.month_start;

  select coalesce(sum(requested_usd_micros), 0)
  into v_remaining_reserved
  from public.ai_budget_reservations
  where user_id = v_user_id
    and usage_date = v_reservation.usage_date
    and status = 'running';

  update public.ai_usage_daily
  set reserved_usd_micros = greatest(
        0,
        reserved_usd_micros - v_reservation.requested_usd_micros,
        v_remaining_reserved
      ),
      updated_at = now()
  where user_id = v_user_id
    and usage_date = v_reservation.usage_date;

  return public.ai_budget_reservation_result(v_reservation);
end;
$$;

comment on table public.ai_budget_reservations is
  'Idempotent per-request accounting ledger for interactive AI provider calls.';
comment on function public.reserve_ai_budget_reservation(uuid, bigint, bigint) is
  'Admits one UUID once against the Vietnam-day web quota.';
comment on function public.mark_ai_budget_reservation_dispatched(uuid) is
  'Durably marks that a provider request may begin; repeated calls are cached.';
comment on function public.finalize_ai_budget_reservation(uuid, bigint, text, bigint, bigint, bigint, bigint) is
  'Finalizes one exact reservation once and returns its cached terminal result.';
comment on function public.release_ai_budget_reservation(uuid) is
  'Releases one exact reservation once and returns its cached terminal result.';

revoke all on function public.ai_budget_reservation_result(public.ai_budget_reservations)
  from public, anon, authenticated;
revoke all on function public.expire_ai_budget_reservations(uuid)
  from public, anon, authenticated;
revoke all on function public.reserve_ai_budget_reservation(uuid, bigint, bigint)
  from public, anon, authenticated;
revoke all on function public.mark_ai_budget_reservation_dispatched(uuid)
  from public, anon, authenticated;
revoke all on function public.finalize_ai_budget_reservation(uuid, bigint, text, bigint, bigint, bigint, bigint)
  from public, anon, authenticated;
revoke all on function public.release_ai_budget_reservation(uuid)
  from public, anon, authenticated;

grant execute on function public.reserve_ai_budget_reservation(uuid, bigint, bigint)
  to authenticated;
grant execute on function public.mark_ai_budget_reservation_dispatched(uuid)
  to authenticated;
grant execute on function public.finalize_ai_budget_reservation(uuid, bigint, text, bigint, bigint, bigint, bigint)
  to authenticated;
grant execute on function public.release_ai_budget_reservation(uuid)
  to authenticated;

-- Retire aggregate-only mutation entry points in the same migration. Leaving
-- them executable would let an authenticated caller subtract an arbitrary
-- amount without owning a reservation UUID. Existing aggregate reservations
-- may belong to provider calls already in flight, so charge their full held
-- amount conservatively before clearing them.
lock table public.ai_usage_monthly in share row exclusive mode;
lock table public.ai_usage_daily in share row exclusive mode;

update public.ai_usage_monthly
set usage_floor_usd_micros = greatest(
      usage_floor_usd_micros,
      actual_usd_micros
    ) + reserved_usd_micros,
    actual_usd_micros = actual_usd_micros + reserved_usd_micros,
    reserved_usd_micros = 0,
    last_model = case
      when reserved_usd_micros > 0 then 'unknown-legacy-openai-request'
      else last_model
    end,
    updated_at = now()
where reserved_usd_micros > 0;

update public.ai_usage_daily
set usage_floor_usd_micros = greatest(
      usage_floor_usd_micros,
      actual_usd_micros
    ) + reserved_usd_micros,
    actual_usd_micros = actual_usd_micros + reserved_usd_micros,
    reserved_usd_micros = 0,
    last_model = case
      when reserved_usd_micros > 0 then 'unknown-legacy-openai-request'
      else last_model
    end,
    updated_at = now()
where reserved_usd_micros > 0;

create or replace function public.reserve_web_ai_budget(
  p_reservation_usd_micros bigint,
  p_daily_limit_usd_micros bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'AI budget client upgrade required';
end;
$$;

create or replace function public.reserve_ai_budget(
  p_reservation_usd_micros bigint,
  p_monthly_limit_usd_micros bigint,
  p_daily_limit_usd_micros bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'AI budget client upgrade required';
end;
$$;

revoke all on function public.reserve_web_ai_budget(bigint, bigint)
  from public, anon, authenticated;
revoke all on function public.reserve_ai_budget(bigint, bigint)
  from public, anon, authenticated;
revoke all on function public.reserve_ai_budget(bigint, bigint, bigint)
  from public, anon, authenticated;
revoke all on function public.finalize_ai_budget(
  bigint, bigint, text, bigint, bigint, bigint, bigint
) from public, anon, authenticated;
revoke all on function public.finalize_ai_budget(
  bigint, bigint, text, bigint, bigint, bigint, bigint, date, date
) from public, anon, authenticated;
revoke all on function public.release_ai_budget(bigint)
  from public, anon, authenticated;
revoke all on function public.release_ai_budget(bigint, date, date)
  from public, anon, authenticated;
