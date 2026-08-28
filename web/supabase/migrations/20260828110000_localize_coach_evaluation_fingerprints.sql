-- Keep the database-side Coach identity in lockstep with the locale-aware
-- TypeScript fingerprint. Legacy fingerprints remain valid only as Vietnamese
-- requests so an in-flight rollout cannot bypass an existing terminal cache.
create or replace function public.coach_evaluation_response_locale(
  p_request_fingerprint text,
  p_question_id text,
  p_question_version integer,
  p_source_revision text,
  p_candidate_answer text
)
returns text
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_base text;
  v_locale text;
begin
  if p_request_fingerprint !~ '^[a-f0-9]{64}$'
    or p_question_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or pg_catalog.char_length(p_question_id) > 100
    or p_question_version <= 0
    or p_source_revision !~ '^[a-f0-9]{64}$'
  then
    return null;
  end if;

  v_base := p_question_id || pg_catalog.chr(31)
    || p_question_version::text || pg_catalog.chr(31)
    || p_source_revision || pg_catalog.chr(31)
    || p_candidate_answer;

  foreach v_locale in array array['vi', 'en']
  loop
    if p_request_fingerprint = pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(
          v_base || pg_catalog.chr(31) || v_locale,
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) then
      return v_locale;
    end if;
  end loop;

  -- Before locale support, Coach fingerprints represented Vietnamese output.
  if p_request_fingerprint = pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(v_base, 'UTF8'),
      'sha256'
    ),
    'hex'
  ) then
    return 'vi';
  end if;

  return null;
end;
$$;

revoke all on function public.coach_evaluation_response_locale(
  text, text, integer, text, text
) from public, anon, authenticated;

