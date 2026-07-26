create or replace function public.mock_history_has_forbidden_fields(
  p_value jsonb
)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_key text;
  v_child jsonb;
  v_normalized_key text;
begin
  if jsonb_typeof(p_value) = 'object' then
    for v_key, v_child in
      select key, value
      from pg_catalog.jsonb_each(p_value)
    loop
      v_normalized_key := pg_catalog.regexp_replace(
        pg_catalog.lower(v_key),
        '[^a-z0-9]',
        '',
        'g'
      );
      if v_normalized_key in (
        'canonicalanswer',
        'canonicalresponse',
        'modelanswer',
        'rubric',
        'rubriccriteria',
        'evaluationguide',
        'evaluationcriteria',
        'requiredcriteria',
        'bonuscriteria',
        'knownmisconceptions',
        'hiddentest',
        'hiddentests',
        'hiddeninput',
        'hiddeninputs',
        'hiddenoutput',
        'hiddenoutputs',
        'hiddendiagnostic',
        'hiddendiagnostics',
        'hiddenexecution',
        'diagnostics',
        'output',
        'cases',
        'candidateanswer',
        'candidateanswers'
      ) then
        return true;
      end if;
      if public.mock_history_has_forbidden_fields(v_child) then
        return true;
      end if;
    end loop;
  elsif jsonb_typeof(p_value) = 'array' then
    for v_child in
      select value
      from pg_catalog.jsonb_array_elements(p_value)
    loop
      if public.mock_history_has_forbidden_fields(v_child) then
        return true;
      end if;
    end loop;
  end if;

  return false;
end;
$$;

revoke all on function public.mock_history_has_forbidden_fields(jsonb)
  from public, anon, authenticated;
grant execute on function public.mock_history_has_forbidden_fields(jsonb)
  to service_role;

create table if not exists public.mock_interview_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  idempotency_key uuid not null,
  request_fingerprint text not null
    check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  profile_id text not null
    check (
      char_length(profile_id) between 1 and 120
      and profile_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ),
  profile_version integer not null check (profile_version > 0),
  role_profile_id text not null
    check (
      char_length(role_profile_id) between 1 and 120
      and role_profile_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ),
  role_profile_version integer not null check (role_profile_version > 0),
  blueprint_id text not null
    check (
      char_length(blueprint_id) between 1 and 120
      and blueprint_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ),
  blueprint_version integer not null check (blueprint_version > 0),
  blueprint_fingerprint text not null
    check (blueprint_fingerprint ~ '^[a-f0-9]{64}$'),
  duration_minutes integer not null
    check (duration_minutes in (30, 45, 60)),
  public_attempt jsonb not null
    check (
      jsonb_typeof(public_attempt) = 'object'
      and octet_length(public_attempt::text) <= 524288
      and not public.mock_history_has_forbidden_fields(public_attempt)
    ),
  status text not null default 'reserved'
    check (status in ('reserved', 'completed', 'failed')),
  report jsonb,
  failure jsonb,
  lease_token uuid,
  lease_expires_at timestamptz,
  lease_attempt integer not null default 1 check (lease_attempt > 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, session_id),
  unique (user_id, idempotency_key),
  check (
    report is null
    or (
      jsonb_typeof(report) = 'object'
      and octet_length(report::text) <= 262144
      and not public.mock_history_has_forbidden_fields(report)
    )
  ),
  check (
    failure is null
    or (
      jsonb_typeof(failure) = 'object'
      and octet_length(failure::text) <= 16384
      and not public.mock_history_has_forbidden_fields(failure)
    )
  ),
  check (
    (
      status = 'reserved'
      and report is null
      and failure is null
      and lease_token is not null
      and lease_expires_at is not null
      and completed_at is null
    )
    or (
      status = 'completed'
      and report is not null
      and failure is null
      and lease_token is null
      and lease_expires_at is null
      and completed_at is not null
    )
    or (
      status = 'failed'
      and report is null
      and failure is not null
      and lease_token is null
      and lease_expires_at is null
      and completed_at is not null
    )
  )
);

create index if not exists mock_interview_attempts_user_created_idx
  on public.mock_interview_attempts (user_id, created_at desc, id desc);

create index if not exists mock_interview_attempts_user_role_completed_idx
  on public.mock_interview_attempts (
    user_id,
    role_profile_id,
    role_profile_version,
    created_at desc,
    id desc
  )
  where status = 'completed';

create index if not exists mock_interview_attempts_expired_lease_idx
  on public.mock_interview_attempts (lease_expires_at)
  where status = 'reserved';

