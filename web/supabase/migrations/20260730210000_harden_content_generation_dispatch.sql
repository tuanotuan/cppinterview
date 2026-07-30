-- Prevent a crashed content-generation worker from reopening a lease after a
-- paid provider request may already have completed. Only a confirmed provider
-- rate-limit response may return a job to the automatic queue.

alter table public.content_generation_jobs
  add column if not exists provider_dispatched_at timestamptz,
  add column if not exists last_provider_dispatched_at timestamptz,
  add column if not exists provider_dispatch_history jsonb not null
    default '[]'::jsonb
    check (
      pg_catalog.jsonb_typeof(provider_dispatch_history) = 'array'
      and pg_catalog.jsonb_array_length(provider_dispatch_history) <= 500
    ),
  add column if not exists manual_retry_count integer not null default 0
    check (manual_retry_count between 0 and 100),
  add column if not exists manual_retry_history jsonb not null
    default '[]'::jsonb
    check (
      pg_catalog.jsonb_typeof(manual_retry_history) = 'array'
      and pg_catalog.jsonb_array_length(manual_retry_history) <= 100
    ),
  add column if not exists last_manual_retry_at timestamptz,
  add column if not exists last_manual_retry_error jsonb
    check (
      last_manual_retry_error is null
      or pg_catalog.jsonb_typeof(last_manual_retry_error) = 'object'
    ),
  add column if not exists
    last_manual_retry_provider_dispatched_at timestamptz;

-- Terminal rows created by the old worker may already represent a paid call.
-- Keep that evidence so an administrator must explicitly acknowledge it.
update public.content_generation_jobs
set provider_dispatched_at = coalesce(
      provider_dispatched_at,
      updated_at,
      created_at
    ),
    last_provider_dispatched_at = coalesce(
      last_provider_dispatched_at,
      provider_dispatched_at,
      updated_at,
      created_at
    )
where status in ('failed', 'dead_letter')
  and coalesce(last_error ->> 'code', '') <> 'stale_manifest';

-- Protocol v1 had no durable way to distinguish a never-claimed pending row
-- from a manual retry that erased an ambiguous provider outcome. Quarantine
-- every legacy pending row; an administrator can explicitly acknowledge it.
update public.content_generation_jobs
set status = 'dead_letter',
    provider_dispatched_at = coalesce(
      provider_dispatched_at,
      updated_at,
      created_at
    ),
    last_provider_dispatched_at = coalesce(
      last_provider_dispatched_at,
      provider_dispatched_at,
      updated_at,
      created_at
    ),
    lease_token = null,
    lease_expires_at = null,
    last_error = jsonb_build_object(
      'code', 'legacy_pending_retry_outcome_unconfirmed',
      'at', now(),
      'previousError', last_error
    )
where status = 'pending';

-- Every deferred row predates protocol v2. The old worker deferred timeouts,
-- connection failures, 5xx responses, and expired leases as well as 429s. Its
-- provider SDK could also retry internally before surfacing a final 429, so no
-- legacy deferred outcome is safe to reclaim automatically.
update public.content_generation_jobs
set status = 'dead_letter',
    provider_dispatched_at = coalesce(
      provider_dispatched_at,
      updated_at,
      created_at
    ),
    last_provider_dispatched_at = coalesce(
      last_provider_dispatched_at,
      provider_dispatched_at,
      updated_at,
      created_at
    ),
    lease_token = null,
    lease_expires_at = null,
    last_error = jsonb_build_object(
      'code', 'legacy_deferred_outcome_unconfirmed',
      'at', now(),
      'previousError', last_error
    )
where status = 'deferred';

-- A running lease created by an older worker cannot prove that no provider
-- request happened. Preserve the conservative interpretation during rollout.
update public.content_generation_jobs
set provider_dispatched_at = coalesce(
      provider_dispatched_at,
      updated_at,
      created_at
    ),
    last_provider_dispatched_at = coalesce(
      last_provider_dispatched_at,
      provider_dispatched_at,
      updated_at,
      created_at
    )
