-- GREATEST is PostgreSQL conditional syntax rather than a function in
-- pg_catalog. Schema-qualifying it makes both the quota-exceeded response and
-- successful reservation response fail with SQLSTATE 42883.

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
    'remaining', greatest(0, v_limit - v_device_used - 1),
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
