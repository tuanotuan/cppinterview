-- Promote the practice scheduler to FSRS 6 while keeping the existing
-- generation-aware overload available during an app/database rolling deploy.
-- The application replays rating history and supplies the deterministic
-- interval; Postgres remains authoritative for ownership, serialization,
-- idempotency, history generations, aggregate counts, and bounds.

create function public.record_practice_review(
  p_question_id text,
  p_question_version integer,
  p_source_hash text,
  p_reviewed_on date,
  p_rating text,
  p_history_reset_token uuid,
  p_interval_days_after integer,
  p_scheduler_version text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_rating text;
  v_existing_review_version integer;
  v_existing_review_hash text;
  v_existing_review_reset_token uuid;
  v_existing_last_reviewed_on date;
  v_history_reset_token uuid;
  v_daily_review_found boolean := false;
  v_state_found boolean := false;
  v_previous_review_count integer := 0;
  v_previous_lapse_count integer := 0;
  v_review_count integer := 0;
  v_lapse_count integer := 0;
  v_next_state text;
  v_due_on date;
  v_status text := 'recorded';
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_question_id is null
    or p_question_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Invalid question ID';
  end if;
  if p_question_version is null or p_question_version <= 0 then
    raise exception 'Invalid question version';
  end if;
  if p_source_hash is null
    or p_source_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid source hash';
  end if;
  if p_reviewed_on is null then
    raise exception 'Invalid review date';
  end if;
  if p_rating is null
    or p_rating not in ('again', 'hard', 'good', 'easy') then
    raise exception 'Invalid rating';
  end if;
  if p_interval_days_after is null
    or p_interval_days_after < 1
    or p_interval_days_after > 36500 then
    raise exception 'Invalid FSRS interval';
  end if;
  if p_scheduler_version is distinct from 'fsrs-6-default-v1' then
    raise exception 'Unsupported scheduler version';
  end if;

  -- Use the same lock namespace as review/reset/reschedule RPCs so an FSRS
  -- write cannot race a legacy write or a history-generation rotation.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_user_id::text || ':' || p_question_id,
      2026073020
    )
  );

  select
    review.rating,
    review.question_version,
    review.source_hash,
    review.history_reset_token
  into
    v_existing_rating,
    v_existing_review_version,
    v_existing_review_hash,
    v_existing_review_reset_token
  from public.practice_reviews as review
  where review.user_id = v_user_id
    and review.question_id = p_question_id
    and review.reviewed_on = p_reviewed_on
  for update;
  v_daily_review_found := found;

  select
    state.last_reviewed_on,
    state.history_reset_token
  into
    v_existing_last_reviewed_on,
    v_history_reset_token
  from public.user_question_states as state
  where state.user_id = v_user_id
    and state.question_id = p_question_id
  for update;
  v_state_found := found;

  if v_history_reset_token is distinct from p_history_reset_token
    and (
      v_history_reset_token is not null
      or p_history_reset_token is not null
    ) then
    return pg_catalog.jsonb_build_object(
      'status', 'reset_discarded',
      'rating', p_rating
    );
  end if;

  if v_daily_review_found
    and v_existing_review_version is not distinct from p_question_version
    and v_existing_review_hash is not distinct from p_source_hash
    and v_existing_review_reset_token
      is not distinct from p_history_reset_token then
    if v_existing_rating is distinct from p_rating then
      -- One durable answer per question/day: do not let a retry with another
      -- rating rewrite a transition that another tab already committed.
      return pg_catalog.jsonb_build_object(
        'status', 'already_recorded',
        'rating', v_existing_rating
      );
    end if;
    v_status := 'already_recorded';
  end if;

  with ordered_previous_reviews as (
    select
      review.rating,
      pg_catalog.row_number() over (
        order by review.reviewed_on, review.created_at, review.id
      ) as review_number
    from public.practice_reviews as review
    where review.user_id = v_user_id
      and review.question_id = p_question_id
      and review.question_version is not distinct from p_question_version
      and review.source_hash is not distinct from p_source_hash
      and review.history_reset_token
        is not distinct from p_history_reset_token
      and review.reviewed_on < p_reviewed_on
  )
  select
    pg_catalog.count(*)::integer,
    pg_catalog.count(*) filter (
      where rating = 'again' and review_number > 1
    )::integer
  into
    v_previous_review_count,
    v_previous_lapse_count
  from ordered_previous_reviews;

  v_review_count := v_previous_review_count + 1;
  v_lapse_count := v_previous_lapse_count + case
    when p_rating = 'again' and v_previous_review_count > 0 then 1
    else 0
  end;
  v_next_state := case
    when p_rating = 'again' and v_previous_review_count = 0 then 'learning'
    when p_rating = 'again' then 'relearning'
    else 'review'
  end;
  v_due_on := p_reviewed_on + p_interval_days_after;

  insert into public.practice_reviews (
    user_id,
    question_id,
    reviewed_on,
    rating,
    next_due_on,
    question_version,
    source_hash,
    history_reset_token,
    learning_state_after,
    interval_days_after,
    lapse_count_after
  ) values (
    v_user_id,
    p_question_id,
    p_reviewed_on,
    p_rating,
    v_due_on,
    p_question_version,
    p_source_hash,
    p_history_reset_token,
    v_next_state,
    p_interval_days_after,
    v_lapse_count
  )
  on conflict (user_id, question_id, reviewed_on) do update set
    rating = excluded.rating,
    next_due_on = excluded.next_due_on,
    question_version = excluded.question_version,
    source_hash = excluded.source_hash,
    history_reset_token = excluded.history_reset_token,
    learning_state_after = excluded.learning_state_after,
    interval_days_after = excluded.interval_days_after,
    lapse_count_after = excluded.lapse_count_after;

  if v_state_found
    and v_existing_last_reviewed_on is not null
    and p_reviewed_on < v_existing_last_reviewed_on then
    return pg_catalog.jsonb_build_object(
      'status', 'history_recorded',
      'rating', p_rating
    );
  end if;

  insert into public.user_question_states (
    user_id,
    question_id,
    question_version,
    source_hash,
    learning_state,
    due_on,
    interval_days,
    review_count,
    lapse_count,
    last_rating,
    last_reviewed_on,
    is_leech,
    content_changed,
    history_reset_token
  ) values (
    v_user_id,
    p_question_id,
    p_question_version,
    p_source_hash,
    v_next_state,
    v_due_on,
    p_interval_days_after,
    v_review_count,
    v_lapse_count,
    p_rating,
    p_reviewed_on,
    v_lapse_count >= 8,
    false,
    p_history_reset_token
  )
  on conflict (user_id, question_id) do update set
    question_version = excluded.question_version,
    source_hash = excluded.source_hash,
    learning_state = excluded.learning_state,
    due_on = excluded.due_on,
    interval_days = excluded.interval_days,
    review_count = excluded.review_count,
    lapse_count = excluded.lapse_count,
    last_rating = excluded.last_rating,
    last_reviewed_on = excluded.last_reviewed_on,
    is_leech = excluded.is_leech,
    content_changed = excluded.content_changed,
    history_reset_token = excluded.history_reset_token;

  return pg_catalog.jsonb_build_object(
    'status', v_status,
    'rating', p_rating
  );
end;
$$;

revoke all on function public.record_practice_review(
  text,
  integer,
  text,
  date,
  text,
  uuid,
  integer,
  text
) from public, anon, authenticated;

grant execute on function public.record_practice_review(
  text,
  integer,
  text,
  date,
  text,
  uuid,
  integer,
  text
) to authenticated;

comment on function public.record_practice_review(
  text,
  integer,
  text,
  date,
  text,
  uuid,
  integer,
  text
) is
  'Serializes one FSRS 6 daily review per account/question/content/history generation while preserving rolling-deploy compatibility.';
