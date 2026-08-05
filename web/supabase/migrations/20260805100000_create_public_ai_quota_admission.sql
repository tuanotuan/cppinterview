-- Public AI coach access is admitted by the server with a dedicated secret key.
-- Never store a raw IP address, device token, account UUID, prompt, or answer here.

create table if not exists public.public_ai_quota_windows (
  subject_kind text not null check (subject_kind in ('ip', 'device', 'account')),
  subject_hash text not null check (subject_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  window_ends_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (subject_kind, subject_hash),
  check (window_ends_at = window_started_at + interval '24 hours')
);

create table if not exists public.public_ai_quota_reservations (
  id uuid primary key default extensions.gen_random_uuid(),
  principal_hash text not null check (principal_hash ~ '^[a-f0-9]{64}$'),
  ip_hash text not null check (ip_hash ~ '^[a-f0-9]{64}$'),
  device_hash text not null check (device_hash ~ '^[a-f0-9]{64}$'),
  account_hash text check (account_hash ~ '^[a-f0-9]{64}$'),
  idempotency_key uuid not null,
  request_fingerprint text not null
    check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  request_kind text not null
    check (request_kind in ('coach_evaluation', 'coach_follow_up')),
  status text not null default 'reserved'
    check (status in (
      'reserved',
      'dispatched',
      'completed',
      'released',
      'outcome_unknown'
    )),
  lease_token uuid,
  lease_expires_at timestamptz,
  dispatched_at timestamptz,
  completed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    principal_hash = device_hash
    or (account_hash is not null and principal_hash = account_hash)
  ),
  check (
    (status = 'reserved'
      and lease_token is not null
      and lease_expires_at is not null
      and dispatched_at is null
      and completed_at is null
      and released_at is null)
    or (status = 'dispatched'
      and lease_token is null
      and lease_expires_at is null
      and dispatched_at is not null
      and completed_at is null
      and released_at is null)
    or (status = 'completed'
      and lease_token is null
      and lease_expires_at is null
      and dispatched_at is not null
      and completed_at is not null
      and released_at is null)
    or (status = 'outcome_unknown'
      and lease_token is null
      and lease_expires_at is null
      and dispatched_at is not null
      and completed_at is not null
      and released_at is null)
    or (status = 'released'
      and lease_token is null
      and lease_expires_at is null
      and dispatched_at is null
      and completed_at is null
      and released_at is not null)
  )
);

create unique index if not exists public_ai_quota_active_idempotency_idx
  on public.public_ai_quota_reservations (principal_hash, idempotency_key)
  where status <> 'released';

create unique index if not exists public_ai_quota_active_fingerprint_idx
  on public.public_ai_quota_reservations (principal_hash, request_fingerprint)
  where status <> 'released';

create index if not exists public_ai_quota_ip_created_idx
  on public.public_ai_quota_reservations (ip_hash, created_at desc);

create index if not exists public_ai_quota_device_created_idx
  on public.public_ai_quota_reservations (device_hash, created_at desc);

create index if not exists public_ai_quota_account_created_idx
  on public.public_ai_quota_reservations (account_hash, created_at desc)
  where account_hash is not null;

alter table public.public_ai_quota_windows enable row level security;
alter table public.public_ai_quota_reservations enable row level security;

revoke all on table public.public_ai_quota_windows
  from public, anon, authenticated;
