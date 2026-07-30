-- The original report lease could be renewed after an application crash or an
-- ambiguous provider timeout. At that point the server cannot prove whether
-- paid work already ran, so renewal could charge for the same report twice.

create or replace function public.mock_interview_retry_protocol_version()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 2
$$;

alter table public.mock_interview_attempts
  add column if not exists dispatched_at timestamptz;

-- Rows that predate protocol 2 may already have reached the provider. Treat
-- those in-flight leases conservatively during the rollout.
update public.mock_interview_attempts
set dispatched_at = coalesce(dispatched_at, created_at)
where status = 'reserved';

drop policy if exists "Users delete their own mock interview attempts"
  on public.mock_interview_attempts;
create policy "Users delete their own mock interview attempts"
  on public.mock_interview_attempts
  for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and (
      status = 'completed'
      or (
        status = 'failed'
        and failure @> '{"retryable": true}'::jsonb
      )
      or (
        status = 'reserved'
        and lease_expires_at <= now()
        and dispatched_at is null
      )
    )
  );

alter function public.reserve_mock_interview_attempt(
  uuid, uuid, uuid, text, text, integer, text, integer, text, integer, text,
  integer, jsonb, integer
) rename to reserve_mock_interview_attempt_v1;

revoke all on function public.reserve_mock_interview_attempt_v1(
  uuid, uuid, uuid, text, text, integer, text, integer, text, integer, text,
  integer, jsonb, integer
) from public, anon, authenticated, service_role;

