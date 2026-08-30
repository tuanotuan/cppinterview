-- Add a bounded, account-scoped cache for lesson AI answers and let public
-- assistant turns share the existing three-request rolling quota.

create table if not exists public.lesson_ai_reservations (
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  request_fingerprint text not null
    check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  status text not null default 'running'
    check (status in ('running', 'completed', 'outcome_unknown')),
  response jsonb,
  model text,
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
      pg_catalog.jsonb_typeof(response) = 'object'
      and pg_catalog.octet_length(response::text) <= 32768
    )
  ),
  check (
    (
      status = 'running'
      and response is null
      and model is null
      and lease_token is not null
      and lease_expires_at is not null
      and completed_at is null
      and outcome_unknown_at is null
    )
    or (
      status = 'completed'
      and response is not null
      and model is not null
      and pg_catalog.char_length(model) <= 200
      and pg_catalog.char_length(pg_catalog.btrim(model)) >= 1
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
      and lease_token is null
      and lease_expires_at is null
      and dispatched_at is not null
      and completed_at is null
      and outcome_unknown_at is not null
    )
  )
);

create unique index if not exists lesson_ai_reservation_request_idx
  on public.lesson_ai_reservations (user_id, request_fingerprint);

alter table public.lesson_ai_reservations enable row level security;

revoke all on table public.lesson_ai_reservations
  from public, anon, authenticated;

create or replace function public.is_valid_lesson_ai_response(
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
    or p_response - 'answer' - 'sourceSectionIds' - 'grounding'
      <> '{}'::jsonb
    or pg_catalog.jsonb_typeof(p_response -> 'answer') <> 'string'
    or pg_catalog.jsonb_typeof(
      p_response -> 'sourceSectionIds'
    ) <> 'array'
    or pg_catalog.jsonb_typeof(p_response -> 'grounding') <> 'string'
    or pg_catalog.char_length(
      pg_catalog.btrim(p_response ->> 'answer')
    ) not between 1 and 3000
    or p_response ->> 'grounding' not in (
      'lesson',
      'lesson_plus_general',
      'outside_scope'
    )
    or pg_catalog.jsonb_array_length(
      p_response -> 'sourceSectionIds'
    ) > 4
    or (
      p_response ->> 'grounding' = 'outside_scope'
      and pg_catalog.jsonb_array_length(
        p_response -> 'sourceSectionIds'
      ) > 0
    )
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

  if (
    select pg_catalog.count(*)
    from pg_catalog.jsonb_array_elements_text(
      p_response -> 'sourceSectionIds'
    ) as source_id(value)
  ) <> (
    select pg_catalog.count(distinct value)
    from pg_catalog.jsonb_array_elements_text(
      p_response -> 'sourceSectionIds'
    ) as source_id(value)
  )
  then
    return false;
  end if;

  return true;
exception
  when others then
    return false;
end;
$$;

revoke all on function public.is_valid_lesson_ai_response(jsonb)
  from public, anon, authenticated;

alter table public.lesson_ai_reservations
  drop constraint if exists lesson_ai_response_schema_check;
alter table public.lesson_ai_reservations
  add constraint lesson_ai_response_schema_check
  check (
    response is null
    or public.is_valid_lesson_ai_response(response)
  );

create or replace function public.lesson_ai_reservation_payload(
  p_reservation public.lesson_ai_reservations,
  p_is_new boolean
)
returns jsonb
language sql
stable
strict
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'status', p_reservation.status,
    'idempotency_key', p_reservation.idempotency_key,
    'request_fingerprint', p_reservation.request_fingerprint,
    'response', p_reservation.response,
    'model', p_reservation.model,
    'lease_token', p_reservation.lease_token,
    'lease_expires_at', p_reservation.lease_expires_at,
    'outcome_unknown_at', p_reservation.outcome_unknown_at,
    'is_new', p_is_new
  );
$$;

revoke all on function public.lesson_ai_reservation_payload(
  public.lesson_ai_reservations, boolean
) from public, anon, authenticated;