where status = 'running';

create or replace function public.content_generation_retry_protocol_version()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 2
$$;

create or replace function public.enqueue_content_generation_jobs(
  p_generator_version text,
  p_provider text,
  p_model text,
  p_requested_count integer default 2,
  p_github_run_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_candidate record;
  v_enqueued integer := 0;
  v_inserted integer;
begin
  if p_generator_version is null
    or char_length(btrim(p_generator_version)) = 0
    or char_length(p_generator_version) > 200
    or p_provider is null
    or char_length(btrim(p_provider)) = 0
    or char_length(p_provider) > 100
    or p_model is null
    or char_length(btrim(p_model)) = 0
    or char_length(p_model) > 200
    or p_requested_count is null
    or p_requested_count not between 1 and 5 then
    raise exception 'Invalid generation job configuration';
  end if;

  -- The completion RPC already owns this lock while it materializes questions.
  -- Taking it before any row lock keeps enqueue, claim, completion, and manual
  -- rollover resolution in one lock order and closes the completion/claim race.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('cpp-recall-db-question-generation')
  );

  for v_candidate in
    select
      revision.id as lesson_revision_id,
      lesson.id as lesson_id,
      lesson.current_source_hash as source_hash
    from public.content_lessons as lesson
    join public.content_lesson_revisions as revision
      on revision.lesson_id = lesson.id
      and revision.source_hash = lesson.current_source_hash
    where lesson.lifecycle_status = 'active'
      and lesson.current_source_hash is not null
      and not exists (
        select 1
        from public.content_questions as question
        join public.content_question_revisions as question_revision
          on question_revision.question_id = question.id
          and question_revision.version = question.current_version
        where question.lesson_id = lesson.id
          and question.lifecycle_status <> 'archived'
          and question_revision.source_hash =
            lesson.current_source_hash
      )
    order by lesson.id
  loop
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'content-generation:' || v_candidate.lesson_id || ':'
          || v_candidate.source_hash,
        2026073021
      )
    );

    insert into public.content_generation_jobs (
      lesson_revision_id,
      lesson_id,
      source_hash,
      generator_version,
      provider,
      model,
      requested_count,
      status,
      next_attempt_at,
      github_run_id
    ) values (
      v_candidate.lesson_revision_id,
      v_candidate.lesson_id,
      v_candidate.source_hash,
      p_generator_version,
      p_provider,
      p_model,
      p_requested_count,
      'pending',
      now(),
      p_github_run_id
    )
    on conflict (lesson_id, source_hash, generator_version) do nothing;

    get diagnostics v_inserted = row_count;
    v_enqueued := v_enqueued + v_inserted;
  end loop;

  return jsonb_build_object('ok', true, 'enqueued', v_enqueued);
end;
$$;

drop function if exists public.claim_content_generation_job(integer);

