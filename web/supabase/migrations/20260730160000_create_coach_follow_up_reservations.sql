create table if not exists public.coach_follow_up_reservations (
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  request_fingerprint text not null
    check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  status text not null default 'running'
    check (status in ('running', 'completed', 'outcome_unknown')),
  response jsonb,
  model text,
  provider text check (provider in ('openai', 'gemini')),
  lease_token uuid,
  lease_expires_at timestamptz,
  dispatched_at timestamptz,
  completed_at timestamptz,
  outcome_unknown_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, idempotency_key),
  check (
    response is null
    or (
      jsonb_typeof(response) = 'object'
      and octet_length(response::text) <= 32768
    )
  ),
  check (
    (
      status = 'running'
      and response is null
      and model is null
      and provider is null
      and lease_token is not null
      and lease_expires_at is not null
      and completed_at is null
      and outcome_unknown_at is null
    )
    or (
      status = 'completed'
      and response is not null
      and model is not null
      and char_length(model) <= 200
      and char_length(btrim(model)) >= 1
      and provider is not null
      and lease_token is null
      and lease_expires_at is null
      and dispatched_at is not null
      and completed_at is not null
      and outcome_unknown_at is null
    )
    or (
      status = 'outcome_unknown'
      and response is null
      and model is null
      and provider is null
      and lease_token is null
      and lease_expires_at is null
      and dispatched_at is not null
      and completed_at is null
      and outcome_unknown_at is not null
    )
  )
);

create unique index if not exists coach_follow_up_reservation_request_idx
  on public.coach_follow_up_reservations (
    user_id,
    request_fingerprint
  );

alter table public.coach_follow_up_reservations enable row level security;

revoke all on table public.coach_follow_up_reservations
  from public, anon, authenticated;