alter table public.mock_interview_attempts enable row level security;

revoke all on table public.mock_interview_attempts
  from public, anon, authenticated, service_role;
grant select, delete on table public.mock_interview_attempts
  to authenticated;

drop policy if exists "Users read their own mock interview attempts"
  on public.mock_interview_attempts;
create policy "Users read their own mock interview attempts"
  on public.mock_interview_attempts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own mock interview attempts"
  on public.mock_interview_attempts;
create policy "Users delete their own mock interview attempts"
  on public.mock_interview_attempts
  for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and (
      status in ('completed', 'failed')
      or (
        status = 'reserved'
        and lease_expires_at <= now()
      )
    )
  );

create or replace function public.protect_mock_interview_attempt()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status in ('completed', 'failed') then
    raise exception 'Completed mock interview attempts are immutable';
  end if;

  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.session_id is distinct from old.session_id
    or new.idempotency_key is distinct from old.idempotency_key
    or new.request_fingerprint is distinct from old.request_fingerprint
    or new.profile_id is distinct from old.profile_id
    or new.profile_version is distinct from old.profile_version
    or new.role_profile_id is distinct from old.role_profile_id
    or new.role_profile_version is distinct from old.role_profile_version
    or new.blueprint_id is distinct from old.blueprint_id
    or new.blueprint_version is distinct from old.blueprint_version
    or new.blueprint_fingerprint is distinct from old.blueprint_fingerprint
    or new.duration_minutes is distinct from old.duration_minutes
    or new.public_attempt is distinct from old.public_attempt
    or new.created_at is distinct from old.created_at then
    raise exception 'Mock interview attempt identity and evidence are immutable';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_mock_interview_attempt()
  from public, anon, authenticated;

drop trigger if exists protect_mock_interview_attempt_trigger
  on public.mock_interview_attempts;
create trigger protect_mock_interview_attempt_trigger
before update on public.mock_interview_attempts
for each row execute function public.protect_mock_interview_attempt();

create or replace function public.mock_interview_attempt_public_json(
  p_attempt public.mock_interview_attempts
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'attempt_id', p_attempt.id,
    'session_id', p_attempt.session_id,
    'idempotency_key', p_attempt.idempotency_key,
    'request_fingerprint', p_attempt.request_fingerprint,
    'profile_id', p_attempt.profile_id,
    'profile_version', p_attempt.profile_version,
    'role_profile_id', p_attempt.role_profile_id,
    'role_profile_version', p_attempt.role_profile_version,
    'blueprint_id', p_attempt.blueprint_id,
    'blueprint_version', p_attempt.blueprint_version,
    'blueprint_fingerprint', p_attempt.blueprint_fingerprint,
    'duration_minutes', p_attempt.duration_minutes,
    'public_attempt', p_attempt.public_attempt,
    'status', p_attempt.status,
    'report', p_attempt.report,
    'failure', p_attempt.failure,
    'lease_expires_at', p_attempt.lease_expires_at,
    'lease_attempt', p_attempt.lease_attempt,
    'created_at', p_attempt.created_at,
    'updated_at', p_attempt.updated_at,
    'completed_at', p_attempt.completed_at
  );
$$;

revoke all on function public.mock_interview_attempt_public_json(
  public.mock_interview_attempts
) from public, anon, authenticated;
grant execute on function public.mock_interview_attempt_public_json(
  public.mock_interview_attempts
) to service_role;

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
  v_session_attempt public.mock_interview_attempts%rowtype;
  v_created public.mock_interview_attempts%rowtype;
  v_lease_token uuid;
