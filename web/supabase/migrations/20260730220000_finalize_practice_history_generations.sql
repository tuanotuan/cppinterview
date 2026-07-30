-- Finalize durable practice-history generations after the generation-aware
-- application has been deployed. Migration 2000 is the expand/compatibility
-- stage; this migration rotates generations only when an explicit reset runs.

update public.user_question_states
set history_reset_token = extensions.gen_random_uuid()
where history_reset_token is null;

update public.practice_reviews as review
set history_reset_token = state.history_reset_token
from public.user_question_states as state
where state.user_id = review.user_id
  and state.question_id = review.question_id
  and review.history_reset_token is null;

drop trigger if exists practice_reviews_clear_history_reset
  on public.practice_reviews;

drop function if exists public.clear_question_history_reset_on();

create or replace function public.manage_question_schedule(
  p_question_id text,
  p_question_version integer,
  p_source_hash text,
  p_action text,
  p_due_on date default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_state text;
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
  if p_action is null
    or p_action not in ('suspend', 'unsuspend', 'reset', 'reschedule') then
    raise exception 'Invalid schedule action';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_user_id::text || ':' || p_question_id,
      2026073020
    )
  );

  select learning_state
  into v_state
  from public.user_question_states
  where user_id = v_user_id
    and question_id = p_question_id
  for update;

  if not found then
    insert into public.user_question_states (
      user_id,
      question_id,
      question_version,
      source_hash,
      learning_state,
      history_reset_token
    ) values (
      v_user_id,
      p_question_id,
      p_question_version,
      p_source_hash,
      'new',
      extensions.gen_random_uuid()
    );
    v_state := 'new';
  end if;

  if p_action = 'suspend' then
    update public.user_question_states
    set
      is_suspended = true,
      question_version = p_question_version,
      source_hash = p_source_hash
    where user_id = v_user_id
      and question_id = p_question_id;
  elsif p_action = 'unsuspend' then
    update public.user_question_states
    set
      is_suspended = false,
      question_version = p_question_version,
      source_hash = p_source_hash
    where user_id = v_user_id
      and question_id = p_question_id;
  elsif p_action = 'reschedule' then
    if v_state = 'new' then
      raise exception 'New questions do not have a due date';
    end if;
    if p_due_on is null then
      raise exception 'A due date is required';
    end if;
    update public.user_question_states
    set
      due_on = p_due_on,
      question_version = p_question_version,
      source_hash = p_source_hash
    where user_id = v_user_id
      and question_id = p_question_id;
  else
    delete from public.practice_reviews
    where user_id = v_user_id
      and question_id = p_question_id;

    update public.user_question_states
    set
      question_version = p_question_version,
      source_hash = p_source_hash,
      learning_state = 'new',
      due_on = null,
      interval_days = 0,
      review_count = 0,
      lapse_count = 0,
      last_rating = null,
      last_reviewed_on = null,
      is_suspended = false,
      is_leech = false,
      content_changed = false,
      history_reset_on =
        (now() at time zone 'Asia/Ho_Chi_Minh')::date,
      history_reset_token = extensions.gen_random_uuid()
    where user_id = v_user_id
      and question_id = p_question_id;
  end if;
end;
$$;

revoke all on function public.record_practice_review(
  text,
  integer,
  text,
  date,
  text
) from public, anon, authenticated;

drop function public.record_practice_review(
  text,
  integer,
  text,
  date,
  text
);

comment on function public.manage_question_schedule(
  text,
  integer,
  text,
  text,
  date
) is
  'Serializes schedule mutations with review writes and rotates the durable history generation only on reset.';