create or replace function public.reserve_coach_evaluation(
  p_idempotency_key uuid,
  p_request_fingerprint text,
  p_question_id text,
  p_question_version integer,
  p_source_revision text,
  p_candidate_answer text,
  p_lease_seconds integer default 600
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_reservation public.coach_evaluation_reservations%rowtype;
  v_attempt public.coach_attempts%rowtype;
  v_lease_token uuid;
  v_response_locale text;
  v_legacy_fingerprint text;
  v_reservation_found boolean := false;
  v_attempt_found boolean := false;
  v_attempt_found_by_key boolean := false;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_idempotency_key is null
    or p_idempotency_key = '00000000-0000-0000-0000-000000000000'::uuid
    or p_request_fingerprint is null
    or p_request_fingerprint !~ '^[a-f0-9]{64}$'
    or p_question_id is null
    or p_question_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or char_length(p_question_id) > 100
    or p_question_version is null
    or p_question_version <= 0
    or p_source_revision is null
    or p_source_revision !~ '^[a-f0-9]{64}$'
    or p_candidate_answer is null
    or p_lease_seconds is null
    or p_lease_seconds not between 240 and 900 then
    raise exception 'Invalid coach evaluation reservation';
  end if;

  v_response_locale := public.coach_evaluation_response_locale(
    p_request_fingerprint,
    p_question_id,
    p_question_version,
    p_source_revision,
    p_candidate_answer
  );
  if v_response_locale is null then
    raise exception 'Coach evaluation fingerprint mismatch';
  end if;

  v_legacy_fingerprint := pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(
        p_question_id || pg_catalog.chr(31)
          || p_question_version::text || pg_catalog.chr(31)
          || p_source_revision || pg_catalog.chr(31)
          || p_candidate_answer,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'coach-evaluation:' || v_user_id::text,
      0
    )
  );

  select *
  into v_reservation
  from public.coach_evaluation_reservations
  where user_id = v_user_id
    and idempotency_key = p_idempotency_key
  for update;
  v_reservation_found := found;

  if v_reservation_found then
    if v_reservation.request_fingerprint is distinct from
      p_request_fingerprint then
      return jsonb_build_object('status', 'idempotency_conflict');
    end if;
  else
    select *
    into v_reservation
    from public.coach_evaluation_reservations
    where user_id = v_user_id
      and (
        request_fingerprint = p_request_fingerprint
        or (
          v_response_locale = 'vi'
          and request_fingerprint = v_legacy_fingerprint
        )
      )
    order by (request_fingerprint = p_request_fingerprint) desc
    limit 1
    for update;
    v_reservation_found := found;
  end if;

  if v_reservation_found
    and v_reservation.status = 'completed' then
    return jsonb_build_object(
      'status', 'completed',
      'idempotency_key', v_reservation.idempotency_key,
      'request_fingerprint', v_reservation.request_fingerprint,
      'attempt_id', v_reservation.attempt_id,
      'feedback', v_reservation.feedback,
      'model', v_reservation.model,
      'lease_token', null,
      'lease_expires_at', null,
      'lease_attempt', v_reservation.lease_attempt,
      'is_new', false,
      'lease_renewed', false
    );
  end if;

  if v_reservation_found
    and v_reservation.status = 'outcome_unknown' then
    return jsonb_build_object(
      'status', 'outcome_unknown',
      'idempotency_key', v_reservation.idempotency_key,
      'request_fingerprint', v_reservation.request_fingerprint,
      'attempt_id', null,
      'feedback', null,
      'model', null,
      'lease_token', null,
      'lease_expires_at', null,
      'lease_attempt', v_reservation.lease_attempt,
      'is_new', false,
      'lease_renewed', false
    );
  end if;

  -- Preserve cache compatibility with attempts created before this migration
  -- or by an old application instance during a rolling deployment. The row
  -- lock prevents a concurrent history deletion from invalidating the FK.
  select *
  into v_attempt
  from public.coach_attempts
  where user_id = v_user_id
    and idempotency_key = p_idempotency_key
  for key share;
  v_attempt_found_by_key := found;
  v_attempt_found := found;

  if v_attempt_found_by_key then
    if v_attempt.question_id is distinct from p_question_id
      or v_attempt.question_version is distinct from p_question_version
      or v_attempt.source_commit_sha is distinct from p_source_revision
      or v_attempt.candidate_answer is distinct from p_candidate_answer
      or v_attempt.response_locale is distinct from v_response_locale then
      return jsonb_build_object('status', 'idempotency_conflict');
    end if;
  else
    select *
    into v_attempt
    from public.coach_attempts
    where user_id = v_user_id
      and question_id = p_question_id
      and question_version = p_question_version
      and source_commit_sha = p_source_revision
      and candidate_answer = p_candidate_answer
      and response_locale = v_response_locale
    order by created_at desc, id desc
    limit 1
    for key share;
    v_attempt_found := found;
  end if;

  -- Promote only a cache that satisfies the current contract. An invalid
  -- legacy row is ignored so the same logical answer can be evaluated and
  -- repaired instead of being poisoned permanently.
  if v_attempt_found
    and public.is_valid_coach_feedback(v_attempt.feedback)
    and v_attempt.model is not null
    and char_length(v_attempt.model) <= 200
    and char_length(btrim(v_attempt.model)) >= 1 then
    insert into public.coach_evaluation_reservations (
      user_id,
      idempotency_key,
      request_fingerprint,
      status,
      attempt_id,
      feedback,
      model,
      lease_token,
      lease_expires_at,
      dispatched_at,
      completed_at
    ) values (
      v_user_id,
      case
        when v_reservation_found
          then v_reservation.idempotency_key
        else p_idempotency_key
      end,
      p_request_fingerprint,
      'completed',
      v_attempt.id,
      v_attempt.feedback,
      v_attempt.model,
      null,
      null,
      v_attempt.created_at,
      v_attempt.created_at
    )
    on conflict (user_id, idempotency_key) do update
    set status = 'completed',
        attempt_id = excluded.attempt_id,
        feedback = excluded.feedback,
        model = excluded.model,
        lease_token = null,
        lease_expires_at = null,
        dispatched_at = excluded.dispatched_at,
        completed_at = excluded.completed_at,
        updated_at = now()
    where public.coach_evaluation_reservations.request_fingerprint =
      excluded.request_fingerprint;

    select *
    into v_reservation
    from public.coach_evaluation_reservations
    where user_id = v_user_id
      and request_fingerprint = p_request_fingerprint;

    if v_reservation.request_fingerprint is distinct from
      p_request_fingerprint then
      return jsonb_build_object('status', 'idempotency_conflict');
    end if;

    return jsonb_build_object(
      'status', 'completed',
      'idempotency_key', v_reservation.idempotency_key,
      'request_fingerprint', v_reservation.request_fingerprint,
      'attempt_id', v_reservation.attempt_id,
      'feedback', v_reservation.feedback,
      'model', v_reservation.model,
      'lease_token', null,
      'lease_expires_at', null,
      'lease_attempt', v_reservation.lease_attempt,
      'is_new', false,
      'lease_renewed', false
    );
  end if;

  if v_reservation_found then
    if v_reservation.lease_expires_at > now() then
      return jsonb_build_object(
        'status', 'busy',
        'lease_expires_at', v_reservation.lease_expires_at
      );
    end if;

    if v_reservation.dispatched_at is null then
      delete from public.coach_evaluation_reservations
      where user_id = v_user_id
        and idempotency_key = v_reservation.idempotency_key;
      v_reservation_found := false;
    else
      update public.coach_evaluation_reservations
      set status = 'outcome_unknown',
          lease_token = null,
          lease_expires_at = null,
          completed_at = now(),
          updated_at = now()
      where user_id = v_user_id
        and idempotency_key = v_reservation.idempotency_key
      returning * into v_reservation;

      return jsonb_build_object(
        'status', 'outcome_unknown',
        'idempotency_key', v_reservation.idempotency_key,
        'request_fingerprint', v_reservation.request_fingerprint,
        'attempt_id', null,
        'feedback', null,
        'model', null,
        'lease_token', null,
        'lease_expires_at', null,
        'lease_attempt', v_reservation.lease_attempt,
        'is_new', false,
        'lease_renewed', false
      );
    end if;
  end if;

  v_lease_token := extensions.gen_random_uuid();
  insert into public.coach_evaluation_reservations (
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
    now() + make_interval(secs => p_lease_seconds)
  )
  returning * into v_reservation;

  return jsonb_build_object(
    'status', 'running',
    'idempotency_key', v_reservation.idempotency_key,
    'request_fingerprint', v_reservation.request_fingerprint,
    'attempt_id', null,
    'feedback', null,
    'model', null,
    'lease_token', v_reservation.lease_token,
    'lease_expires_at', v_reservation.lease_expires_at,
    'lease_attempt', v_reservation.lease_attempt,
    'is_new', true,
    'lease_renewed', false
  );