begin
  if p_user_id is null
    or p_user_id = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'A user UUID is required';
  end if;
  if p_session_id is null
    or p_session_id = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'A non-zero session UUID is required';
  end if;
  if p_idempotency_key is null
    or p_idempotency_key = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'A non-zero idempotency UUID is required';
  end if;
  if p_request_fingerprint is null
    or p_request_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'A SHA-256 request fingerprint is required';
  end if;
  if p_profile_id is null
    or char_length(p_profile_id) not between 1 and 120
    or p_profile_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'A valid profile ID is required';
  end if;
  if p_role_profile_id is null
    or char_length(p_role_profile_id) not between 1 and 120
    or p_role_profile_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'A valid role profile ID is required';
  end if;
  if p_blueprint_id is null
    or char_length(p_blueprint_id) not between 1 and 120
    or p_blueprint_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'A valid blueprint ID is required';
  end if;
  if p_profile_version is null or p_profile_version <= 0
    or p_role_profile_version is null or p_role_profile_version <= 0
    or p_blueprint_version is null or p_blueprint_version <= 0 then
    raise exception 'Positive profile and blueprint versions are required';
  end if;
  if p_blueprint_fingerprint is null
    or p_blueprint_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'A SHA-256 blueprint fingerprint is required';
  end if;
  if p_duration_minutes is null
    or p_duration_minutes not in (30, 45, 60) then
    raise exception 'Mock interview duration must be 30, 45, or 60 minutes';
  end if;
  if p_public_attempt is null
    or jsonb_typeof(p_public_attempt) <> 'object'
    or octet_length(p_public_attempt::text) > 524288
    or public.mock_history_has_forbidden_fields(p_public_attempt) then
    raise exception 'Public mock attempt is invalid or contains private evaluation data';
  end if;
  if p_lease_seconds is null
    or p_lease_seconds not between 120 and 3600 then
    raise exception 'Mock history lease must be between 120 and 3600 seconds';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  delete from public.mock_interview_attempts
  where user_id = p_user_id
    and status = 'reserved'
    and lease_expires_at < now() - interval '7 days';

  select *
  into v_existing
  from public.mock_interview_attempts
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key
  for update;

  if found then
    if v_existing.session_id is distinct from p_session_id
      or v_existing.request_fingerprint is distinct from p_request_fingerprint
      or v_existing.profile_id is distinct from p_profile_id
      or v_existing.profile_version is distinct from p_profile_version
      or v_existing.role_profile_id is distinct from p_role_profile_id
      or v_existing.role_profile_version is distinct from p_role_profile_version
      or v_existing.blueprint_id is distinct from p_blueprint_id
      or v_existing.blueprint_version is distinct from p_blueprint_version
      or v_existing.blueprint_fingerprint is distinct from p_blueprint_fingerprint
      or v_existing.duration_minutes is distinct from p_duration_minutes
      or v_existing.public_attempt is distinct from p_public_attempt then
      return jsonb_build_object(
        'attempt_id', v_existing.id,
        'status', 'idempotency_conflict',
        'is_new', false,
        'lease_renewed', false
      );
    end if;

    if v_existing.status = 'reserved'
      and v_existing.lease_expires_at <= now() then
      v_lease_token := extensions.gen_random_uuid();
      update public.mock_interview_attempts
      set lease_token = v_lease_token,
          lease_expires_at = now() + make_interval(secs => p_lease_seconds),
          lease_attempt = lease_attempt + 1,
          updated_at = now()
      where id = v_existing.id
        and user_id = p_user_id
      returning * into v_existing;

      return public.mock_interview_attempt_public_json(v_existing)
        || jsonb_build_object(
          'is_new', false,
          'lease_renewed', true,
          'lease_token', v_existing.lease_token
      );
    end if;

    if v_existing.status = 'reserved' then
      return jsonb_build_object(
        'attempt_id', v_existing.id,
        'status', 'busy',
        'is_new', false,
        'lease_renewed', false,
        'lease_expires_at', v_existing.lease_expires_at
      );
    end if;

    return public.mock_interview_attempt_public_json(v_existing)
      || jsonb_build_object(
        'is_new', false,
        'lease_renewed', false,
        'lease_token', null
      );
  end if;

  select *
  into v_session_attempt
  from public.mock_interview_attempts
  where user_id = p_user_id
    and session_id = p_session_id;

  if found then
    return jsonb_build_object(
      'attempt_id', v_session_attempt.id,
      'status', 'session_conflict',
      'is_new', false,
      'lease_renewed', false
    );
  end if;

  v_lease_token := extensions.gen_random_uuid();
  insert into public.mock_interview_attempts (
    user_id,
    session_id,
    idempotency_key,
    request_fingerprint,
    profile_id,
    profile_version,
    role_profile_id,
    role_profile_version,
    blueprint_id,
    blueprint_version,
    blueprint_fingerprint,
    duration_minutes,
    public_attempt,
    lease_token,
    lease_expires_at
  )
  values (
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
    v_lease_token,
    now() + make_interval(secs => p_lease_seconds)
  )
  returning * into v_created;

  return public.mock_interview_attempt_public_json(v_created)
    || jsonb_build_object(
      'is_new', true,
      'lease_renewed', false,
      'lease_token', v_created.lease_token
    );
end;
$$;

