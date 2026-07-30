-- Serialize every user's transitions for one question. The original function
-- checked for a same-day row before a lock existed, so two tabs/devices could
-- both calculate from stale state and race into the unique constraint.

alter table public.user_question_states
  add column if not exists history_reset_token uuid;
alter table public.practice_reviews
  add column if not exists history_reset_token uuid;

drop function public.record_practice_review(
  text,
  integer,
  text,
  date,
  text
);

create function public.record_practice_review(
  p_question_id text,
  p_question_version integer,
  p_source_hash text,
  p_reviewed_on date,
  p_rating text,
  p_history_reset_token uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_state text := 'new';
  v_due_on date;
  v_interval integer := 0;
  v_review_count integer := 0;
  v_lapse_count integer := 0;
  v_existing_version integer;
  v_existing_hash text;
  v_existing_rating text;
  v_existing_review_version integer;
  v_existing_review_hash text;
  v_existing_review_reset_token uuid;
  v_existing_last_reviewed_on date;
  v_history_reset_token uuid;
  v_next_state text;
  v_next_interval integer;
  v_daily_review_found boolean := false;
  v_state_found boolean := false;
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
    learning_state,
    due_on,
    interval_days,
    review_count,
    lapse_count,
    question_version,
    source_hash,
    last_reviewed_on,
    history_reset_token
  into
    v_state,
    v_due_on,
    v_interval,
    v_review_count,
    v_lapse_count,
    v_existing_version,
    v_existing_hash,
    v_existing_last_reviewed_on,
    v_history_reset_token
  from public.user_question_states
  where user_id = v_user_id
    and question_id = p_question_id
  for update;
  v_state_found := found;

  if v_history_reset_token is distinct from p_history_reset_token
    and (
      v_history_reset_token is not null
      or p_history_reset_token is not null
    ) then
    -- The request was created against another history generation. Return a
    -- terminal outcome so the client removes it instead of replaying a reset.
    return jsonb_build_object(
      'status', 'reset_discarded',
      'rating', p_rating
    );
  end if;

  if v_daily_review_found
    and v_existing_review_version is not distinct from p_question_version
    and v_existing_review_hash is not distinct from p_source_hash
    and v_existing_review_reset_token
      is not distinct from p_history_reset_token then
    return jsonb_build_object(
      'status', 'already_recorded',
      'rating', v_existing_rating
    );
  end if;

  if v_state_found
    and v_existing_last_reviewed_on is not null
    and p_reviewed_on < v_existing_last_reviewed_on then
    -- Preserve an offline historical event without applying its transition on
    -- top of newer state. Rebuilding the authoritative schedule backwards
    -- would otherwise move last_reviewed_on and due_on into the past.
    insert into public.practice_reviews (
      user_id,
      question_id,
      reviewed_on,
      rating,
      next_due_on,
      question_version,
      source_hash,
      history_reset_token
    ) values (
      v_user_id,
      p_question_id,
      p_reviewed_on,
      p_rating,
      p_reviewed_on + case p_rating
        when 'again' then 1
        when 'hard' then 2
        when 'good' then 4
        when 'easy' then 7
      end,
      p_question_version,
      p_source_hash,
      p_history_reset_token
    )
    on conflict (user_id, question_id, reviewed_on) do update set
      rating = excluded.rating,
      next_due_on = excluded.next_due_on,
      question_version = excluded.question_version,
      source_hash = excluded.source_hash,
      history_reset_token = excluded.history_reset_token,
      learning_state_after = null,
      interval_days_after = null,
      lapse_count_after = null;

    if not v_daily_review_found then
      -- The event belongs in the aggregate count, but applying an older
      -- transition would move the authoritative schedule backwards. Replacing
      -- an existing stale same-day row must not count the event twice.
      update public.user_question_states
      set review_count = review_count + 1
      where user_id = v_user_id
        and question_id = p_question_id;
    end if;

    return jsonb_build_object(
      'status', 'history_recorded',
      'rating', p_rating
    );
  end if;

  if not v_state_found then
    v_state := 'new';
    v_interval := 0;
    v_review_count := 0;
    v_lapse_count := 0;
  elsif v_daily_review_found
    and v_existing_last_reviewed_on = p_reviewed_on then
    -- The aggregate state already includes the stale same-day row. Replace
    -- that transition instead of counting a second review on top of it.
    v_state := 'learning';
    v_interval := 0;
    v_review_count := greatest(0, v_review_count - 1);
  elsif v_existing_hash is not null and (
    v_existing_version <> p_question_version
    or v_existing_hash <> p_source_hash
  ) then
    v_state := 'learning';
    v_interval := 0;
  end if;

  if v_state in ('new', 'learning') then
    case p_rating
      when 'again' then v_next_state := 'learning'; v_next_interval := 1;
      when 'hard' then v_next_state := 'learning'; v_next_interval := 2;
      when 'good' then v_next_state := 'review'; v_next_interval := 3;
      when 'easy' then v_next_state := 'review'; v_next_interval := 7;
    end case;
  elsif v_state = 'relearning' then
    case p_rating
      when 'again' then v_next_state := 'relearning'; v_next_interval := 1;
      when 'hard' then v_next_state := 'relearning'; v_next_interval := 2;
      when 'good' then v_next_state := 'review'; v_next_interval := 3;
      when 'easy' then v_next_state := 'review'; v_next_interval := 7;
    end case;
  else
    case p_rating
      when 'again' then
        v_next_state := 'relearning';
        v_next_interval := 1;
        v_lapse_count := v_lapse_count + 1;
      when 'hard' then
        v_next_state := 'review';
        v_next_interval := greatest(
          v_interval + 1,
          ceil(v_interval * 1.2)::integer
        );
      when 'good' then
        v_next_state := 'review';
        v_next_interval := greatest(
          v_interval + 1,
          ceil(v_interval * 2.2)::integer
        );
      when 'easy' then
        v_next_state := 'review';
        v_next_interval := greatest(
          v_interval + 2,
          ceil(v_interval * 3.2)::integer
        );
    end case;
  end if;

  v_due_on := p_reviewed_on + v_next_interval;
  v_review_count := v_review_count + 1;

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
    v_next_interval,
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
    v_next_interval,
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

  return jsonb_build_object(
    'status', 'recorded',
    'rating', p_rating
  );
end;
$$;

-- Transitional compatibility for the application version that predates
-- history generations. The finalization migration removes this overload only
-- after the generation-aware application is safe to deploy.
create function public.record_practice_review(
  p_question_id text,
  p_question_version integer,
  p_source_hash text,
  p_reviewed_on date,
  p_rating text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return public.record_practice_review(
    p_question_id,
    p_question_version,
    p_source_hash,
    p_reviewed_on,
    p_rating,
    null::uuid
  );
end;
$$;

revoke all on function public.record_practice_review(
  text,
  integer,
  text,
  date,
  text,
  uuid
) from public, anon, authenticated;

revoke all on function public.record_practice_review(
  text,
  integer,
  text,
  date,
  text
) from public, anon, authenticated;

grant execute on function public.record_practice_review(
  text,
  integer,
  text,
  date,
  text,
  uuid
) to authenticated;

grant execute on function public.record_practice_review(
  text,
  integer,
  text,
  date,
  text
) to authenticated;

comment on function public.record_practice_review(
  text,
  integer,
  text,
  date,
  text,
  uuid
) is
  'Atomically records one daily review per account/question/content/history generation, replacing stale content and preserving backdated history.';

comment on function public.record_practice_review(
  text,
  integer,
  text,
  date,
  text
) is
  'Temporary compatibility wrapper for clients deployed before durable practice-history generations.';