end;
$$;

create or replace function public.complete_coach_evaluation(
  p_idempotency_key uuid,
  p_request_fingerprint text,
  p_lease_token uuid,
  p_question_id text,
  p_question_version integer,
  p_source_revision text,
  p_candidate_answer text,
  p_score integer,
  p_verdict text,
  p_suggested_rating text,
  p_feedback jsonb,
  p_model text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_reservation public.coach_evaluation_reservations%rowtype;
  v_attempt public.coach_attempts%rowtype;
  v_attempt_id bigint;
  v_feedback jsonb;
  v_model text;
  v_response_locale text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_idempotency_key is null
    or p_idempotency_key = '00000000-0000-0000-0000-000000000000'::uuid
    or p_request_fingerprint is null
    or p_request_fingerprint !~ '^[a-f0-9]{64}$'
    or p_lease_token is null
    or p_lease_token = '00000000-0000-0000-0000-000000000000'::uuid
    or p_question_id is null
    or p_question_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or char_length(p_question_id) > 100
    or p_question_version is null
    or p_question_version <= 0
    or p_source_revision is null
    or p_source_revision !~ '^[a-f0-9]{64}$'
    or p_candidate_answer is null
    or p_score is null
    or p_score not between 0 and 100
    or p_verdict is null
    or p_verdict not in ('needs_work', 'partial', 'solid', 'strong')
    or p_suggested_rating is null
    or p_suggested_rating not in ('again', 'hard', 'good', 'easy')
    or p_feedback is null
    or not public.is_valid_coach_feedback(p_feedback)
    or (p_feedback ->> 'score') is distinct from p_score::text
    or (p_feedback ->> 'verdict') is distinct from p_verdict
    or (p_feedback ->> 'suggestedRating') is distinct from
      p_suggested_rating
    or p_model is null
    or char_length(p_model) > 200
    or char_length(btrim(p_model)) < 1 then
    raise exception 'Invalid coach evaluation completion';
  end if;

  v_response_locale := public.coach_evaluation_response_locale(
    p_request_fingerprint,
    p_question_id,
    p_question_version,
    p_source_revision,
    p_candidate_answer
  );
  if v_response_locale is null then
    raise exception 'Coach evaluation fingerprint mismatch';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'coach-evaluation:' || v_user_id::text,
      0
    )
  );

  select *
  into v_reservation
  from public.coach_evaluation_reservations
  where user_id = v_user_id
    and idempotency_key = p_idempotency_key
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_reservation.request_fingerprint is distinct from
    p_request_fingerprint then
    return jsonb_build_object('status', 'idempotency_conflict');
  end if;
  if v_reservation.status = 'completed' then
    return jsonb_build_object(
      'status', 'completed',
      'idempotency_key', v_reservation.idempotency_key,
      'request_fingerprint', v_reservation.request_fingerprint,
      'attempt_id', v_reservation.attempt_id,
      'feedback', v_reservation.feedback,
      'model', v_reservation.model,
      'lease_token', null,
      'lease_expires_at', null,
      'lease_attempt', v_reservation.lease_attempt,
      'is_new', false,
      'lease_renewed', false
    );
  end if;
  if v_reservation.status = 'outcome_unknown' then
    return jsonb_build_object(
      'status', 'outcome_unknown',
      'idempotency_key', v_reservation.idempotency_key,
      'request_fingerprint', v_reservation.request_fingerprint,
      'attempt_id', null,
      'feedback', null,
      'model', null,
      'lease_token', null,
      'lease_expires_at', null,
      'lease_attempt', v_reservation.lease_attempt,
      'is_new', false,
      'lease_renewed', false
    );
  end if;
  if v_reservation.dispatched_at is null then
    return jsonb_build_object('status', 'dispatch_required');
  end if;
  if v_reservation.lease_token is distinct from p_lease_token
    or v_reservation.lease_expires_at <= now() then
    return jsonb_build_object('status', 'lease_invalid');
  end if;

  insert into public.coach_attempts (
    user_id,
    question_id,
    question_version,
    source_commit_sha,
    candidate_answer,
    score,
    verdict,
    suggested_rating,
    feedback,
    model,
    idempotency_key,
    response_locale
  ) values (
    v_user_id,
    p_question_id,
    p_question_version,
    p_source_revision,
    p_candidate_answer,
    p_score,
    p_verdict,
    p_suggested_rating,
    p_feedback,
    p_model,
    p_idempotency_key,
    v_response_locale
  )
  on conflict (user_id, idempotency_key)
    where idempotency_key is not null
  do update
  set score = excluded.score,
      verdict = excluded.verdict,
      suggested_rating = excluded.suggested_rating,
      feedback = excluded.feedback,
      model = excluded.model,
      response_locale = excluded.response_locale,
      created_at = now()
  where public.coach_attempts.question_id = excluded.question_id
    and public.coach_attempts.question_version =
      excluded.question_version
    and public.coach_attempts.source_commit_sha =
      excluded.source_commit_sha
    and public.coach_attempts.candidate_answer =
      excluded.candidate_answer
    and public.coach_attempts.response_locale =
      excluded.response_locale
  returning id into v_attempt_id;

  if v_attempt_id is null then
    select *
    into v_attempt
    from public.coach_attempts
    where user_id = v_user_id
      and idempotency_key = p_idempotency_key
    for key share;

    if not found
      or v_attempt.question_id is distinct from p_question_id
      or v_attempt.question_version is distinct from p_question_version
      or v_attempt.source_commit_sha is distinct from p_source_revision
      or v_attempt.candidate_answer is distinct from p_candidate_answer
      or v_attempt.response_locale is distinct from v_response_locale then
      return jsonb_build_object('status', 'idempotency_conflict');
    end if;

    v_attempt_id := v_attempt.id;
    v_feedback := v_attempt.feedback;
    v_model := v_attempt.model;
  else
    v_feedback := p_feedback;
    v_model := p_model;
  end if;

  update public.coach_evaluation_reservations
  set status = 'completed',
      attempt_id = v_attempt_id,
      feedback = v_feedback,
      model = v_model,
      lease_token = null,
      lease_expires_at = null,
      completed_at = now(),
      updated_at = now()
  where user_id = v_user_id
    and idempotency_key = p_idempotency_key
  returning * into v_reservation;

  return jsonb_build_object(
    'status', 'completed',
    'idempotency_key', v_reservation.idempotency_key,
    'request_fingerprint', v_reservation.request_fingerprint,
    'attempt_id', v_reservation.attempt_id,
    'feedback', v_reservation.feedback,
    'model', v_reservation.model,
    'lease_token', null,
    'lease_expires_at', null,
    'lease_attempt', v_reservation.lease_attempt,
    'is_new', true,
    'lease_renewed', false
  );
end;
$$;

revoke all on function public.reserve_coach_evaluation(
  uuid, text, text, integer, text, text, integer
) from public, anon, authenticated;
revoke all on function public.complete_coach_evaluation(
  uuid, text, uuid, text, integer, text, text, integer, text, text,
  jsonb, text
) from public, anon, authenticated;

grant execute on function public.reserve_coach_evaluation(
  uuid, text, text, integer, text, text, integer
) to authenticated;
grant execute on function public.complete_coach_evaluation(
  uuid, text, uuid, text, integer, text, text, integer, text, text,
  jsonb, text
) to authenticated;

notify pgrst, 'reload schema';