create function public.claim_content_generation_job(
  p_protocol_version integer,
  p_generator_version text,
  p_lease_seconds integer default 600
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.content_generation_jobs%rowtype;
  v_candidate_id bigint;
  v_candidate_lesson_id text;
  v_candidate_source_hash text;
  v_blocked_generator_version text;
  v_blocked_status text;
  v_blocked_dispatched_at timestamptz;
begin
  if p_protocol_version is distinct from 2 then
    raise exception 'Content generation retry protocol 2 is required';
  end if;
  if p_generator_version is null
    or char_length(btrim(p_generator_version)) = 0
    or char_length(p_generator_version) > 200 then
    raise exception 'A valid generator version is required';
  end if;
  if p_lease_seconds is null
    or p_lease_seconds not between 60 and 1800 then
    raise exception 'Lease must be between 60 and 1800 seconds';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('cpp-recall-db-question-generation')
  );

  update public.content_generation_jobs as job
  set status = 'completed',
      completed_at = now(),
      lease_token = null,
      lease_expires_at = null,
      last_error = jsonb_build_object('code', 'stale_source')
  where job.status in ('pending', 'deferred')
    and exists (
      select 1
      from public.content_lessons as lesson
      where lesson.id = job.lesson_id
        and (
          lesson.lifecycle_status <> 'active'
          or lesson.current_source_hash is distinct from job.source_hash
        )
    );

  -- A different worker may have completed this exact source while another
  -- generator version was already queued. Question materialization and this
  -- cleanup share the global advisory lock, so a second paid call cannot slip
  -- between the existence check and the claim.
  update public.content_generation_jobs as job
  set status = 'completed',
      completed_at = now(),
      lease_token = null,
      lease_expires_at = null,
      last_error = jsonb_build_object(
        'code', 'source_already_materialized',
        'at', now()
      )
  where job.status in ('pending', 'deferred')
    and exists (
      select 1
      from public.content_questions as question
      join public.content_question_revisions as question_revision
        on question_revision.question_id = question.id
        and question_revision.version = question.current_version
      where question.lesson_id = job.lesson_id
        and question.lifecycle_status <> 'archived'
        and question_revision.source_hash = job.source_hash
    );

  -- A provider-dispatched lease is ambiguous after its worker disappears.
  -- Never put it back into the automatic queue.
  update public.content_generation_jobs
  set status = 'dead_letter',
      lease_token = null,
      lease_expires_at = null,
      last_error = coalesce(last_error, '{}'::jsonb) || jsonb_build_object(
        'code', 'generation_lease_expired_after_dispatch',
        'at', now()
      )
  where status = 'running'
    and lease_expires_at <= now()
    and provider_dispatched_at is not null;

  -- Work that never reached a provider is safe to reclaim.
  update public.content_generation_jobs
  set status = case
        when attempt_count >= 5 then 'dead_letter'
        else 'deferred'
      end,
      next_attempt_at = case
        when attempt_count >= 5 then next_attempt_at
        else now()
      end,
      lease_token = null,
      lease_expires_at = null,
      last_error = coalesce(last_error, '{}'::jsonb) || jsonb_build_object(
        'code', 'generation_lease_expired_before_dispatch',
        'at', now()
      )
  where status = 'running'
    and lease_expires_at <= now()
    and provider_dispatched_at is null;

  select job.id, job.lesson_id, job.source_hash
  into
    v_candidate_id,
    v_candidate_lesson_id,
    v_candidate_source_hash
  from public.content_generation_jobs as job
  where job.status in ('pending', 'deferred')
    and job.next_attempt_at <= now()
    and job.attempt_count < 5
    and job.generator_version = p_generator_version
  order by job.next_attempt_at, job.id
  for update skip locked
  limit 1;

  if not found then
    select job.generator_version
    into v_blocked_generator_version
    from public.content_generation_jobs as job
    where job.status in ('pending', 'deferred')
      and job.next_attempt_at <= now()
      and job.attempt_count < 5
      and job.generator_version <> p_generator_version
    order by job.id
    limit 1;

    if found then
      return jsonb_build_object(
        'status', 'generator_version_mismatch',
        'expectedGeneratorVersion', p_generator_version,
        'foundGeneratorVersion', v_blocked_generator_version
      );
    end if;
    return null;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'content-generation:' || v_candidate_lesson_id || ':'
        || v_candidate_source_hash,
      2026073021
    )
  );

  select
    sibling.generator_version,
    sibling.status,
    sibling.provider_dispatched_at
  into
    v_blocked_generator_version,
    v_blocked_status,
    v_blocked_dispatched_at
  from public.content_generation_jobs as sibling
  where sibling.lesson_id = v_candidate_lesson_id
    and sibling.source_hash = v_candidate_source_hash
    and sibling.id <> v_candidate_id
    and (
      sibling.status in ('pending', 'deferred', 'running')
      or (
        sibling.status in ('failed', 'dead_letter')
        and sibling.provider_dispatched_at is not null
      )
    )
  order by sibling.id
  limit 1;

  if found then
    return jsonb_build_object(
      'status', 'generation_history_conflict',
      'expectedGeneratorVersion', p_generator_version,
      'foundGeneratorVersion', v_blocked_generator_version,
      'foundStatus', v_blocked_status,
      'providerOutcomeUnconfirmed',
        v_blocked_dispatched_at is not null
    );
  end if;

  update public.content_generation_jobs as job
  set status = 'running',
      attempt_count = job.attempt_count + 1,
      lease_token = extensions.gen_random_uuid(),
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      provider_dispatched_at = null,
      last_error = null
  where job.id = v_candidate_id
    and job.status in ('pending', 'deferred')
    and job.next_attempt_at <= now()
    and job.attempt_count < 5
    and job.generator_version = p_generator_version
  returning job.* into v_job;

  if not found then return null; end if;

  return jsonb_build_object(
    'id', v_job.id,
    'lessonId', v_job.lesson_id,
    'sourceHash', v_job.source_hash,
    'generatorVersion', v_job.generator_version,
    'requestedCount', v_job.requested_count,
    'attemptCount', v_job.attempt_count,
    'leaseToken', v_job.lease_token,
    'leaseExpiresAt', v_job.lease_expires_at
  );
