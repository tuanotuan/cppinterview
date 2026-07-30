create table if not exists public.coach_evaluation_reservations (
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  request_fingerprint text not null
    check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  status text not null default 'running'
    check (status in ('running', 'completed', 'outcome_unknown')),
  attempt_id bigint references public.coach_attempts(id) on delete cascade,
  feedback jsonb,
  model text,
  lease_token uuid,
  lease_expires_at timestamptz,
  lease_attempt integer not null default 1 check (lease_attempt > 0),
  dispatched_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, idempotency_key),
  check (
    feedback is null
    or (
      jsonb_typeof(feedback) = 'object'
      and octet_length(feedback::text) <= 65536
    )
  ),
  check (
    (
      status = 'running'
      and attempt_id is null
      and feedback is null
      and model is null
      and lease_token is not null
      and lease_expires_at is not null
      and completed_at is null
    )
    or (
      status = 'completed'
      and attempt_id is not null
      and feedback is not null
      and model is not null
      and char_length(model) <= 200
      and char_length(btrim(model)) >= 1
      and lease_token is null
      and lease_expires_at is null
      and dispatched_at is not null
      and completed_at is not null
    )
    or (
      status = 'outcome_unknown'
      and attempt_id is null
      and feedback is null
      and model is null
      and lease_token is null
      and lease_expires_at is null
      and dispatched_at is not null
      and completed_at is not null
    )
  )
);

create unique index if not exists coach_evaluation_reservation_attempt_idx
  on public.coach_evaluation_reservations (attempt_id)
  where attempt_id is not null;

create unique index if not exists coach_evaluation_reservation_request_idx
  on public.coach_evaluation_reservations (user_id, request_fingerprint);

alter table public.coach_evaluation_reservations enable row level security;

revoke all on table public.coach_evaluation_reservations
  from public, anon, authenticated;

create or replace function public.is_valid_coach_feedback(
  p_feedback jsonb
)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_item jsonb;
  v_score numeric;