create or replace function public.reserve_lesson_ai_response(
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
  v_reservation public.lesson_ai_reservations%rowtype;
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
    raise exception 'Invalid lesson AI reservation';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'lesson-ai:' || v_user_id::text,
      0
    )
  );

  select *
  into v_reservation
  from public.lesson_ai_reservations
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
    from public.lesson_ai_reservations
    where user_id = v_user_id
      and request_fingerprint = p_request_fingerprint
    for update;
  end if;

  if found then
    if v_reservation.status = 'completed'
      or v_reservation.status = 'outcome_unknown'
    then
      return public.lesson_ai_reservation_payload(
        v_reservation,
        false
      );
    end if;

    if v_reservation.lease_expires_at > now() then
      return pg_catalog.jsonb_build_object(
        'status', 'busy',
        'lease_expires_at', v_reservation.lease_expires_at
      );
    end if;

    if v_reservation.dispatched_at is null then
      delete from public.lesson_ai_reservations
      where user_id = v_user_id
        and idempotency_key = v_reservation.idempotency_key;
    else
      update public.lesson_ai_reservations
      set status = 'outcome_unknown',
          lease_token = null,
          lease_expires_at = null,
          outcome_unknown_at = now(),
          updated_at = now()
      where user_id = v_user_id
        and idempotency_key = v_reservation.idempotency_key
      returning * into v_reservation;

      return public.lesson_ai_reservation_payload(
        v_reservation,
        false
      );
    end if;
  end if;

  v_lease_token := extensions.gen_random_uuid();
  insert into public.lesson_ai_reservations (
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

  return public.lesson_ai_reservation_payload(v_reservation, true);
end;
$$;

create or replace function public.mark_lesson_ai_response_dispatched(
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
  v_reservation public.lesson_ai_reservations%rowtype;
begin
  if v_user_id is null
    or p_idempotency_key is null
    or p_idempotency_key =
      '00000000-0000-0000-0000-000000000000'::uuid
    or p_lease_token is null
    or p_lease_token =
      '00000000-0000-0000-0000-000000000000'::uuid
  then
    raise exception 'Invalid lesson AI dispatch';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'lesson-ai:' || v_user_id::text,
      0
    )
  );

  select *
  into v_reservation
  from public.lesson_ai_reservations
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

  update public.lesson_ai_reservations
  set dispatched_at = pg_catalog.coalesce(dispatched_at, now()),
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

create or replace function public.complete_lesson_ai_response(
  p_idempotency_key uuid,
  p_request_fingerprint text,
  p_lease_token uuid,
  p_response jsonb,
  p_model text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_reservation public.lesson_ai_reservations%rowtype;
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
    or not public.is_valid_lesson_ai_response(p_response)
    or p_model is null
    or pg_catalog.char_length(p_model) > 200
    or pg_catalog.char_length(pg_catalog.btrim(p_model)) < 1
  then
    raise exception 'Invalid lesson AI completion';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'lesson-ai:' || v_user_id::text,
      0
    )
  );

  select *
  into v_reservation
  from public.lesson_ai_reservations
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
  if v_reservation.status = 'completed'
    or v_reservation.status = 'outcome_unknown'
  then
    return public.lesson_ai_reservation_payload(
      v_reservation,
      false
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

  update public.lesson_ai_reservations
  set status = 'completed',
      response = p_response,
      model = p_model,
      lease_token = null,
      lease_expires_at = null,
      completed_at = now(),
      updated_at = now()
  where user_id = v_user_id
    and idempotency_key = v_reservation.idempotency_key
  returning * into v_reservation;

  return public.lesson_ai_reservation_payload(v_reservation, true);
end;
$$;

create or replace function public.mark_lesson_ai_response_outcome_unknown(
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
  v_reservation public.lesson_ai_reservations%rowtype;
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
    raise exception 'Invalid lesson AI unknown marker';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'lesson-ai:' || v_user_id::text,
      0
    )
  );

  select *
  into v_reservation
  from public.lesson_ai_reservations
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
  if v_reservation.status = 'completed'
    or v_reservation.status = 'outcome_unknown'
  then
    return public.lesson_ai_reservation_payload(
      v_reservation,
      false
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

  update public.lesson_ai_reservations
  set status = 'outcome_unknown',
      lease_token = null,
      lease_expires_at = null,
      outcome_unknown_at = now(),
      updated_at = now()
  where user_id = v_user_id
    and idempotency_key = v_reservation.idempotency_key
  returning * into v_reservation;

  return public.lesson_ai_reservation_payload(v_reservation, false);
end;
$$;

create or replace function public.release_lesson_ai_response(
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
  v_reservation public.lesson_ai_reservations%rowtype;
begin
  if v_user_id is null
    or p_idempotency_key is null
    or p_idempotency_key =
      '00000000-0000-0000-0000-000000000000'::uuid
    or p_lease_token is null
    or p_lease_token =
      '00000000-0000-0000-0000-000000000000'::uuid
  then
    raise exception 'Invalid lesson AI release';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'lesson-ai:' || v_user_id::text,
      0
    )
  );

  select *
  into v_reservation
  from public.lesson_ai_reservations
  where user_id = v_user_id
    and idempotency_key = p_idempotency_key
  for update;

  if not found then
    return pg_catalog.jsonb_build_object('status', 'not_found');
  end if;
  if v_reservation.status = 'completed'
    or v_reservation.status = 'outcome_unknown'
  then
    return pg_catalog.jsonb_build_object(
      'status', v_reservation.status
    );
  end if;
  if v_reservation.lease_token is distinct from p_lease_token then
    return pg_catalog.jsonb_build_object('status', 'lease_invalid');
  end if;

  delete from public.lesson_ai_reservations
  where user_id = v_user_id
    and idempotency_key = v_reservation.idempotency_key;

  return pg_catalog.jsonb_build_object('status', 'released');