end;
$$;

create or replace function public.mark_content_generation_dispatched(
  p_job_id bigint,
  p_lease_token uuid,
  p_provider text,
  p_model text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.content_generation_jobs%rowtype;
  v_dispatched_at timestamptz;
begin
  if p_job_id is null
    or p_job_id <= 0
    or p_lease_token is null
    or p_lease_token =
      '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'A generation job and lease UUID are required';
  end if;
  if p_provider is null
    or p_provider not in ('openai', 'gemini')
    or p_model is null
    or char_length(btrim(p_model)) = 0
    or char_length(p_model) > 200 then
    raise exception 'A valid generation provider and model are required';
  end if;

  select *
  into v_job
  from public.content_generation_jobs
  where id = p_job_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_job.status <> 'running' then
    return jsonb_build_object('status', v_job.status);
  end if;
  if v_job.lease_token is distinct from p_lease_token
    or v_job.lease_expires_at <= now() then
    return jsonb_build_object('status', 'lease_invalid');
  end if;
  if pg_catalog.jsonb_array_length(v_job.provider_dispatch_history) >= 500 then
    raise exception 'Generation dispatch audit limit reached';
  end if;

  v_dispatched_at := now();
  update public.content_generation_jobs
  set provider = p_provider,
      model = p_model,
      provider_dispatched_at = v_dispatched_at,
      last_provider_dispatched_at = v_dispatched_at,
      provider_dispatch_history = provider_dispatch_history
        || jsonb_build_array(
          jsonb_build_object(
            'at', v_dispatched_at,
            'provider', p_provider,
            'model', p_model,
            'leaseToken', p_lease_token
          )
        ),
      updated_at = v_dispatched_at
  where id = v_job.id
  returning * into v_job;

  return jsonb_build_object(
    'status', 'dispatched',
    'dispatchedAt', v_job.provider_dispatched_at,
    'provider', v_job.provider,
    'model', v_job.model
  );
end;
$$;

create or replace function public.enforce_content_generation_dispatch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'running'
    and new.status = 'completed'
    and new.last_error is null
    and old.provider_dispatched_at is null then
    raise exception 'Content generation dispatch is required';
  end if;
  return new;
end;
$$;

drop trigger if exists content_generation_requires_dispatch
  on public.content_generation_jobs;
create trigger content_generation_requires_dispatch
before update on public.content_generation_jobs
for each row execute function public.enforce_content_generation_dispatch();

drop function if exists public.fail_content_generation_job(
  bigint, uuid, jsonb, boolean
);

create function public.fail_content_generation_job(
  p_protocol_version integer,
  p_job_id bigint,
  p_lease_token uuid,
  p_error jsonb,
  p_retryable boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.content_generation_jobs%rowtype;
  v_status text;
  v_next_attempt_at timestamptz;
  v_confirmed_rate_limit boolean;
begin
  if p_protocol_version is distinct from 2 then
    raise exception 'Content generation retry protocol 2 is required';
  end if;
  if p_error is null
    or pg_catalog.jsonb_typeof(p_error) <> 'object' then
    raise exception 'Generation error must be a JSON object';
  end if;
  select *
  into v_job
  from public.content_generation_jobs
  where id = p_job_id
  for update;
  if not found
    or v_job.status <> 'running'
    or v_job.lease_token is distinct from p_lease_token then
    raise exception 'Generation job lease is invalid';
  end if;

  v_confirmed_rate_limit :=
    p_retryable is true
    and p_error ->> 'code' = 'provider_rate_limit';

  if v_confirmed_rate_limit and v_job.attempt_count < 5 then
    v_status := 'deferred';
    v_next_attempt_at := now() + make_interval(
      mins => least(
        360,
        (
          5 * power(2, greatest(0, v_job.attempt_count - 1))
        )::integer
      )
    );
  elsif v_confirmed_rate_limit then
    v_status := 'dead_letter';
    v_next_attempt_at := v_job.next_attempt_at;
  else
    v_status := 'failed';
    v_next_attempt_at := v_job.next_attempt_at;
  end if;

  update public.content_generation_jobs
  set status = v_status,
      next_attempt_at = v_next_attempt_at,
      lease_token = null,
      lease_expires_at = null,
      provider_dispatched_at = case
        when v_confirmed_rate_limit then null
        else provider_dispatched_at
      end,
      last_error = p_error
  where id = v_job.id;

  return jsonb_build_object(
    'ok', true,
    'status', v_status,
    'nextAttemptAt', v_next_attempt_at
  );
end;
$$;

drop function if exists public.retry_content_generation_job(bigint);

create function public.retry_content_generation_job(
  p_job_id bigint,
  p_generator_version text,
  p_confirm_ambiguous_outcome boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.content_generation_jobs%rowtype;
  v_requires_confirmation boolean;
begin
  if not (select public.is_content_admin()) then
    raise exception 'Content admin access required';
  end if;

  if p_generator_version is null
    or char_length(btrim(p_generator_version)) = 0
    or char_length(p_generator_version) > 200 then
    raise exception 'A valid generator version is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('cpp-recall-db-question-generation')
  );

  select *
  into v_job
  from public.content_generation_jobs
  where id = p_job_id
  for update;

  if not found
    or not (
      v_job.status in ('deferred', 'failed', 'dead_letter')
      or (
        v_job.status = 'pending'
        and v_job.generator_version is distinct from p_generator_version
      )
    ) then
    raise exception 'Generation job is not retryable';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'content-generation:' || v_job.lesson_id || ':'
        || v_job.source_hash,
      2026073021
    )
  );

  v_requires_confirmation := v_job.provider_dispatched_at is not null;
  if v_requires_confirmation
    and p_confirm_ambiguous_outcome is not true then
    raise exception
      'The provider outcome is unconfirmed; explicit retry confirmation is required';
  end if;
  if pg_catalog.jsonb_array_length(v_job.manual_retry_history) >= 100 then
    raise exception 'Generation job retry audit limit reached';
  end if;

  if v_job.generator_version is distinct from p_generator_version then
    update public.content_generation_jobs
    set status = 'completed',
        lease_token = null,
        lease_expires_at = null,
        provider_dispatched_at = null,
        completed_at = now(),
        last_error = jsonb_build_object(
          'code', 'obsolete_generator_version_acknowledged',
          'at', now(),
          'previousGeneratorVersion', v_job.generator_version,
          'currentGeneratorVersion', p_generator_version,
          'previousError', v_job.last_error,
          'previousProviderDispatchedAt',
            v_job.provider_dispatched_at,
          'confirmedAmbiguousOutcome',
            v_requires_confirmation
              and p_confirm_ambiguous_outcome is true
        ),
        manual_retry_count = manual_retry_count + 1,
        manual_retry_history = manual_retry_history
          || jsonb_build_array(
            jsonb_build_object(
              'at', now(),
              'actorUserId', auth.uid(),
              'action', 'acknowledge_obsolete_generator',
              'previousStatus', v_job.status,
              'generatorVersion', v_job.generator_version,
              'currentGeneratorVersion', p_generator_version,
              'previousError', v_job.last_error,
              'previousProviderDispatchedAt',
                v_job.provider_dispatched_at,
              'confirmedAmbiguousOutcome',
                v_requires_confirmation
                  and p_confirm_ambiguous_outcome is true
            )
          ),
        last_manual_retry_at = now(),
        last_manual_retry_error = v_job.last_error,
        last_manual_retry_provider_dispatched_at =
          v_job.provider_dispatched_at
    where id = v_job.id;

    return jsonb_build_object(
      'ok', true,
      'status', 'superseded',
      'confirmedAmbiguousOutcome',
        v_requires_confirmation
          and p_confirm_ambiguous_outcome is true
    );
  end if;

  update public.content_generation_jobs
  set status = 'pending',
      attempt_count = 0,
      next_attempt_at = now(),
      lease_token = null,
      lease_expires_at = null,
      provider_dispatched_at = null,
      last_error = null,
      completed_at = null,
      manual_retry_count = manual_retry_count + 1,
      manual_retry_history = manual_retry_history || jsonb_build_array(
        jsonb_build_object(
          'at', now(),
          'actorUserId', auth.uid(),
          'previousStatus', v_job.status,
          'generatorVersion', v_job.generator_version,
          'previousError', v_job.last_error,
          'previousProviderDispatchedAt',
            v_job.provider_dispatched_at,
          'confirmedAmbiguousOutcome',
            v_requires_confirmation
              and p_confirm_ambiguous_outcome is true
        )
      ),
      last_manual_retry_at = now(),
      last_manual_retry_error = v_job.last_error,
      last_manual_retry_provider_dispatched_at =
        v_job.provider_dispatched_at
  where id = v_job.id;

  return jsonb_build_object(
    'ok', true,
    'status', 'pending',
    'confirmedAmbiguousOutcome',
      v_requires_confirmation and p_confirm_ambiguous_outcome is true
  );
