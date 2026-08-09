-- Manual questions are deliberately database-native: an administrator provides
-- only a prompt and a reference answer, never a repository lesson or .md section.
-- Keep their synthetic lesson active when repository synchronization archives
-- lessons that are absent from the Git manifest.
create or replace function public.keep_standalone_manual_lesson_active()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.id = 'admin-manual-questions'
    and new.lifecycle_status = 'archived' then
    new.lifecycle_status = 'active';
    new.archived_at = null;
    new.manifest_order = coalesce(old.manifest_order, 1000000);
  end if;
  return new;
end;
$$;

drop trigger if exists content_lessons_keep_standalone_manual_active
  on public.content_lessons;
create trigger content_lessons_keep_standalone_manual_active
before update on public.content_lessons
for each row execute function public.keep_standalone_manual_lesson_active();

revoke all on function public.keep_standalone_manual_lesson_active()
  from public, anon, authenticated;

create or replace function public.create_standalone_admin_content_question(
  p_draft jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_lesson_id constant text := 'admin-manual-questions';
  v_section_id constant text := 'admin-entry';
  v_source_hash constant text := '0505028173d1f586e2889d1d107f7b3d371a013cc18b9e0ed8d3c13c4cb3259c';
  v_lesson_revision public.content_lesson_revisions%rowtype;
  v_question_id text;
  v_next_suffix integer;
  v_manifest_order integer;
begin
  if not (select public.is_content_admin()) then
    raise exception 'Content admin access required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_draft) <> 'object'
    or (p_draft ->> 'contentChecksum') !~ '^[a-f0-9]{64}$'
    or (p_draft ->> 'sourceHash') is distinct from v_source_hash
    or (p_draft ->> 'type') <> 'recall'
    or coalesce(p_draft ->> 'responseMode', 'text') <> 'text'
    or (p_draft ->> 'difficulty') <> 'intermediate'
    or (p_draft ->> 'estimatedMinutes') <> '3'
    or char_length(btrim(coalesce(p_draft ->> 'prompt', ''))) < 10
    or char_length(btrim(coalesce(p_draft ->> 'hint', ''))) < 5
    or jsonb_typeof(p_draft -> 'answer') <> 'object'
    or char_length(btrim(coalesce(p_draft #>> '{answer,short}', ''))) < 10
    or char_length(btrim(coalesce(p_draft #>> '{answer,detailed}', ''))) < 20
    or jsonb_typeof(p_draft -> 'rubric') <> 'object'
    or jsonb_typeof(p_draft #> '{rubric,required}') <> 'array'
    or jsonb_array_length(p_draft #> '{rubric,required}') < 1
    or p_draft -> 'sources' is distinct from jsonb_build_array(
      jsonb_build_object('sectionId', v_section_id)
    )
    or p_draft #>> '{taxonomy,sourceLessonId}' is distinct from v_lesson_id then
    raise exception 'Invalid standalone manual question document';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtext('cpp-recall-standalone-admin-manual-question')
  );

  insert into public.content_lessons (
    id, current_source_hash, lifecycle_status, archived_at, manifest_order,
    current_source_path, current_standard, current_lesson_order, current_tags,
    current_prerequisites
  ) values (
    v_lesson_id, null, 'active', null, 1000000,
    'admin/manual-questions', 'cpp20', 1000000, '["manual"]'::jsonb,
    '[]'::jsonb
  ) on conflict (id) do update
  set lifecycle_status = 'active',
      archived_at = null,
      manifest_order = 1000000,
      current_source_path = excluded.current_source_path,
      current_standard = excluded.current_standard,
      current_lesson_order = excluded.current_lesson_order,
      current_tags = excluded.current_tags,
      current_prerequisites = excluded.current_prerequisites;

  insert into public.content_lesson_revisions (
    lesson_id, source_hash, source_commit_sha, source_path, standard,
    lesson_order, title, tags, prerequisites, knowledge_markdown, code,
    sections, checklist_items, imported_from
  ) values (
    v_lesson_id, v_source_hash, null, 'admin/manual-questions', 'cpp20',
    1000000, 'Câu hỏi nhập thủ công', '["manual"]'::jsonb, '[]'::jsonb,
    '', null,
    jsonb_build_array(jsonb_build_object(
      'id', v_section_id,
      'heading', 'Câu hỏi độc lập do quản trị viên nhập',
      'bodyMarkdown', '',
      'bodyText', ''
    )),
    '[]'::jsonb, 'legacy_import'
  ) on conflict (lesson_id, source_hash) do nothing;

  update public.content_lessons
  set current_source_hash = v_source_hash,
      lifecycle_status = 'active',
      archived_at = null,
      manifest_order = 1000000
  where id = v_lesson_id;

  select * into v_lesson_revision
  from public.content_lesson_revisions
  where lesson_id = v_lesson_id and source_hash = v_source_hash;

  select coalesce(max(
    (substring(question.id from '^admin-manual-questions-([0-9]+)$'))::integer
  ), 0)
  into v_next_suffix
  from public.content_questions as question
  where question.id ~ '^admin-manual-questions-[0-9]+$';
  select greatest(1000000, coalesce(max(question.manifest_order), 0))
  into v_manifest_order
  from public.content_questions as question;
  v_question_id := v_lesson_id || '-' || lpad((v_next_suffix + 1)::text, 3, '0');

  insert into public.content_questions (
    id, lesson_id, lifecycle_status, origin, archived_at, manifest_order, storage_owner
  ) values (
    v_question_id, v_lesson_id, 'draft', 'admin', null, v_manifest_order + 1, 'database'
  );
  insert into public.content_question_revisions (
    question_id, lesson_id, version, lesson_revision_id, source_hash, source_commit_sha,
    type, response_mode, difficulty, estimated_minutes, prompt, code, hint, answer,
    rubric, sources, taxonomy, content_checksum, created_by
  ) values (
    v_question_id, v_lesson_id, 1, v_lesson_revision.id, v_source_hash,
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
    jsonb_build_object('source', 'admin-manual-standalone', 'origin', 'admin')
  );

  return jsonb_build_object('questionId', v_question_id, 'version', 1);
end;
$$;

revoke all on function public.create_standalone_admin_content_question(jsonb)
  from public, anon;
grant execute on function public.create_standalone_admin_content_question(jsonb)
  to authenticated;
