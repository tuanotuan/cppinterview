-- Report the effective public AI quota across every applicable identity without
-- reserving a turn. Keep the deployed v1 admission RPC available so the web app
-- can roll forward and back independently of this migration.

create or replace function public.get_public_ai_quota_status(
  p_ip_hash text,
  p_device_hash text,
  p_account_hash text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_limit constant integer := 3;
  v_subject record;
  v_window_started_at timestamptz;
  v_window_ends_at timestamptz;
  v_used integer;
  v_effective_used integer := 0;
  v_resets_at timestamptz;
  v_now timestamptz := now();
begin
  if p_ip_hash is null
    or p_ip_hash !~ '^[a-f0-9]{64}$'
    or (p_device_hash is not null and p_device_hash !~ '^[a-f0-9]{64}$')
    or (p_account_hash is not null and p_account_hash !~ '^[a-f0-9]{64}$')
  then
    raise exception 'Invalid public AI quota status identity';
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
    select quota_window.window_started_at, quota_window.window_ends_at
    into v_window_started_at, v_window_ends_at
    from public.public_ai_quota_windows as quota_window
    where quota_window.subject_kind = v_subject.subject_kind
      and quota_window.subject_hash = v_subject.subject_hash
      and quota_window.window_ends_at > v_now;

    if not found then
      v_used := 0;
      v_window_started_at := null;
      v_window_ends_at := null;
    else
      select count(*)::integer
      into v_used
      from public.public_ai_quota_reservations as reservation
      where reservation.created_at >= v_window_started_at
        and reservation.created_at < v_window_ends_at
        and (
          (v_subject.subject_kind = 'ip'
            and reservation.ip_hash = v_subject.subject_hash)
          or (v_subject.subject_kind = 'device'
            and reservation.device_hash = v_subject.subject_hash)
          or (v_subject.subject_kind = 'account'
            and reservation.account_hash = v_subject.subject_hash)
        )
        and (
          reservation.status in ('dispatched', 'completed', 'outcome_unknown')
          or (reservation.status = 'reserved'
            and reservation.lease_expires_at > v_now)
        );
    end if;

    if v_used > v_effective_used then
      v_effective_used := v_used;
      v_resets_at := v_window_ends_at;
    elsif v_used = v_effective_used
      and v_used > 0
      and (v_resets_at is null or v_window_ends_at > v_resets_at)
    then
      -- Every equally restrictive subject must reset before effective capacity
      -- increases, so report the latest tied reset.
      v_resets_at := v_window_ends_at;
    end if;
  end loop;

  return jsonb_build_object(
    'status', case
      when v_effective_used >= v_limit then 'quota_exceeded'
      else 'available'
    end,
    'limit', v_limit,
    'remaining', greatest(0, v_limit - v_effective_used),
    'resets_at', v_resets_at
  );
end;
$$;

create or replace function public.reserve_public_ai_quota_v2(
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
  v_result jsonb;
  v_status jsonb;
begin
  v_result := public.reserve_public_ai_quota(
    p_principal_hash,
    p_ip_hash,
    p_device_hash,
    p_account_hash,
    p_idempotency_key,
    p_request_fingerprint,
    p_request_kind,
    p_lease_seconds
  );

  -- The v1 call and this snapshot share one transaction. Its advisory locks
  -- remain held, and the volatile status function sees the row v1 just wrote.
  v_status := public.get_public_ai_quota_status(
    p_ip_hash,
    p_device_hash,
    p_account_hash
  );

  return v_result || (v_status - 'status');
end;
$$;

revoke all on function public.get_public_ai_quota_status(text, text, text)
  from public, anon, authenticated;
revoke all on function public.reserve_public_ai_quota_v2(
  text, text, text, text, uuid, text, text, integer
) from public, anon, authenticated;

grant execute on function public.get_public_ai_quota_status(text, text, text)
  to service_role;
grant execute on function public.reserve_public_ai_quota_v2(
  text, text, text, text, uuid, text, text, integer
) to service_role;

comment on function public.get_public_ai_quota_status(text, text, text) is
  'Server-only read of effective public AI turns across hashed IP, device, and optional account identities.';
comment on function public.reserve_public_ai_quota_v2(
  text, text, text, text, uuid, text, text, integer
) is
  'Backward-compatible public AI admission wrapper with effective multi-identity quota counters.';

notify pgrst, 'reload schema';