create or replace function public.is_valid_coach_follow_up_response(
  p_response jsonb
)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_item jsonb;
begin
  if pg_catalog.jsonb_typeof(p_response) <> 'object'
    or pg_catalog.octet_length(p_response::text) > 32768
    or pg_catalog.jsonb_typeof(p_response -> 'answer') <> 'string'
    or pg_catalog.jsonb_typeof(
      p_response -> 'sourceSectionIds'
    ) <> 'array'
    or pg_catalog.jsonb_typeof(
      p_response -> 'checkQuestion'
    ) <> 'string'
    or pg_catalog.char_length(
      pg_catalog.btrim(p_response ->> 'answer')
    ) not between 1 and 1800
    or pg_catalog.char_length(
      pg_catalog.btrim(p_response ->> 'checkQuestion')
    ) not between 1 and 400
    or pg_catalog.jsonb_array_length(
      p_response -> 'sourceSectionIds'
    ) > 4
  then
    return false;
  end if;

  for v_item in
    select value
    from pg_catalog.jsonb_array_elements(
      p_response -> 'sourceSectionIds'
    )
  loop
    if pg_catalog.jsonb_typeof(v_item) <> 'string'
      or pg_catalog.char_length(
        pg_catalog.btrim(v_item #>> '{}')
      ) not between 1 and 120
    then
      return false;
    end if;
  end loop;

  return true;
exception
  when others then
    return false;
end;
$$;

revoke all on function public.is_valid_coach_follow_up_response(jsonb)
  from public, anon, authenticated;

alter table public.coach_follow_up_reservations
  drop constraint if exists coach_follow_up_response_schema_check;
alter table public.coach_follow_up_reservations
  add constraint coach_follow_up_response_schema_check
  check (
    response is null
    or public.is_valid_coach_follow_up_response(response)
  );

create or replace function public.reserve_coach_follow_up(
  p_idempotency_key uuid,
  p_request_fingerprint text,
  p_lease_seconds integer default 600
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_reservation public.coach_follow_up_reservations%rowtype;
  v_lease_token uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_idempotency_key is null
    or p_idempotency_key =
      '00000000-0000-0000-0000-000000000000'::uuid
    or p_request_fingerprint is null
    or p_request_fingerprint !~ '^[a-f0-9]{64}$'
    or p_lease_seconds is null
    or p_lease_seconds not between 240 and 900
  then
    raise exception 'Invalid coach follow-up reservation';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'coach-follow-up:' || v_user_id::text,
      0
    )
  );

  select *
  into v_reservation
  from public.coach_follow_up_reservations
  where user_id = v_user_id
    and idempotency_key = p_idempotency_key
  for update;

  if found then
    if v_reservation.request_fingerprint is distinct from
      p_request_fingerprint
    then
      return pg_catalog.jsonb_build_object(
        'status', 'idempotency_conflict'
      );
    end if;
  else
    select *
    into v_reservation
    from public.coach_follow_up_reservations
    where user_id = v_user_id
      and request_fingerprint = p_request_fingerprint
    for update;
  end if;

  if found then
    if v_reservation.status = 'completed' then
      return pg_catalog.jsonb_build_object(
        'status', 'completed',
        'idempotency_key', v_reservation.idempotency_key,
        'request_fingerprint', v_reservation.request_fingerprint,
        'response', v_reservation.response,
        'model', v_reservation.model,
        'provider', v_reservation.provider,
        'lease_token', null,
        'lease_expires_at', null,
        'outcome_unknown_at', null,
        'is_new', false
      );
    end if;

    if v_reservation.status = 'outcome_unknown' then
      return pg_catalog.jsonb_build_object(
        'status', 'outcome_unknown',
        'idempotency_key', v_reservation.idempotency_key,
        'request_fingerprint', v_reservation.request_fingerprint,
        'response', null,
        'model', null,
        'provider', null,
        'lease_token', null,
        'lease_expires_at', null,
        'outcome_unknown_at', v_reservation.outcome_unknown_at,
        'is_new', false
      );
    end if;

    if v_reservation.lease_expires_at > now() then
      return pg_catalog.jsonb_build_object(
        'status', 'busy',
        'lease_expires_at', v_reservation.lease_expires_at
      );
    end if;

    if v_reservation.dispatched_at is null then
      delete from public.coach_follow_up_reservations
      where user_id = v_user_id
        and idempotency_key = v_reservation.idempotency_key;
    else
      update public.coach_follow_up_reservations
      set status = 'outcome_unknown',
          lease_token = null,
          lease_expires_at = null,
          outcome_unknown_at = now(),
          updated_at = now()
      where user_id = v_user_id
        and idempotency_key = v_reservation.idempotency_key
      returning * into v_reservation;

      return pg_catalog.jsonb_build_object(
        'status', 'outcome_unknown',
        'idempotency_key', v_reservation.idempotency_key,
        'request_fingerprint', v_reservation.request_fingerprint,
        'response', null,
        'model', null,
        'provider', null,
        'lease_token', null,
        'lease_expires_at', null,
        'outcome_unknown_at', v_reservation.outcome_unknown_at,
        'is_new', false
      );
    end if;
  end if;

  v_lease_token := extensions.gen_random_uuid();
  insert into public.coach_follow_up_reservations (
    user_id,
    idempotency_key,
    request_fingerprint,
    lease_token,
    lease_expires_at
  ) values (
    v_user_id,
    p_idempotency_key,
    p_request_fingerprint,
    v_lease_token,
    now() + pg_catalog.make_interval(secs => p_lease_seconds)
  )
  returning * into v_reservation;

  return pg_catalog.jsonb_build_object(
    'status', 'running',
    'idempotency_key', v_reservation.idempotency_key,
    'request_fingerprint', v_reservation.request_fingerprint,
    'response', null,
    'model', null,
    'provider', null,
    'lease_token', v_reservation.lease_token,
    'lease_expires_at', v_reservation.lease_expires_at,
    'outcome_unknown_at', null,
    'is_new', true
  );
end;
$$;

create or replace function public.mark_coach_follow_up_dispatched(
  p_idempotency_key uuid,
  p_lease_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_reservation public.coach_follow_up_reservations%rowtype;
begin
  if v_user_id is null
    or p_idempotency_key is null
    or p_idempotency_key =
      '00000000-0000-0000-0000-000000000000'::uuid
    or p_lease_token is null
    or p_lease_token =
      '00000000-0000-0000-0000-000000000000'::uuid
  then
    raise exception 'Invalid coach follow-up dispatch';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'coach-follow-up:' || v_user_id::text,
      0
    )
  );

  select *
  into v_reservation
  from public.coach_follow_up_reservations
  where user_id = v_user_id
    and idempotency_key = p_idempotency_key
  for update;

  if not found then
    return pg_catalog.jsonb_build_object('status', 'not_found');
  end if;
  if v_reservation.status <> 'running' then
    return pg_catalog.jsonb_build_object(
      'status', v_reservation.status
    );
  end if;
  if v_reservation.lease_token is distinct from p_lease_token
    or v_reservation.lease_expires_at <= now()
  then
    return pg_catalog.jsonb_build_object('status', 'lease_invalid');
  end if;

  update public.coach_follow_up_reservations
  set dispatched_at = coalesce(dispatched_at, now()),
      updated_at = now()
  where user_id = v_user_id
    and idempotency_key = p_idempotency_key
  returning * into v_reservation;

  return pg_catalog.jsonb_build_object(
    'status', 'dispatched',
    'dispatched_at', v_reservation.dispatched_at
  );
end;
$$;