create or replace function public.complete_mock_interview_attempt(
  p_user_id uuid,
  p_attempt_id uuid,
  p_lease_token uuid,
  p_report jsonb
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
  if p_report is null
    or jsonb_typeof(p_report) <> 'object'
    or octet_length(p_report::text) > 262144
    or public.mock_history_has_forbidden_fields(p_report) then
    raise exception 'Mock report is invalid or contains private evaluation data';
  end if;

  select *
  into v_attempt
  from public.mock_interview_attempts
  where id = p_attempt_id
    and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found', 'is_new', false);
  end if;

  if v_attempt.status <> 'reserved' then
    return public.mock_interview_attempt_public_json(v_attempt)
      || jsonb_build_object('is_new', false, 'lease_renewed', false);
  end if;

  if v_attempt.lease_token is distinct from p_lease_token
    or v_attempt.lease_expires_at <= now() then
    return jsonb_build_object(
      'attempt_id', v_attempt.id,
      'status', 'lease_invalid',
      'is_new', false
    );
  end if;

  update public.mock_interview_attempts
  set status = 'completed',
      report = p_report,
      lease_token = null,
      lease_expires_at = null,
      completed_at = now(),
      updated_at = now()
  where id = v_attempt.id
    and user_id = p_user_id
  returning * into v_attempt;

  return public.mock_interview_attempt_public_json(v_attempt)
    || jsonb_build_object('is_new', true, 'lease_renewed', false);
end;
$$;

create or replace function public.fail_mock_interview_attempt(
  p_user_id uuid,
  p_attempt_id uuid,
  p_lease_token uuid,
  p_failure jsonb
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
  if p_failure is null
    or jsonb_typeof(p_failure) <> 'object'
    or not (p_failure ? 'code')
    or not (p_failure ? 'retryable')
    or p_failure - array['code', 'retryable']::text[] <> '{}'::jsonb
    or jsonb_typeof(p_failure -> 'code') is distinct from 'string'
    or char_length(p_failure ->> 'code') not between 1 and 80
    or (p_failure ->> 'code') !~ '^[a-z0-9]+(_[a-z0-9]+)*$'
    or jsonb_typeof(p_failure -> 'retryable') is distinct from 'boolean' then
    raise exception 'Mock failure must contain only a safe code and retryable flag';
  end if;

  select *
  into v_attempt
  from public.mock_interview_attempts
  where id = p_attempt_id
    and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found', 'is_new', false);
  end if;

  if v_attempt.status <> 'reserved' then
    return public.mock_interview_attempt_public_json(v_attempt)
      || jsonb_build_object('is_new', false, 'lease_renewed', false);
  end if;

  if v_attempt.lease_token is distinct from p_lease_token
    or v_attempt.lease_expires_at <= now() then
    return jsonb_build_object(
      'attempt_id', v_attempt.id,
      'status', 'lease_invalid',
      'is_new', false
    );
  end if;

  update public.mock_interview_attempts
  set status = 'failed',
      failure = p_failure,
      lease_token = null,
      lease_expires_at = null,
      completed_at = now(),
      updated_at = now()
  where id = v_attempt.id
    and user_id = p_user_id
  returning * into v_attempt;

  return public.mock_interview_attempt_public_json(v_attempt)
    || jsonb_build_object('is_new', true, 'lease_renewed', false);
end;
$$;

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

  update public.mock_interview_attempts
  set lease_expires_at = now(),
      updated_at = now()
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

  delete from public.mock_interview_attempts
  where id = v_attempt.id
    and user_id = p_user_id;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'status', 'aborted'
  );
end;
$$;

create or replace function public.read_mock_interview_attempt(
  p_user_id uuid,
  p_attempt_id uuid
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
    or p_attempt_id = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'User and attempt UUIDs are required';
  end if;

  select *
  into v_attempt
  from public.mock_interview_attempts
  where id = p_attempt_id
    and user_id = p_user_id;

  if not found then
    return null;
  end if;
  return public.mock_interview_attempt_public_json(v_attempt);
end;
$$;

create or replace function public.list_mock_interview_attempts(
  p_user_id uuid,
  p_limit integer default 20,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_role_profile_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_items jsonb;
  v_has_more boolean;
begin
  if p_user_id is null
    or p_user_id = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'A user UUID is required';
  end if;
  if p_limit is null or p_limit not between 1 and 50 then
    raise exception 'Mock history page size must be between 1 and 50';
  end if;
  if (p_before_created_at is null) <> (p_before_id is null) then
    raise exception 'Both mock history cursor fields are required';
  end if;
  if p_role_profile_id is not null
    and (
      char_length(p_role_profile_id) not between 1 and 120
      or p_role_profile_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ) then
    raise exception 'Invalid role profile filter';
  end if;

  with ranked as (
    select
      public.mock_interview_attempt_public_json(attempt) as item,
      attempt.created_at,
      attempt.id,
      row_number() over (
        order by attempt.created_at desc, attempt.id desc
      ) as row_number
    from public.mock_interview_attempts as attempt
    where attempt.user_id = p_user_id
      and attempt.status = 'completed'
      and (
        p_role_profile_id is null
        or attempt.role_profile_id = p_role_profile_id
      )
      and (
        p_before_created_at is null
        or attempt.created_at < p_before_created_at
        or (
          attempt.created_at = p_before_created_at
          and attempt.id < p_before_id
        )
      )
    order by attempt.created_at desc, attempt.id desc
    limit (p_limit + 1)
  )
  select
    coalesce(
      jsonb_agg(item order by created_at desc, id desc)
        filter (where row_number <= p_limit),
      '[]'::jsonb
    ),
    coalesce(bool_or(row_number > p_limit), false)
  into v_items, v_has_more
  from ranked;

  return jsonb_build_object(
    'items', v_items,
    'has_more', v_has_more
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
      status in ('completed', 'failed')
      or (
        status = 'reserved'
        and lease_expires_at <= now()
      )
    )
  returning id into v_deleted_id;

  return jsonb_build_object('deleted', v_deleted_id is not null);
end;
$$;

revoke all on function public.reserve_mock_interview_attempt(
  uuid,
  uuid,
  uuid,
  text,
  text,
  integer,
  text,
  integer,
  text,
  integer,
  text,
  integer,
  jsonb,
  integer
) from public, anon, authenticated;
revoke all on function public.complete_mock_interview_attempt(
  uuid,
  uuid,
  uuid,
  jsonb
) from public, anon, authenticated;
revoke all on function public.fail_mock_interview_attempt(
  uuid,
  uuid,
  uuid,
  jsonb
) from public, anon, authenticated;
revoke all on function public.release_mock_interview_attempt(
  uuid,
  uuid,
  uuid
) from public, anon, authenticated;
revoke all on function public.abort_mock_interview_attempt(
  uuid,
  uuid,
  uuid
) from public, anon, authenticated;
revoke all on function public.read_mock_interview_attempt(
  uuid,
  uuid
) from public, anon, authenticated;
revoke all on function public.list_mock_interview_attempts(
  uuid,
  integer,
  timestamptz,
  uuid,
  text
) from public, anon, authenticated;
revoke all on function public.delete_mock_interview_attempt(
  uuid,
  uuid
) from public, anon, authenticated;

grant execute on function public.reserve_mock_interview_attempt(
  uuid,
  uuid,
  uuid,
  text,
  text,
  integer,
  text,
  integer,
  text,
  integer,
  text,
  integer,
  jsonb,
  integer
) to service_role;
grant execute on function public.complete_mock_interview_attempt(
  uuid,
  uuid,
  uuid,
  jsonb
) to service_role;
grant execute on function public.fail_mock_interview_attempt(
  uuid,
  uuid,
  uuid,
  jsonb
) to service_role;
grant execute on function public.release_mock_interview_attempt(
  uuid,
  uuid,
  uuid
) to service_role;
grant execute on function public.abort_mock_interview_attempt(
  uuid,
  uuid,
  uuid
) to service_role;
grant execute on function public.read_mock_interview_attempt(
  uuid,
  uuid
) to service_role;
grant execute on function public.list_mock_interview_attempts(
  uuid,
  integer,
  timestamptz,
  uuid,
  text
) to service_role;
grant execute on function public.delete_mock_interview_attempt(
  uuid,
  uuid
) to service_role;

comment on table public.mock_interview_attempts is
  'Owner-scoped, immutable terminal Mock v4 history. Stores candidate-visible attempt evidence and normalized reports only; never evaluation rubrics or hidden runner internals.';
comment on function public.reserve_mock_interview_attempt(
  uuid,
  uuid,
  uuid,
  text,
  text,
  integer,
  text,
  integer,
  text,
  integer,
  text,
  integer,
  jsonb,
  integer
) is
  'Service-only idempotent reservation for one exact mock session and blueprint. Matching expired leases may be renewed; terminal results remain cached.';
comment on function public.release_mock_interview_attempt(
  uuid,
  uuid,
  uuid
) is
  'Service-only, token-scoped release that expires a retryable reservation without reopening terminal artifacts.';
comment on function public.abort_mock_interview_attempt(
  uuid,
  uuid,
  uuid
) is
  'Service-only, token-scoped abort that deletes only the current reserved attempt when a fresh downstream execution key is required.';