end;
$$;

revoke all on function public.content_generation_retry_protocol_version()
  from public, anon, authenticated, service_role;
revoke all on function public.claim_content_generation_job(
  integer, text, integer
)
  from public, anon, authenticated, service_role;
revoke all on function public.mark_content_generation_dispatched(
  bigint, uuid, text, text
)
  from public, anon, authenticated, service_role;
revoke all on function public.enforce_content_generation_dispatch()
  from public, anon, authenticated, service_role;
revoke all on function public.fail_content_generation_job(
  integer, bigint, uuid, jsonb, boolean
) from public, anon, authenticated, service_role;
revoke all on function public.retry_content_generation_job(
  bigint, text, boolean
)
  from public, anon, service_role;

grant execute on function public.content_generation_retry_protocol_version()
  to service_role;
grant execute on function public.claim_content_generation_job(
  integer, text, integer
)
  to service_role;
grant execute on function public.mark_content_generation_dispatched(
  bigint, uuid, text, text
) to service_role;
grant execute on function public.fail_content_generation_job(
  integer, bigint, uuid, jsonb, boolean
) to service_role;
grant execute on function public.retry_content_generation_job(
  bigint, text, boolean
)
  to authenticated;

comment on function public.content_generation_retry_protocol_version() is
  'Preflight version for crash-safe DB-native content generation.';
comment on function public.claim_content_generation_job(
  integer, text, integer
) is
  'Claims only work matching retry protocol v2 and the exact worker generator version.';
comment on function public.mark_content_generation_dispatched(
  bigint, uuid, text, text
) is
  'Durably records the exact lease, provider, and model immediately before every provider request.';
comment on function public.enforce_content_generation_dispatch() is
  'Rejects successful materialization before the exact provider dispatch marker.';
comment on function public.retry_content_generation_job(
  bigint, text, boolean
) is
  'Requires explicit confirmation for an unconfirmed provider outcome and preserves bounded retry evidence.';
