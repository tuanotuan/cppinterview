-- A rejection is an irreversible publication decision, not an archive. Keep a
-- small tombstone so repository sync cannot make the question visible again.
create table public.content_question_rejections (
  question_id text primary key check (
    question_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and char_length(question_id) <= 160
  ),
  question_version integer not null check (question_version > 0),
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  rejected_by uuid not null references auth.users(id) on delete restrict,
  rejected_at timestamptz not null default now()
);

create index content_question_rejections_rejected_by_idx
  on public.content_question_rejections (rejected_by);

create index mistake_candidates_rejected_materialized_idx
  on public.mistake_flashcard_candidates (materialized_question_id)
  where materialized_question_id is not null;

create index mistake_candidates_rejected_matched_idx
  on public.mistake_flashcard_candidates (matched_question_id)
  where matched_question_id is not null;

alter table public.content_question_rejections enable row level security;

revoke all on table public.content_question_rejections
  from public, anon, authenticated;
grant all on table public.content_question_rejections to service_role;

create or replace function public.list_rejected_content_question_ids()
returns table(question_id text)
language sql
stable
security definer
set search_path = ''
as $$
  select rejection.question_id
  from public.content_question_rejections as rejection
  where (select auth.uid()) is not null
$$;

revoke all on function public.list_rejected_content_question_ids()
  from public, anon, authenticated;
grant execute on function public.list_rejected_content_question_ids()
  to authenticated, service_role;

create or replace function public.reject_queued_content_question(
  p_question_id text,
  p_question_version integer,
  p_source_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_current_version integer;
  v_lifecycle_status text;
  v_revision_source_hash text;
  v_lesson_source_hash text;
  v_override_matches boolean := false;
  v_inserted integer := 0;
begin
  if v_actor is null or not (select public.is_content_admin()) then
    raise exception 'Content admin authorization required'
      using errcode = '42501';
  end if;
  if p_question_id is null
    or p_question_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or char_length(p_question_id) > 160
    or p_question_version is null
    or p_question_version <= 0
    or p_source_hash is null
    or p_source_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid queued question rejection';
  end if;

  if exists (
    select 1
    from public.content_question_rejections as rejection
    where rejection.question_id = p_question_id
  ) then
    return jsonb_build_object(
      'status', 'already_rejected',
      'questionId', p_question_id
    );
  end if;

  -- Candidate resolution takes this lock before it can update a content
  -- question. Use the same order here to avoid a question/candidate deadlock.
  perform 1
  from public.mistake_flashcard_candidates as candidate
  where candidate.materialized_question_id = p_question_id
     or candidate.matched_question_id = p_question_id
  for update;

  select
    question.current_version,
    question.lifecycle_status,
    revision.source_hash,
    lesson.current_source_hash
  into
    v_current_version,
    v_lifecycle_status,
    v_revision_source_hash,
    v_lesson_source_hash
  from public.content_questions as question
  join public.content_question_revisions as revision
    on revision.question_id = question.id
    and revision.version = question.current_version
  join public.content_lessons as lesson
    on lesson.id = question.lesson_id
  where question.id = p_question_id
  for update of question;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  select exists (
    select 1
    from public.question_overrides as override
    where override.user_id = v_actor
      and override.question_id = p_question_id
      and override.question_version = p_question_version
      and override.source_hash = p_source_hash
      and override.is_edited
      and not override.is_archived
  ) into v_override_matches;

  if not (
    (
      v_current_version = p_question_version
      and v_revision_source_hash = p_source_hash
    )
    or v_override_matches
  ) then
    return jsonb_build_object('status', 'version_conflict');
  end if;

  if not (
    v_lifecycle_status = 'draft'
    or v_override_matches
    or (
      v_lifecycle_status = 'verified'
      and v_lesson_source_hash is distinct from v_revision_source_hash
    )
  ) then
    return jsonb_build_object('status', 'not_pending');
  end if;

  if exists (
    select 1
    from public.question_approvals as approval
    where approval.user_id = v_actor
      and approval.question_id = p_question_id
      and approval.question_version = p_question_version
      and approval.source_hash = p_source_hash
  ) then
    return jsonb_build_object('status', 'not_pending');
  end if;

  insert into public.content_question_rejections (
    question_id,
    question_version,
    source_hash,
    rejected_by
  ) values (
    p_question_id,
    p_question_version,
    p_source_hash,
    v_actor
  ) on conflict (question_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return jsonb_build_object(
      'status', 'already_rejected',
      'questionId', p_question_id
    );
  end if;

  -- A generated remediation candidate must not keep pointing at content that
  -- has left the bank permanently.
  update public.mistake_flashcard_candidates
  set status = 'dismissed',
      materialized_question_id = null,
      matched_question_id = null,
      lease_token = null,
      lease_expires_at = null
  where materialized_question_id = p_question_id
     or matched_question_id = p_question_id;

  return jsonb_build_object(
    'status', 'rejected',
    'questionId', p_question_id
  );
end;
$$;

revoke all on function public.reject_queued_content_question(
  text, integer, text
) from public, anon, authenticated;
grant execute on function public.reject_queued_content_question(
  text, integer, text
) to authenticated, service_role;

comment on table public.content_question_rejections is
  'Irreversible question-bank rejection tombstones. Source and revision history remain append-only for audit.';