create or replace function public.reserve_mock_interview_attempt(
  p_user_id uuid,
  p_session_id uuid,
  p_idempotency_key uuid,
  p_request_fingerprint text,
  p_profile_id text,
  p_profile_version integer,
  p_role_profile_id text,
  p_role_profile_version integer,
  p_blueprint_id text,
  p_blueprint_version integer,
  p_blueprint_fingerprint text,
  p_duration_minutes integer,
  p_public_attempt jsonb,
  p_lease_seconds integer default 1200
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.mock_interview_attempts%rowtype;
begin
  if p_user_id is null
    or p_user_id = '00000000-0000-0000-0000-000000000000'::uuid
    or p_idempotency_key is null
    or p_idempotency_key = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'A user and idempotency UUID are required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  -- The renamed v1 implementation still performs a seven-day cleanup without
  -- knowing about dispatched_at. Resolve those rows first so its legacy delete
  -- cannot erase an ambiguous paid outcome.
  update public.mock_interview_attempts
  set status = 'failed',
      failure = jsonb_build_object(
        'code', 'provider_outcome_unknown',
        'retryable', false
      ),
      lease_token = null,
      lease_expires_at = null,
      completed_at = now(),
      updated_at = now()
  where user_id = p_user_id
    and status = 'reserved'
    and lease_expires_at < now() - interval '7 days'
    and dispatched_at is not null;

  delete from public.mock_interview_attempts
  where user_id = p_user_id
    and status = 'reserved'
    and lease_expires_at < now() - interval '7 days'
    and dispatched_at is null;

  select *
  into v_existing
  from public.mock_interview_attempts
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key
  for update;

  if found
    and v_existing.status = 'reserved'
    and v_existing.lease_expires_at <= now() then
    if v_existing.dispatched_at is null then
      delete from public.mock_interview_attempts
      where id = v_existing.id
        and user_id = p_user_id;
    else
      update public.mock_interview_attempts
      set status = 'failed',
          failure = jsonb_build_object(
            'code', 'provider_outcome_unknown',
            'retryable', false
          ),
          lease_token = null,
          lease_expires_at = null,
          completed_at = now(),
          updated_at = now()
      where id = v_existing.id
        and user_id = p_user_id;
    end if;
  end if;

  return public.reserve_mock_interview_attempt_v1(
    p_user_id,
    p_session_id,
    p_idempotency_key,
    p_request_fingerprint,
    p_profile_id,
    p_profile_version,
    p_role_profile_id,
    p_role_profile_version,
    p_blueprint_id,
    p_blueprint_version,
    p_blueprint_fingerprint,
    p_duration_minutes,
    p_public_attempt,
    p_lease_seconds
  );
end;
$$;

create or replace function public.mark_mock_interview_attempt_dispatched(
  p_user_id uuid,
  p_attempt_id uuid,
  p_lease_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.mock_interview_attempts%rowtype;
begin
  if p_user_id is null
    or p_user_id = '00000000-0000-0000-0000-000000000000'::uuid
    or p_attempt_id is null
    or p_attempt_id = '00000000-0000-0000-0000-000000000000'::uuid
    or p_lease_token is null
    or p_lease_token = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'User, attempt, and lease UUIDs are required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  select *
  into v_attempt
  from public.mock_interview_attempts
  where id = p_attempt_id
    and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_attempt.status <> 'reserved' then
    return jsonb_build_object('status', v_attempt.status);
  end if;
  if v_attempt.lease_token is distinct from p_lease_token
    or v_attempt.lease_expires_at <= now() then
    return jsonb_build_object('status', 'lease_invalid');
  end if;

  update public.mock_interview_attempts
  set dispatched_at = coalesce(dispatched_at, now()),
      updated_at = now()
  where id = v_attempt.id
    and user_id = p_user_id
  returning * into v_attempt;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'status', 'dispatched',
    'dispatched_at', v_attempt.dispatched_at
  );
end;
$$;

-- A confirmed safe failure should remove the reservation. Expiring it is no
-- longer sufficient because every unexplained expiry is terminal in protocol 2.
create or replace function public.release_mock_interview_attempt(
  p_user_id uuid,
  p_attempt_id uuid,
  p_lease_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.mock_interview_attempts%rowtype;
begin
  if p_user_id is null
    or p_user_id = '00000000-0000-0000-0000-000000000000'::uuid
    or p_attempt_id is null
    or p_attempt_id = '00000000-0000-0000-0000-000000000000'::uuid
    or p_lease_token is null
    or p_lease_token = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'User, attempt, and lease UUIDs are required';
  end if;

  select *
  into v_attempt
  from public.mock_interview_attempts
  where id = p_attempt_id
    and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_attempt.status <> 'reserved' then
    return jsonb_build_object(
      'attempt_id', v_attempt.id,
      'status', v_attempt.status
    );
  end if;
  if v_attempt.lease_token is distinct from p_lease_token then
    return jsonb_build_object(
      'attempt_id', v_attempt.id,
      'status', 'lease_invalid'
    );
  end if;

  delete from public.mock_interview_attempts
  where id = v_attempt.id
    and user_id = p_user_id;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'status', 'released'
  );
end;
$$;

create or replace function public.abort_mock_interview_attempt(
  p_user_id uuid,
  p_attempt_id uuid,
  p_lease_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.mock_interview_attempts%rowtype;
begin
  if p_user_id is null
    or p_user_id = '00000000-0000-0000-0000-000000000000'::uuid
    or p_attempt_id is null
    or p_attempt_id = '00000000-0000-0000-0000-000000000000'::uuid
    or p_lease_token is null
    or p_lease_token = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'User, attempt, and lease UUIDs are required';
  end if;

  select *
  into v_attempt
  from public.mock_interview_attempts
  where id = p_attempt_id
    and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_attempt.status <> 'reserved' then
    return jsonb_build_object(
      'attempt_id', v_attempt.id,
      'status', v_attempt.status
    );
  end if;
  if v_attempt.lease_token is distinct from p_lease_token then
    return jsonb_build_object(
      'attempt_id', v_attempt.id,
      'status', 'lease_invalid'
    );
  end if;
  if v_attempt.dispatched_at is not null then
    return jsonb_build_object(
      'attempt_id', v_attempt.id,
      'status', 'dispatch_confirmed'
    );
  end if;

  delete from public.mock_interview_attempts
  where id = v_attempt.id
    and user_id = p_user_id;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'status', 'aborted'
  );
end;
$$;

create or replace function public.delete_mock_interview_attempt(
  p_user_id uuid,
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted_id uuid;
begin
  if p_user_id is null
    or p_user_id = '00000000-0000-0000-0000-000000000000'::uuid
    or p_attempt_id is null
    or p_attempt_id = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'User and attempt UUIDs are required';
  end if;

  delete from public.mock_interview_attempts
  where id = p_attempt_id
    and user_id = p_user_id
    and (
      status = 'completed'
      or (
        status = 'failed'
        and failure @> '{"retryable": true}'::jsonb
      )
      or (
        status = 'reserved'
        and lease_expires_at <= now()
        and dispatched_at is null
      )
    )
  returning id into v_deleted_id;

  return jsonb_build_object('deleted', v_deleted_id is not null);
end;
$$;

revoke all on function public.mock_interview_retry_protocol_version()
  from public, anon, authenticated, service_role;
revoke all on function public.reserve_mock_interview_attempt(
  uuid, uuid, uuid, text, text, integer, text, integer, text, integer, text,
  integer, jsonb, integer
) from public, anon, authenticated, service_role;
revoke all on function public.mark_mock_interview_attempt_dispatched(
  uuid, uuid, uuid
) from public, anon, authenticated, service_role;
revoke all on function public.release_mock_interview_attempt(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.mock_interview_retry_protocol_version()
  to service_role;
grant execute on function public.reserve_mock_interview_attempt(
  uuid, uuid, uuid, text, text, integer, text, integer, text, integer, text,
  integer, jsonb, integer
) to service_role;
grant execute on function public.mark_mock_interview_attempt_dispatched(
  uuid, uuid, uuid
) to service_role;
grant execute on function public.release_mock_interview_attempt(
  uuid, uuid, uuid
) to service_role;

comment on function public.reserve_mock_interview_attempt(
  uuid, uuid, uuid, text, text, integer, text, integer, text, integer, text,
  integer, jsonb, integer
) is
  'Reserves a mock report once and terminalizes any unexplained expired lease before paid work can run again.';
