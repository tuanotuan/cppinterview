-- Repair the lesson assistant dispatch marker installed by 20260829130024.
-- COALESCE is SQL syntax and cannot be schema-qualified as a catalog function.

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
    or v_reservation.lease_expires_at <= pg_catalog.now()
  then
    return pg_catalog.jsonb_build_object('status', 'lease_invalid');
  end if;

  update public.lesson_ai_reservations
  set dispatched_at = coalesce(dispatched_at, pg_catalog.now()),
      updated_at = pg_catalog.now()
  where user_id = v_user_id
    and idempotency_key = p_idempotency_key
  returning * into v_reservation;

  return pg_catalog.jsonb_build_object(
    'status', 'dispatched',
    'dispatched_at', v_reservation.dispatched_at
  );
end;
$$;

revoke all on function public.mark_lesson_ai_response_dispatched(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.mark_lesson_ai_response_dispatched(uuid, uuid)
  to authenticated;

notify pgrst, 'reload schema';