end;
$$;

revoke all on function public.reserve_lesson_ai_response(
  uuid, text, integer
) from public, anon, authenticated;
revoke all on function public.complete_lesson_ai_response(
  uuid, text, uuid, jsonb, text
) from public, anon, authenticated;
revoke all on function public.mark_lesson_ai_response_dispatched(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.mark_lesson_ai_response_outcome_unknown(
  uuid, text, uuid
) from public, anon, authenticated;
revoke all on function public.release_lesson_ai_response(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.reserve_lesson_ai_response(
  uuid, text, integer
) to authenticated;
grant execute on function public.complete_lesson_ai_response(
  uuid, text, uuid, jsonb, text
) to authenticated;
grant execute on function public.mark_lesson_ai_response_dispatched(uuid, uuid)
  to authenticated;
grant execute on function public.mark_lesson_ai_response_outcome_unknown(
  uuid, text, uuid
) to authenticated;
grant execute on function public.release_lesson_ai_response(uuid, uuid)
  to authenticated;

comment on table public.lesson_ai_reservations is
  'Per-account terminal cache and ambiguity barrier for paid lesson assistant requests. Stores no raw prompt or conversation.';

alter table public.public_ai_quota_reservations
  drop constraint if exists
    public_ai_quota_reservations_request_kind_check;
alter table public.public_ai_quota_reservations
  add constraint public_ai_quota_reservations_request_kind_check
  check (request_kind in (
    'coach_evaluation',
    'coach_follow_up',
    'lesson_assistant'
  ));

create or replace function public.reserve_public_ai_quota(
  p_principal_hash text,
  p_ip_hash text,
  p_device_hash text,
  p_account_hash text,
  p_idempotency_key uuid,
  p_request_fingerprint text,
  p_request_kind text,
  p_lease_seconds integer default 600
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit constant integer := 3;
  v_window interval := interval '24 hours';
  v_subject record;
  v_bucket public.public_ai_quota_windows%rowtype;
  v_existing public.public_ai_quota_reservations%rowtype;
  v_reservation public.public_ai_quota_reservations%rowtype;
  v_used integer;
  v_device_used integer := 0;
  v_device_window_ends_at timestamptz;
  v_exhausted boolean := false;
  v_now timestamptz := now();
begin
  if p_principal_hash is null
    or p_principal_hash !~ '^[a-f0-9]{64}$'
    or p_ip_hash is null
    or p_ip_hash !~ '^[a-f0-9]{64}$'
    or p_device_hash is null
    or p_device_hash !~ '^[a-f0-9]{64}$'
    or (p_account_hash is not null and p_account_hash !~ '^[a-f0-9]{64}$')
    or p_principal_hash <> p_device_hash
      and p_principal_hash is distinct from p_account_hash
  then
    raise exception 'Invalid public AI quota identity';
  end if;
  if p_idempotency_key is null
    or p_idempotency_key =
      '00000000-0000-0000-0000-000000000000'::uuid
    or p_request_fingerprint is null
    or p_request_fingerprint !~ '^[a-f0-9]{64}$'
    or p_request_kind not in (
      'coach_evaluation',
      'coach_follow_up',
      'lesson_assistant'
    )
    or p_lease_seconds not between 120 and 900
  then
    raise exception 'Invalid public AI quota reservation';
  end if;

  for v_subject in
    select subject_kind, subject_hash
    from (
      values
        ('account'::text, p_account_hash),
        ('device'::text, p_device_hash),
        ('ip'::text, p_ip_hash)
    ) as subjects(subject_kind, subject_hash)
    where subject_hash is not null
    order by subject_kind
  loop
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'public-ai-quota:' || v_subject.subject_kind || ':' ||
          v_subject.subject_hash,
        0
      )
    );
  end loop;

  update public.public_ai_quota_reservations
  set status = 'released',
      lease_token = null,
      lease_expires_at = null,
      released_at = v_now,
      updated_at = v_now
  where principal_hash = p_principal_hash
    and status = 'reserved'
    and lease_expires_at <= v_now;

  select *
  into v_existing
  from public.public_ai_quota_reservations
  where principal_hash = p_principal_hash
    and idempotency_key = p_idempotency_key
    and status <> 'released'
  for update;

  if found then
    if v_existing.request_fingerprint is distinct from p_request_fingerprint
      or v_existing.request_kind is distinct from p_request_kind
    then
      return pg_catalog.jsonb_build_object(
        'status', 'idempotency_conflict',
        'reservation_id', v_existing.id,
        'is_new', false
      );
    end if;

    return pg_catalog.jsonb_build_object(
      'status', v_existing.status,
      'reservation_id', v_existing.id,
      'lease_token', v_existing.lease_token,
      'lease_expires_at', v_existing.lease_expires_at,
      'is_new', false
    );
  end if;

  select *
  into v_existing
  from public.public_ai_quota_reservations
  where principal_hash = p_principal_hash
    and request_fingerprint = p_request_fingerprint
    and status <> 'released'
  for update;

  if found then
    return pg_catalog.jsonb_build_object(
      'status', v_existing.status,
      'reservation_id', v_existing.id,
      'lease_token', v_existing.lease_token,
      'lease_expires_at', v_existing.lease_expires_at,
      'is_new', false
    );
  end if;

  for v_subject in
    select subject_kind, subject_hash
    from (
      values
        ('account'::text, p_account_hash),
        ('device'::text, p_device_hash),
        ('ip'::text, p_ip_hash)
    ) as subjects(subject_kind, subject_hash)
    where subject_hash is not null
    order by subject_kind
  loop
    insert into public.public_ai_quota_windows (
      subject_kind,
      subject_hash,
      window_started_at,
      window_ends_at
    )
    values (
      v_subject.subject_kind,
      v_subject.subject_hash,
      v_now,
      v_now + v_window
    )
    on conflict (subject_kind, subject_hash) do nothing;

    select *
    into v_bucket
    from public.public_ai_quota_windows
    where subject_kind = v_subject.subject_kind
      and subject_hash = v_subject.subject_hash
    for update;

    if v_bucket.window_ends_at <= v_now then
      update public.public_ai_quota_windows
      set window_started_at = v_now,
          window_ends_at = v_now + v_window,
          updated_at = v_now
      where subject_kind = v_bucket.subject_kind
        and subject_hash = v_bucket.subject_hash
      returning * into v_bucket;
    end if;

    select pg_catalog.count(*)::integer
    into v_used
    from public.public_ai_quota_reservations
    where created_at >= v_bucket.window_started_at
      and created_at < v_bucket.window_ends_at
      and (
        (v_subject.subject_kind = 'ip'
          and ip_hash = v_subject.subject_hash)
        or (v_subject.subject_kind = 'device'
          and device_hash = v_subject.subject_hash)
        or (v_subject.subject_kind = 'account'
          and account_hash = v_subject.subject_hash)
      )
      and (
        status in ('dispatched', 'completed', 'outcome_unknown')
        or (status = 'reserved' and lease_expires_at > v_now)
      );

    if v_subject.subject_kind = 'device' then
      v_device_used := v_used;
      v_device_window_ends_at := v_bucket.window_ends_at;
    end if;
    if v_used >= v_limit then
      v_exhausted := true;
    end if;
  end loop;

  if v_exhausted then
    return pg_catalog.jsonb_build_object(
      'status', 'quota_exceeded',
      'reservation_id', null,
      'is_new', false,
      'limit', v_limit,
      'remaining', pg_catalog.greatest(0, v_limit - v_device_used),
      'resets_at', v_device_window_ends_at
    );
  end if;

  insert into public.public_ai_quota_reservations (
    principal_hash,
    ip_hash,
    device_hash,
    account_hash,
    idempotency_key,
    request_fingerprint,
    request_kind,
    lease_token,
    lease_expires_at
  )
  values (
    p_principal_hash,
    p_ip_hash,
    p_device_hash,
    p_account_hash,
    p_idempotency_key,
    p_request_fingerprint,
    p_request_kind,
    extensions.gen_random_uuid(),
    v_now + pg_catalog.make_interval(secs => p_lease_seconds)
  )
  returning * into v_reservation;

  return pg_catalog.jsonb_build_object(
    'status', v_reservation.status,
    'reservation_id', v_reservation.id,
    'lease_token', v_reservation.lease_token,
    'lease_expires_at', v_reservation.lease_expires_at,
    'is_new', true,
    'limit', v_limit,
    'remaining', pg_catalog.greatest(0, v_limit - v_device_used - 1),
    'resets_at', v_device_window_ends_at
  );
end;
$$;

revoke all on function public.reserve_public_ai_quota(
  text, text, text, text, uuid, text, text, integer
) from public, anon, authenticated;
grant execute on function public.reserve_public_ai_quota(
  text, text, text, text, uuid, text, text, integer
) to service_role;

notify pgrst, 'reload schema';