revoke all on table public.public_ai_quota_reservations
  from public, anon, authenticated;

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
    or p_idempotency_key = '00000000-0000-0000-0000-000000000000'::uuid
    or p_request_fingerprint is null
    or p_request_fingerprint !~ '^[a-f0-9]{64}$'
    or p_request_kind not in ('coach_evaluation', 'coach_follow_up')
    or p_lease_seconds not between 120 and 900
  then
    raise exception 'Invalid public AI quota reservation';
  end if;

  -- A deterministic lock order keeps a request that shares an IP, device, or
  -- account with another request from admitting more than three turns.
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
        'public-ai-quota:' || v_subject.subject_kind || ':' || v_subject.subject_hash,
        0
      )
    );
  end loop;

  -- An undispatched lease cannot have reached OpenAI. It is safe to release it
  -- before accepting a retry with the same request identity.
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
      return jsonb_build_object(
        'status', 'idempotency_conflict',
        'reservation_id', v_existing.id,
        'is_new', false
      );
    end if;

    return jsonb_build_object(
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
    return jsonb_build_object(
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

    select count(*)::integer
    into v_used
    from public.public_ai_quota_reservations
    where created_at >= v_bucket.window_started_at
      and created_at < v_bucket.window_ends_at
      and (
        (v_subject.subject_kind = 'ip' and ip_hash = v_subject.subject_hash)
        or (v_subject.subject_kind = 'device' and device_hash = v_subject.subject_hash)
        or (v_subject.subject_kind = 'account' and account_hash = v_subject.subject_hash)
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
    return jsonb_build_object(
      'status', 'quota_exceeded',
      'reservation_id', null,
      'is_new', false,
      'limit', v_limit,
      'remaining', greatest(0, v_limit - v_device_used),
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
    v_now + make_interval(secs => p_lease_seconds)
  )
  returning * into v_reservation;

  return jsonb_build_object(
    'status', v_reservation.status,
    'reservation_id', v_reservation.id,
    'lease_token', v_reservation.lease_token,
    'lease_expires_at', v_reservation.lease_expires_at,
    'is_new', true,
    'limit', v_limit,
    'remaining', greatest(0, v_limit - v_device_used - 1),
    'resets_at', v_device_window_ends_at
  );
end;
$$;

create or replace function public.mark_public_ai_quota_dispatched(
  p_reservation_id uuid,
  p_lease_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.public_ai_quota_reservations%rowtype;
begin
  if p_reservation_id is null or p_lease_token is null then
    raise exception 'A public AI quota reservation and lease token are required';
  end if;

  select *
  into v_reservation
  from public.public_ai_quota_reservations
  where id = p_reservation_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_reservation.status = 'dispatched'
    or v_reservation.status = 'completed'
    or v_reservation.status = 'outcome_unknown'
  then
    return jsonb_build_object('status', v_reservation.status);
  end if;
  if v_reservation.status <> 'reserved'
    or v_reservation.lease_token is distinct from p_lease_token
    or v_reservation.lease_expires_at <= now()
  then
    return jsonb_build_object('status', 'lease_invalid');
  end if;

  update public.public_ai_quota_reservations
  set status = 'dispatched',
      lease_token = null,
      lease_expires_at = null,
      dispatched_at = now(),
      updated_at = now()
  where id = v_reservation.id
  returning * into v_reservation;

  return jsonb_build_object('status', v_reservation.status);
end;
$$;

create or replace function public.complete_public_ai_quota(
  p_reservation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.public_ai_quota_reservations%rowtype;
begin
  if p_reservation_id is null then
    raise exception 'A public AI quota reservation is required';
  end if;

  select *
  into v_reservation
  from public.public_ai_quota_reservations
  where id = p_reservation_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_reservation.status = 'completed'
    or v_reservation.status = 'outcome_unknown'
  then
    return jsonb_build_object('status', v_reservation.status);
  end if;
  if v_reservation.status <> 'dispatched' then
    return jsonb_build_object('status', 'transition_invalid');
  end if;

  update public.public_ai_quota_reservations
  set status = 'completed',
      completed_at = now(),
      updated_at = now()
  where id = v_reservation.id
  returning * into v_reservation;

  return jsonb_build_object('status', v_reservation.status);
end;
$$;

create or replace function public.mark_public_ai_quota_outcome_unknown(
  p_reservation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.public_ai_quota_reservations%rowtype;
begin
  if p_reservation_id is null then
    raise exception 'A public AI quota reservation is required';
  end if;

  select *
  into v_reservation
  from public.public_ai_quota_reservations
  where id = p_reservation_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_reservation.status = 'outcome_unknown'
    or v_reservation.status = 'completed'
  then
    return jsonb_build_object('status', v_reservation.status);
  end if;
  if v_reservation.status <> 'dispatched' then
    return jsonb_build_object('status', 'transition_invalid');
  end if;

  update public.public_ai_quota_reservations
  set status = 'outcome_unknown',
      completed_at = now(),
      updated_at = now()
  where id = v_reservation.id
  returning * into v_reservation;

  return jsonb_build_object('status', v_reservation.status);
end;
$$;

create or replace function public.release_public_ai_quota(
  p_reservation_id uuid,
  p_lease_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.public_ai_quota_reservations%rowtype;
begin
  if p_reservation_id is null or p_lease_token is null then
    raise exception 'A public AI quota reservation and lease token are required';
  end if;

  select *
  into v_reservation
  from public.public_ai_quota_reservations
  where id = p_reservation_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_reservation.status = 'released' then
    return jsonb_build_object('status', 'released');
  end if;
  if v_reservation.status <> 'reserved'
    or v_reservation.lease_token is distinct from p_lease_token
  then
    return jsonb_build_object('status', 'transition_invalid');
  end if;

  update public.public_ai_quota_reservations
  set status = 'released',
      lease_token = null,
      lease_expires_at = null,
      released_at = now(),
      updated_at = now()
  where id = v_reservation.id
  returning * into v_reservation;

  return jsonb_build_object('status', v_reservation.status);
end;
$$;

create or replace function public.purge_public_ai_quota_history(
  p_retention_days integer default 14
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  if p_retention_days not between 7 and 90 then
    raise exception 'Public AI quota retention must be between 7 and 90 days';
  end if;

  delete from public.public_ai_quota_reservations
  where created_at < now() - make_interval(days => p_retention_days)
    and status in ('completed', 'released', 'outcome_unknown');
  get diagnostics v_deleted = row_count;

  delete from public.public_ai_quota_windows
  where window_ends_at < now() - make_interval(days => p_retention_days)
    and not exists (
      select 1
      from public.public_ai_quota_reservations as reservation
      where reservation.ip_hash = public_ai_quota_windows.subject_hash
        or reservation.device_hash = public_ai_quota_windows.subject_hash
        or reservation.account_hash = public_ai_quota_windows.subject_hash
    );

  return v_deleted;
end;
$$;

revoke all on function public.reserve_public_ai_quota(
  text, text, text, text, uuid, text, text, integer
) from public, anon, authenticated;
revoke all on function public.mark_public_ai_quota_dispatched(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.complete_public_ai_quota(uuid)
  from public, anon, authenticated;
revoke all on function public.mark_public_ai_quota_outcome_unknown(uuid)
  from public, anon, authenticated;
revoke all on function public.release_public_ai_quota(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.purge_public_ai_quota_history(integer)
  from public, anon, authenticated;

grant execute on function public.reserve_public_ai_quota(
  text, text, text, text, uuid, text, text, integer
) to service_role;
grant execute on function public.mark_public_ai_quota_dispatched(uuid, uuid)
  to service_role;
grant execute on function public.complete_public_ai_quota(uuid)
  to service_role;
grant execute on function public.mark_public_ai_quota_outcome_unknown(uuid)
  to service_role;
grant execute on function public.release_public_ai_quota(uuid, uuid)
  to service_role;
grant execute on function public.purge_public_ai_quota_history(integer)
  to service_role;

comment on table public.public_ai_quota_windows is
  'Server-only rolling 24-hour windows for hashed public AI identities.';
comment on table public.public_ai_quota_reservations is
  'Server-only public AI admission ledger. Hashes only; never raw IPs, device tokens, prompts, or answers.';