begin
  if pg_catalog.jsonb_typeof(p_feedback) <> 'object'
    or pg_catalog.octet_length(p_feedback::text) > 65536
    or pg_catalog.jsonb_typeof(p_feedback -> 'score') <> 'number'
    or pg_catalog.jsonb_typeof(p_feedback -> 'verdict') <> 'string'
    or pg_catalog.jsonb_typeof(p_feedback -> 'summary') <> 'string'
    or pg_catalog.jsonb_typeof(p_feedback -> 'strengths') <> 'array'
    or pg_catalog.jsonb_typeof(p_feedback -> 'coverage') <> 'array'
    or pg_catalog.jsonb_typeof(p_feedback -> 'corrections') <> 'array'
    or pg_catalog.jsonb_typeof(p_feedback -> 'explanation') <> 'string'
    or pg_catalog.jsonb_typeof(p_feedback -> 'nextStep') <> 'string'
    or pg_catalog.jsonb_typeof(p_feedback -> 'followUpQuestion') <> 'string'
    or pg_catalog.jsonb_typeof(p_feedback -> 'suggestedRating') <> 'string'
    or pg_catalog.jsonb_typeof(p_feedback -> 'sourceSectionIds') <> 'array'
  then
    return false;
  end if;

  v_score := (p_feedback ->> 'score')::numeric;
  if v_score < 0
    or v_score > 100
    or pg_catalog.mod(v_score, 1) <> 0
    or (p_feedback ->> 'verdict') not in (
      'needs_work', 'partial', 'solid', 'strong'
    )
    or pg_catalog.char_length(
      pg_catalog.btrim(p_feedback ->> 'summary')
    ) not between 1 and 700
    or (p_feedback ->> 'suggestedRating') not in (
      'again', 'hard', 'good', 'easy'
    )
    or pg_catalog.char_length(
      pg_catalog.btrim(p_feedback ->> 'explanation')
    ) not between 1 and 1400
    or pg_catalog.char_length(
      pg_catalog.btrim(p_feedback ->> 'nextStep')
    ) not between 1 and 400
    or pg_catalog.char_length(
      pg_catalog.btrim(p_feedback ->> 'followUpQuestion')
    ) not between 1 and 500
    or pg_catalog.jsonb_array_length(
      p_feedback -> 'strengths'
    ) > 4
    or pg_catalog.jsonb_array_length(
      p_feedback -> 'coverage'
    ) not between 1 and 8
    or pg_catalog.jsonb_array_length(
      p_feedback -> 'corrections'
    ) > 4
    or pg_catalog.jsonb_array_length(
      p_feedback -> 'sourceSectionIds'
    ) > 4
  then
    return false;
  end if;

  for v_item in
    select value
    from pg_catalog.jsonb_array_elements(
      p_feedback -> 'strengths'
    )
  loop
    if pg_catalog.jsonb_typeof(v_item) <> 'string'
      or pg_catalog.char_length(
        pg_catalog.btrim(v_item #>> '{}')
      ) not between 1 and 300
    then
      return false;
    end if;
  end loop;

  for v_item in
    select value
    from pg_catalog.jsonb_array_elements(
      p_feedback -> 'corrections'
    )
  loop
    if pg_catalog.jsonb_typeof(v_item) <> 'string'
      or pg_catalog.char_length(
        pg_catalog.btrim(v_item #>> '{}')
      ) not between 1 and 400
    then
      return false;
    end if;
  end loop;

  for v_item in
    select value
    from pg_catalog.jsonb_array_elements(
      p_feedback -> 'sourceSectionIds'
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

  for v_item in
    select value
    from pg_catalog.jsonb_array_elements(
      p_feedback -> 'coverage'
    )
  loop
    if pg_catalog.jsonb_typeof(v_item) <> 'object'
      or pg_catalog.jsonb_typeof(v_item -> 'criterion') <> 'string'
      or pg_catalog.jsonb_typeof(v_item -> 'status') <> 'string'
      or pg_catalog.jsonb_typeof(v_item -> 'feedback') <> 'string'
      or pg_catalog.char_length(
        pg_catalog.btrim(v_item ->> 'criterion')
      ) not between 1 and 300
      or (v_item ->> 'status') not in ('missed', 'partial', 'met')
      or pg_catalog.char_length(
        pg_catalog.btrim(v_item ->> 'feedback')
      ) not between 1 and 400
    then
      return false;
    end if;
  end loop;

  return true;
exception
  when others then
    return false;
end;
$$;

revoke all on function public.is_valid_coach_feedback(jsonb)
  from public, anon, authenticated;

alter table public.coach_evaluation_reservations
  drop constraint if exists coach_evaluation_feedback_schema_check;
alter table public.coach_evaluation_reservations
  add constraint coach_evaluation_feedback_schema_check
  check (
    feedback is null
    or public.is_valid_coach_feedback(feedback)
  );

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
  v_expected_fingerprint text;
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

  v_expected_fingerprint := pg_catalog.encode(
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
  if p_request_fingerprint is distinct from v_expected_fingerprint then
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
      and request_fingerprint = p_request_fingerprint
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
      or v_attempt.candidate_answer is distinct from p_candidate_answer then
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

create or replace function public.mark_coach_evaluation_dispatched(
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
  v_reservation public.coach_evaluation_reservations%rowtype;
begin
  if v_user_id is null
    or p_idempotency_key is null
    or p_idempotency_key = '00000000-0000-0000-0000-000000000000'::uuid
    or p_lease_token is null
    or p_lease_token = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'Invalid coach evaluation dispatch';
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
  if v_reservation.status <> 'running' then
    return jsonb_build_object('status', v_reservation.status);
  end if;
  if v_reservation.lease_token is distinct from p_lease_token
    or v_reservation.lease_expires_at <= now() then
    return jsonb_build_object('status', 'lease_invalid');
  end if;

  update public.coach_evaluation_reservations
  set dispatched_at = coalesce(dispatched_at, now()),
      updated_at = now()
  where user_id = v_user_id
    and idempotency_key = p_idempotency_key
  returning * into v_reservation;

  return jsonb_build_object(
    'status', 'dispatched',
    'dispatched_at', v_reservation.dispatched_at
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
  v_expected_fingerprint text;
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

  v_expected_fingerprint := pg_catalog.encode(
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
  if p_request_fingerprint is distinct from v_expected_fingerprint then
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
    idempotency_key
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
    p_idempotency_key
  )
  on conflict (user_id, idempotency_key)
    where idempotency_key is not null
  do update
  set score = excluded.score,
      verdict = excluded.verdict,
      suggested_rating = excluded.suggested_rating,
      feedback = excluded.feedback,
      model = excluded.model,
      created_at = now()
  where public.coach_attempts.question_id = excluded.question_id
    and public.coach_attempts.question_version =
      excluded.question_version
    and public.coach_attempts.source_commit_sha =
      excluded.source_commit_sha
    and public.coach_attempts.candidate_answer =
      excluded.candidate_answer
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
      or v_attempt.candidate_answer is distinct from p_candidate_answer then
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

create or replace function public.mark_coach_evaluation_outcome_unknown(
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
  v_reservation public.coach_evaluation_reservations%rowtype;
begin
  if v_user_id is null
    or p_idempotency_key is null
    or p_idempotency_key = '00000000-0000-0000-0000-000000000000'::uuid
    or p_lease_token is null
    or p_lease_token = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'Invalid coach evaluation outcome transition';
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
  if v_reservation.lease_token is distinct from p_lease_token then
    return jsonb_build_object('status', 'lease_invalid');
  end if;

  update public.coach_evaluation_reservations
  set status = 'outcome_unknown',
      lease_token = null,
      lease_expires_at = null,
      completed_at = now(),
      updated_at = now()
  where user_id = v_user_id
    and idempotency_key = p_idempotency_key
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
end;
$$;

create or replace function public.release_coach_evaluation(
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
  v_reservation public.coach_evaluation_reservations%rowtype;
begin
  if v_user_id is null
    or p_idempotency_key is null
    or p_idempotency_key = '00000000-0000-0000-0000-000000000000'::uuid
    or p_lease_token is null
    or p_lease_token = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'Invalid coach evaluation release';
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
  if v_reservation.status in ('completed', 'outcome_unknown') then
    return jsonb_build_object('status', v_reservation.status);
  end if;
  if v_reservation.lease_token is distinct from p_lease_token then
    return jsonb_build_object('status', 'lease_invalid');
  end if;

  delete from public.coach_evaluation_reservations
  where user_id = v_user_id
    and idempotency_key = p_idempotency_key;

  return jsonb_build_object('status', 'released');
end;
$$;

revoke all on function public.reserve_coach_evaluation(
  uuid, text, text, integer, text, text, integer
) from public, anon, authenticated;
revoke all on function public.complete_coach_evaluation(
  uuid, text, uuid, text, integer, text, text, integer, text, text,
  jsonb, text
) from public, anon, authenticated;
revoke all on function public.mark_coach_evaluation_dispatched(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.release_coach_evaluation(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.mark_coach_evaluation_outcome_unknown(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.reserve_coach_evaluation(
  uuid, text, text, integer, text, text, integer
) to authenticated;
grant execute on function public.complete_coach_evaluation(
  uuid, text, uuid, text, integer, text, text, integer, text, text,
  jsonb, text
) to authenticated;
grant execute on function public.mark_coach_evaluation_dispatched(uuid, uuid)
  to authenticated;
grant execute on function public.release_coach_evaluation(uuid, uuid)
  to authenticated;
grant execute on function public.mark_coach_evaluation_outcome_unknown(
  uuid, uuid
) to authenticated;

comment on table public.coach_evaluation_reservations is
  'Token-scoped atomic admission and terminal cache for AI Coach evaluation idempotency, including permanently ambiguous provider outcomes.';
