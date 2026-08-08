create or replace function public.create_admin_content_question(
  p_lesson_id text,
  p_draft jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_lesson public.content_lessons%rowtype;
  v_lesson_revision public.content_lesson_revisions%rowtype;
  v_question_id text;
  v_next_suffix integer;
  v_manifest_order integer;
begin
  if not (select public.is_content_admin()) then
    raise exception 'Content admin access required' using errcode = '42501';
  end if;
  if p_lesson_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or jsonb_typeof(p_draft) <> 'object' then
    raise exception 'Invalid manual question request';
  end if;
  if (p_draft ->> 'contentChecksum') !~ '^[a-f0-9]{64}$'
    or (p_draft ->> 'sourceHash') !~ '^[a-f0-9]{64}$'
    or (p_draft ->> 'type') not in ('recall', 'code_reasoning', 'pitfall', 'scenario')
    or coalesce(p_draft ->> 'responseMode', 'text') not in ('text', 'code')
    or (p_draft ->> 'difficulty') not in ('beginner', 'intermediate', 'advanced')
    or coalesce(p_draft ->> 'estimatedMinutes', '') !~ '^[0-9]+$'
    or (p_draft ->> 'estimatedMinutes')::integer not between 1 and 15
    or char_length(btrim(coalesce(p_draft ->> 'prompt', ''))) < 10
    or char_length(btrim(coalesce(p_draft ->> 'hint', ''))) < 5
    or jsonb_typeof(p_draft -> 'answer') <> 'object'
    or char_length(btrim(coalesce(p_draft #>> '{answer,short}', ''))) < 10
    or char_length(btrim(coalesce(p_draft #>> '{answer,detailed}', ''))) < 20
    or jsonb_typeof(p_draft -> 'rubric') <> 'object'
    or jsonb_typeof(p_draft #> '{rubric,required}') <> 'array'
    or jsonb_array_length(p_draft #> '{rubric,required}') < 1
    or jsonb_typeof(p_draft -> 'sources') <> 'array'
    or jsonb_array_length(p_draft -> 'sources') < 1
    or jsonb_typeof(p_draft -> 'taxonomy') <> 'object' then
    raise exception 'Invalid manual question document';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtext('cpp-recall-admin-manual-question:' || p_lesson_id)
  );
  select * into v_lesson
  from public.content_lessons
  where id = p_lesson_id and lifecycle_status = 'active'
  for update;
  if not found then
    raise exception 'Active lesson not found';
  end if;
  if v_lesson.current_source_hash is distinct from (p_draft ->> 'sourceHash') then
    raise exception 'Manual question source is stale';
  end if;
  select * into v_lesson_revision
  from public.content_lesson_revisions
  where lesson_id = p_lesson_id and source_hash = v_lesson.current_source_hash;
  if not found then
    raise exception 'Current lesson revision not found';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_draft -> 'sources') as source(item)
    where source.item ->> 'sectionId' !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      or not exists (
        select 1
        from jsonb_array_elements(v_lesson_revision.sections) as section(item)
        where section.item ->> 'id' = source.item ->> 'sectionId'
      )
  ) then
    raise exception 'Manual question cites an unknown lesson section';
  end if;
  if p_draft #>> '{taxonomy,sourceLessonId}' is distinct from p_lesson_id then
    raise exception 'Manual question taxonomy does not match its lesson';
  end if;

  select coalesce(max(
    (substring(question.id from ('^' || p_lesson_id || '-manual-([0-9]+)$')))::integer
  ), 0)
  into v_next_suffix
  from public.content_questions as question
  where question.id ~ ('^' || p_lesson_id || '-manual-[0-9]+$');
  select greatest(1000000, coalesce(max(question.manifest_order), 0))
  into v_manifest_order
  from public.content_questions as question;
  v_question_id := p_lesson_id || '-manual-' || lpad((v_next_suffix + 1)::text, 3, '0');

  insert into public.content_questions (
    id, lesson_id, lifecycle_status, origin, archived_at, manifest_order, storage_owner
  ) values (
    v_question_id, p_lesson_id, 'draft', 'admin', null, v_manifest_order + 1, 'database'
  );
  insert into public.content_question_revisions (
    question_id, lesson_id, version, lesson_revision_id, source_hash, source_commit_sha,
    type, response_mode, difficulty, estimated_minutes, prompt, code, hint, answer,
    rubric, sources, taxonomy, content_checksum, created_by
  ) values (
    v_question_id, p_lesson_id, 1, v_lesson_revision.id, v_lesson.current_source_hash,
    v_lesson_revision.source_commit_sha, p_draft ->> 'type',
    coalesce(p_draft ->> 'responseMode', 'text'), p_draft ->> 'difficulty',
    (p_draft ->> 'estimatedMinutes')::integer, p_draft ->> 'prompt', p_draft ->> 'code',
    p_draft ->> 'hint', p_draft -> 'answer', p_draft -> 'rubric', p_draft -> 'sources',
    p_draft -> 'taxonomy', p_draft ->> 'contentChecksum', v_user_id
  );
  update public.content_questions set current_version = 1 where id = v_question_id;
  insert into public.content_question_events (
    question_id, event_type, to_version, actor_user_id, metadata
  ) values (
    v_question_id, 'generated', 1, v_user_id,
    jsonb_build_object('source', 'admin-manual', 'origin', 'admin')
  );
  return jsonb_build_object('questionId', v_question_id, 'version', 1);
end;
$$;

revoke all on function public.create_admin_content_question(text, jsonb) from public, anon;
grant execute on function public.create_admin_content_question(text, jsonb) to authenticated;
