-- Keep terminal and uncertain post-provider outcomes from reopening a paid
-- generation attempt. This follows up the original queue migration so
-- databases that already applied it receive the hardened behavior.

alter table public.mistake_flashcard_candidates
  add column if not exists provider_dispatched_at timestamptz;

-- A lease that predates this protocol cannot prove that no provider call
-- happened, so preserve the conservative interpretation during rollout.
update public.mistake_flashcard_candidates
set provider_dispatched_at = coalesce(
      provider_dispatched_at,
      updated_at,
      created_at
    )
where status = 'generating';

create or replace function public.mistake_generation_retry_protocol_version()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 3
$$;

create or replace function public.claim_mistake_flashcard_candidate(
  p_candidate_id uuid,
  p_lease_seconds integer default 300
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_candidate public.mistake_flashcard_candidates%rowtype;
  v_token uuid := extensions.gen_random_uuid();
begin
  if v_user_id is null
    or p_candidate_id is null
    or p_lease_seconds not between 60 and 900 then
    raise exception 'Invalid mistake generation claim';
  end if;
  select *
  into v_candidate
  from public.mistake_flashcard_candidates
  where id = p_candidate_id
    and user_id = v_user_id
  for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_candidate.status in (
    'needs_grounding',
    'pending_review',
    'approved',
    'reinforce_existing',
    'dismissed',
    'dead_letter'
  ) then
    return jsonb_build_object(
      'id', v_candidate.id,
      'status', v_candidate.status,
      'materializedQuestionId', v_candidate.materialized_question_id
    );
  end if;
  if v_candidate.status = 'generating'
    and v_candidate.lease_expires_at > now() then
    return jsonb_build_object(
      'id', v_candidate.id,
      'status', 'busy',
      'leaseExpiresAt', v_candidate.lease_expires_at
    );
  end if;
  if v_candidate.status = 'generating' then
    if v_candidate.provider_dispatched_at is null then
      update public.mistake_flashcard_candidates
      set status = 'failed',
          lease_token = null,
          lease_expires_at = null,
          last_error = jsonb_build_object(
            'code',
            'generation_lease_expired_before_dispatch'
          )
      where id = v_candidate.id
      returning * into v_candidate;
    else
      update public.mistake_flashcard_candidates
      set status = 'dead_letter',
          lease_token = null,
          lease_expires_at = null,
          last_error = jsonb_build_object(
            'code',
            'generation_lease_expired_unconfirmed'
          )
      where id = v_candidate.id
      returning * into v_candidate;
      return jsonb_build_object(
        'id', v_candidate.id,
        'status', 'dead_letter',
        'materializedQuestionId', v_candidate.materialized_question_id
      );
    end if;
  end if;
  if v_candidate.attempt_count >= 5 then
    update public.mistake_flashcard_candidates
    set status = 'dead_letter',
        lease_token = null,
        lease_expires_at = null
    where id = v_candidate.id
    returning * into v_candidate;
    return jsonb_build_object('id', v_candidate.id, 'status', 'dead_letter');
  end if;

  update public.mistake_flashcard_candidates
  set status = 'generating',
      attempt_count = attempt_count + 1,
      lease_token = v_token,
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      provider_dispatched_at = null,
      last_error = null
  where id = v_candidate.id
  returning * into v_candidate;

  return jsonb_build_object(
    'id', v_candidate.id,
    'status', 'claimed',
    'leaseToken', v_token,
    'leaseExpiresAt', v_candidate.lease_expires_at
  );
end;
$$;

create or replace function public.mark_mistake_generation_dispatched(
  p_candidate_id uuid,
  p_lease_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_candidate public.mistake_flashcard_candidates%rowtype;
begin
  if v_user_id is null
    or p_candidate_id is null
    or p_lease_token is null then
    raise exception 'Invalid mistake generation dispatch';
  end if;

  select *
  into v_candidate
  from public.mistake_flashcard_candidates
  where id = p_candidate_id
    and user_id = v_user_id
  for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_candidate.status <> 'generating' then
    return jsonb_build_object(
      'id', v_candidate.id,
      'status', v_candidate.status
    );
  end if;
  if v_candidate.lease_token is distinct from p_lease_token
    or v_candidate.lease_expires_at <= now() then
    return jsonb_build_object(
      'id', v_candidate.id,
      'status', 'lease_invalid'
    );
  end if;

  update public.mistake_flashcard_candidates
  set provider_dispatched_at = coalesce(provider_dispatched_at, now()),
      updated_at = now()
  where id = v_candidate.id
  returning * into v_candidate;

  return jsonb_build_object(
    'id', v_candidate.id,
    'status', 'dispatched',
    'dispatchedAt', v_candidate.provider_dispatched_at
  );
end;
$$;

create or replace function public.enforce_mistake_generation_dispatch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'generating'
    and new.status = 'pending_review'
    and old.provider_dispatched_at is null then
    raise exception 'Mistake generation dispatch is required';
  end if;
  return new;
end;
$$;

drop trigger if exists mistake_generation_requires_dispatch
  on public.mistake_flashcard_candidates;
create trigger mistake_generation_requires_dispatch
before update on public.mistake_flashcard_candidates
for each row execute function public.enforce_mistake_generation_dispatch();

create or replace function public.terminate_mistake_flashcard_generation(
  p_candidate_id uuid,
  p_lease_token uuid,
  p_error_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_candidate public.mistake_flashcard_candidates%rowtype;
begin
  if v_user_id is null
    or p_candidate_id is null
    or p_lease_token is null
    or p_error_code not in (
      'provider_outcome_unknown',
      'completion_outcome_unknown',
      'completion_rejected'
    ) then
    raise exception 'Invalid mistake generation termination';
  end if;

  select *
  into v_candidate
  from public.mistake_flashcard_candidates
  where id = p_candidate_id
    and user_id = v_user_id
  for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_candidate.status <> 'generating' then
    return jsonb_build_object(
      'id', v_candidate.id,
      'status', v_candidate.status,
      'materializedQuestionId', v_candidate.materialized_question_id
    );
  end if;
  if v_candidate.lease_token is distinct from p_lease_token then
    return jsonb_build_object(
      'id', v_candidate.id,
      'status', 'lease_invalid'
    );
  end if;
  if v_candidate.provider_dispatched_at is null then
    return jsonb_build_object(
      'id', v_candidate.id,
      'status', 'dispatch_required'
    );
  end if;

  update public.mistake_flashcard_candidates
  set status = 'dead_letter',
      lease_token = null,
      lease_expires_at = null,
      last_error = jsonb_build_object('code', p_error_code)
  where id = v_candidate.id
  returning * into v_candidate;

  return jsonb_build_object(
    'id', v_candidate.id,
    'status', v_candidate.status,
    'materializedQuestionId', v_candidate.materialized_question_id
  );
end;
$$;

revoke all on function public.mistake_generation_retry_protocol_version()
  from public, anon, authenticated;
revoke all on function public.claim_mistake_flashcard_candidate(
  uuid, integer
) from public, anon, authenticated;
revoke all on function public.mark_mistake_generation_dispatched(
  uuid, uuid
) from public, anon, authenticated;
revoke all on function public.enforce_mistake_generation_dispatch()
  from public, anon, authenticated;
revoke all on function public.terminate_mistake_flashcard_generation(
  uuid, uuid, text
) from public, anon, authenticated;

grant execute on function public.mistake_generation_retry_protocol_version()
  to authenticated;
grant execute on function public.claim_mistake_flashcard_candidate(
  uuid, integer
) to authenticated;
grant execute on function public.mark_mistake_generation_dispatched(
  uuid, uuid
) to authenticated;
grant execute on function public.terminate_mistake_flashcard_generation(
  uuid, uuid, text
) to authenticated;

comment on function public.claim_mistake_flashcard_candidate(
  uuid, integer
) is
  'Reclaims expired undispatched work while terminalizing expired provider-dispatched leases.';
comment on function public.mark_mistake_generation_dispatched(
  uuid, uuid
) is
  'Marks the exact generation lease immediately before a paid provider call.';
comment on function public.enforce_mistake_generation_dispatch() is
  'Rejects materialization of a mistake draft before its provider dispatch marker.';
comment on function public.terminate_mistake_flashcard_generation(
  uuid, uuid, text
) is
  'Dead-letters the matching paid generation lease after a provider or completion outcome can no longer be confirmed.';