create or replace function public.complete_coach_follow_up(
  p_idempotency_key uuid,
  p_request_fingerprint text,
  p_lease_token uuid,
  p_response jsonb,
  p_model text,
  p_provider text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_reservation public.coach_follow_up_reservations%rowtype;
begin
  if v_user_id is null
    or p_idempotency_key is null
    or p_idempotency_key =
      '00000000-0000-0000-0000-000000000000'::uuid
    or p_request_fingerprint is null
    or p_request_fingerprint !~ '^[a-f0-9]{64}$'
    or p_lease_token is null
    or p_lease_token =
      '00000000-0000-0000-0000-000000000000'::uuid
    or p_response is null
    or not public.is_valid_coach_follow_up_response(p_response)
    or p_model is null
    or pg_catalog.char_length(p_model) > 200
    or pg_catalog.char_length(pg_catalog.btrim(p_model)) < 1
    or p_provider is null
    or p_provider not in ('openai', 'gemini')
  then
    raise exception 'Invalid coach follow-up completion';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'coach-follow-up:' || v_user_id::text,
      0
    )
  );

  select *
  into v_reservation
  from public.coach_follow_up_reservations
  where user_id = v_user_id
    and idempotency_key = p_idempotency_key
  for update;

  if not found then
    return pg_catalog.jsonb_build_object('status', 'not_found');
  end if;
  if v_reservation.request_fingerprint is distinct from
    p_request_fingerprint
  then
    return pg_catalog.jsonb_build_object(
      'status', 'idempotency_conflict'
    );
  end if;
  if v_reservation.status = 'completed' then
    return pg_catalog.jsonb_build_object(
      'status', 'completed',
      'idempotency_key', v_reservation.idempotency_key,
      'request_fingerprint', v_reservation.request_fingerprint,
      'response', v_reservation.response,
      'model', v_reservation.model,
      'provider', v_reservation.provider,
      'lease_token', null,
      'lease_expires_at', null,
      'outcome_unknown_at', null,
      'is_new', false
    );
  end if;
  if v_reservation.status = 'outcome_unknown' then
    return pg_catalog.jsonb_build_object(
      'status', 'outcome_unknown',
      'idempotency_key', v_reservation.idempotency_key,
      'request_fingerprint', v_reservation.request_fingerprint,
      'response', null,
      'model', null,
      'provider', null,
      'lease_token', null,
      'lease_expires_at', null,
      'outcome_unknown_at', v_reservation.outcome_unknown_at,
      'is_new', false
    );
  end if;
  if v_reservation.dispatched_at is null then
    return pg_catalog.jsonb_build_object(
      'status', 'dispatch_required'
    );
  end if;
  if v_reservation.lease_token is distinct from p_lease_token then
    return pg_catalog.jsonb_build_object('status', 'lease_invalid');
  end if;

  update public.coach_follow_up_reservations
  set status = 'completed',
      response = p_response,
      model = p_model,
      provider = p_provider,
      lease_token = null,
      lease_expires_at = null,
      completed_at = now(),
      updated_at = now()
  where user_id = v_user_id
    and idempotency_key = v_reservation.idempotency_key
  returning * into v_reservation;

  return pg_catalog.jsonb_build_object(
    'status', 'completed',
    'idempotency_key', v_reservation.idempotency_key,
    'request_fingerprint', v_reservation.request_fingerprint,
    'response', v_reservation.response,
    'model', v_reservation.model,
    'provider', v_reservation.provider,
    'lease_token', null,
    'lease_expires_at', null,
    'outcome_unknown_at', null,
    'is_new', true
  );
end;
$$;

create or replace function public.mark_coach_follow_up_outcome_unknown(
  p_idempotency_key uuid,
  p_request_fingerprint text,
  p_lease_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_reservation public.coach_follow_up_reservations%rowtype;
begin
  if v_user_id is null
    or p_idempotency_key is null
    or p_idempotency_key =
      '00000000-0000-0000-0000-000000000000'::uuid
    or p_request_fingerprint is null
    or p_request_fingerprint !~ '^[a-f0-9]{64}$'
    or p_lease_token is null
    or p_lease_token =
      '00000000-0000-0000-0000-000000000000'::uuid
  then
    raise exception 'Invalid coach follow-up unknown marker';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'coach-follow-up:' || v_user_id::text,
      0
    )
  );

  select *
  into v_reservation
  from public.coach_follow_up_reservations
  where user_id = v_user_id
    and idempotency_key = p_idempotency_key
  for update;

  if not found then
    return pg_catalog.jsonb_build_object('status', 'not_found');
  end if;
  if v_reservation.request_fingerprint is distinct from
    p_request_fingerprint
  then
    return pg_catalog.jsonb_build_object(
      'status', 'idempotency_conflict'
    );
  end if;
  if v_reservation.status = 'completed' then
    return pg_catalog.jsonb_build_object(
      'status', 'completed',
      'idempotency_key', v_reservation.idempotency_key,
      'request_fingerprint', v_reservation.request_fingerprint,
      'response', v_reservation.response,
      'model', v_reservation.model,
      'provider', v_reservation.provider,
      'lease_token', null,
      'lease_expires_at', null,
      'outcome_unknown_at', null,
      'is_new', false
    );
  end if;
  if v_reservation.status = 'outcome_unknown' then
    return pg_catalog.jsonb_build_object(
      'status', 'outcome_unknown',
      'idempotency_key', v_reservation.idempotency_key,
      'request_fingerprint', v_reservation.request_fingerprint,
      'response', null,
      'model', null,
      'provider', null,
      'lease_token', null,
      'lease_expires_at', null,
      'outcome_unknown_at', v_reservation.outcome_unknown_at,
      'is_new', false
    );
  end if;
  if v_reservation.dispatched_at is null then
    return pg_catalog.jsonb_build_object(
      'status', 'dispatch_required'
    );
  end if;
  if v_reservation.lease_token is distinct from p_lease_token then
    return pg_catalog.jsonb_build_object('status', 'lease_invalid');
  end if;

  update public.coach_follow_up_reservations
  set status = 'outcome_unknown',
      lease_token = null,
      lease_expires_at = null,
      outcome_unknown_at = now(),
      updated_at = now()
  where user_id = v_user_id
    and idempotency_key = v_reservation.idempotency_key
  returning * into v_reservation;

  return pg_catalog.jsonb_build_object(
    'status', 'outcome_unknown',
    'idempotency_key', v_reservation.idempotency_key,
    'request_fingerprint', v_reservation.request_fingerprint,
    'response', null,
    'model', null,
    'provider', null,
    'lease_token', null,
    'lease_expires_at', null,
    'outcome_unknown_at', v_reservation.outcome_unknown_at,
    'is_new', false
  );
end;
$$;

create or replace function public.release_coach_follow_up(
  p_idempotency_key uuid,
  p_lease_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_reservation public.coach_follow_up_reservations%rowtype;
begin
  if v_user_id is null
    or p_idempotency_key is null
    or p_idempotency_key =
      '00000000-0000-0000-0000-000000000000'::uuid
    or p_lease_token is null
    or p_lease_token =
      '00000000-0000-0000-0000-000000000000'::uuid
  then
    raise exception 'Invalid coach follow-up release';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'coach-follow-up:' || v_user_id::text,
      0
    )
  );

  select *
  into v_reservation
  from public.coach_follow_up_reservations
  where user_id = v_user_id
    and idempotency_key = p_idempotency_key
  for update;

  if not found then
    return pg_catalog.jsonb_build_object('status', 'not_found');
  end if;
  if v_reservation.status = 'completed' then
    return pg_catalog.jsonb_build_object('status', 'completed');
  end if;
  if v_reservation.status = 'outcome_unknown' then
    return pg_catalog.jsonb_build_object(
      'status', 'outcome_unknown'
    );
  end if;
  if v_reservation.lease_token is distinct from p_lease_token then
    return pg_catalog.jsonb_build_object('status', 'lease_invalid');
  end if;

  delete from public.coach_follow_up_reservations
  where user_id = v_user_id
    and idempotency_key = v_reservation.idempotency_key;

  return pg_catalog.jsonb_build_object('status', 'released');
end;
$$;

revoke all on function public.reserve_coach_follow_up(
  uuid, text, integer
) from public, anon, authenticated;
revoke all on function public.complete_coach_follow_up(
  uuid, text, uuid, jsonb, text, text
) from public, anon, authenticated;
revoke all on function public.mark_coach_follow_up_dispatched(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.mark_coach_follow_up_outcome_unknown(
  uuid, text, uuid
) from public, anon, authenticated;
revoke all on function public.release_coach_follow_up(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.reserve_coach_follow_up(
  uuid, text, integer
) to authenticated;
grant execute on function public.complete_coach_follow_up(
  uuid, text, uuid, jsonb, text, text
) to authenticated;
grant execute on function public.mark_coach_follow_up_dispatched(uuid, uuid)
  to authenticated;
grant execute on function public.mark_coach_follow_up_outcome_unknown(
  uuid, text, uuid
) to authenticated;
grant execute on function public.release_coach_follow_up(uuid, uuid)
  to authenticated;

comment on table public.coach_follow_up_reservations is
  'Per-account terminal cache and ambiguity barrier for paid AI Coach follow-up requests.';
