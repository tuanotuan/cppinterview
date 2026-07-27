alter table public.coach_attempts
  add column if not exists idempotency_key uuid;

create unique index if not exists coach_attempts_user_idempotency_idx
  on public.coach_attempts (user_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.mistake_flashcard_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  generation_mode text not null default 'ask'
    check (generation_mode in ('ask', 'auto', 'off')),
  updated_at timestamptz not null default now()
);

create table if not exists public.mistake_flashcard_candidates (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_kind text not null check (source_kind in ('coach', 'mock_v4')),
  source_attempt_id text not null
    check (char_length(btrim(source_attempt_id)) between 1 and 80),
  source_question_id text not null
    check (char_length(btrim(source_question_id)) between 1 and 160),
  source_question_version integer not null check (source_question_version > 0),
  source_content_revision text not null
    check (char_length(btrim(source_content_revision)) between 1 and 128),
  lesson_id text references public.content_lessons(id) on delete restrict,
  lesson_revision_id bigint,
  source_hash text check (
    source_hash is null or source_hash ~ '^[a-f0-9]{64}$'
  ),
  source_section_ids jsonb not null default '[]'::jsonb
    check (jsonb_typeof(source_section_ids) = 'array'),
  criterion_key text not null
    check (char_length(btrim(criterion_key)) between 1 and 160),
  criterion_text text not null
    check (char_length(btrim(criterion_text)) between 3 and 500),
  concept_fingerprint text not null
    check (concept_fingerprint ~ '^[a-f0-9]{64}$'),
  safe_evidence jsonb not null default '{}'::jsonb check (
    jsonb_typeof(safe_evidence) = 'object'
    and octet_length(safe_evidence::text) <= 16384
    and not public.mock_history_has_forbidden_fields(safe_evidence)
  ),
  competency text check (
    competency is null
    or competency ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
  ),
  status text not null default 'detected' check (
    status in (
      'detected',
      'needs_grounding',
      'generating',
      'pending_review',
      'approved',
      'reinforce_existing',
      'dismissed',
      'failed',
      'dead_letter'
    )
  ),
  occurrence_count integer not null default 0 check (occurrence_count >= 0),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  lease_token uuid,
  lease_expires_at timestamptz,
  materialized_question_id text references public.content_questions(id)
    on delete restrict,
  matched_question_id text references public.content_questions(id)
    on delete restrict,
  generator_provider text,
  generator_model text,
  generator_prompt_version text,
  last_error jsonb check (
    last_error is null
    or (
      jsonb_typeof(last_error) = 'object'
      and octet_length(last_error::text) <= 8192
    )
  ),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, concept_fingerprint),
  foreign key (lesson_revision_id, lesson_id, source_hash)
    references public.content_lesson_revisions (id, lesson_id, source_hash)
    on delete restrict,
  check (
    (
      lesson_id is null
      and lesson_revision_id is null
      and source_hash is null
      and jsonb_array_length(source_section_ids) = 0
    )
    or (
      lesson_id is not null
      and lesson_revision_id is not null
      and source_hash is not null
      and jsonb_array_length(source_section_ids) > 0
    )
  ),
  check (
    (lease_token is null and lease_expires_at is null)
    or (lease_token is not null and lease_expires_at is not null)
  ),
  check (
    materialized_question_id is null
    or matched_question_id is null
  )
);

create table if not exists public.mistake_flashcard_observations (
  id bigint generated always as identity primary key,
  candidate_id uuid not null
    references public.mistake_flashcard_candidates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  evidence_fingerprint text not null
    check (evidence_fingerprint ~ '^[a-f0-9]{64}$'),
  source_kind text not null check (source_kind in ('coach', 'mock_v4')),
  source_attempt_id text not null
    check (char_length(btrim(source_attempt_id)) between 1 and 80),
  source_question_id text not null
    check (char_length(btrim(source_question_id)) between 1 and 160),
  source_question_version integer not null check (source_question_version > 0),
  signal text not null check (signal in ('missed', 'partial')),
  rating text check (
    rating is null or rating in ('again', 'hard', 'good', 'easy')
  ),
  score integer check (score is null or score between 0 and 100),
  created_at timestamptz not null default now(),
  unique (user_id, evidence_fingerprint)
);

create index if not exists mistake_candidates_user_status_idx
  on public.mistake_flashcard_candidates (
    user_id,
    status,
    last_seen_at desc
  );

create index if not exists mistake_candidates_materialized_idx
  on public.mistake_flashcard_candidates (
    user_id,
    materialized_question_id
  )
  where materialized_question_id is not null;

create index if not exists mistake_observations_candidate_idx
  on public.mistake_flashcard_observations (
    candidate_id,
    created_at desc
  );

drop trigger if exists mistake_preferences_set_updated_at
  on public.mistake_flashcard_preferences;
create trigger mistake_preferences_set_updated_at
before update on public.mistake_flashcard_preferences
for each row execute function public.set_updated_at();

drop trigger if exists mistake_candidates_set_updated_at
  on public.mistake_flashcard_candidates;
create trigger mistake_candidates_set_updated_at
before update on public.mistake_flashcard_candidates
for each row execute function public.set_updated_at();

alter table public.mistake_flashcard_preferences enable row level security;
alter table public.mistake_flashcard_candidates enable row level security;
alter table public.mistake_flashcard_observations enable row level security;

revoke all on table public.mistake_flashcard_preferences
  from public, anon, authenticated;
revoke all on table public.mistake_flashcard_candidates
  from public, anon, authenticated;
revoke all on table public.mistake_flashcard_observations
  from public, anon, authenticated;

grant select, insert, update on public.mistake_flashcard_preferences
  to authenticated;
grant select on public.mistake_flashcard_candidates to authenticated;
grant select on public.mistake_flashcard_observations to authenticated;

drop policy if exists "Users manage their own mistake preferences"
  on public.mistake_flashcard_preferences;
create policy "Users manage their own mistake preferences"
on public.mistake_flashcard_preferences
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users read their own mistake candidates"
  on public.mistake_flashcard_candidates;
create policy "Users read their own mistake candidates"
on public.mistake_flashcard_candidates
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users read their own mistake observations"
  on public.mistake_flashcard_observations;
create policy "Users read their own mistake observations"
on public.mistake_flashcard_observations
for select to authenticated
using ((select auth.uid()) = user_id);

alter table public.content_questions
  drop constraint if exists content_questions_origin_check;
alter table public.content_questions
  add constraint content_questions_origin_check check (
    origin in ('pilot', 'generated', 'admin', 'legacy_import', 'mistake')
  );

create or replace view public.content_current_questions
with (security_invoker = true)
as
select
  question.id,
  question.lesson_id,
  question.current_version as version,
  revision.type,
  revision.response_mode,
  revision.difficulty,
  revision.estimated_minutes,
  revision.prompt,
  revision.code,
  revision.hint,
  revision.answer,
  revision.rubric,
  revision.sources,
  revision.taxonomy,
  revision.source_hash,
  revision.source_commit_sha,
  revision.generator_provider,
  revision.generator_model,
  revision.generator_prompt_version,
  case
    when question.lifecycle_status = 'archived'
      or lesson.lifecycle_status = 'archived' then 'archived'
    when lesson.current_source_hash is distinct from revision.source_hash
      then 'needs_review'
    else question.lifecycle_status
  end as status,
  question.created_at,
  question.updated_at,
  question.manifest_order,
  question.storage_owner,
  question.origin
from public.content_questions as question
join public.content_question_revisions as revision
  on revision.question_id = question.id
  and revision.version = question.current_version
join public.content_lessons as lesson
  on lesson.id = question.lesson_id;

revoke all on table public.content_current_questions
  from public, anon, authenticated;
grant select on table public.content_current_questions to authenticated;

create or replace view public.content_current_repository_questions
with (security_invoker = true)
as
select *
from public.content_current_questions
where storage_owner = 'repository';

revoke all on table public.content_current_repository_questions
  from public, anon, authenticated;
grant select on table public.content_current_repository_questions
  to authenticated;

create or replace function public.record_mistake_flashcard_candidate(
  p_source_kind text,
  p_source_attempt_id text,
  p_source_question_id text,
  p_source_question_version integer,
  p_source_content_revision text,
  p_criterion_key text,
  p_criterion_text text,
  p_concept_fingerprint text,
  p_evidence_fingerprint text,
  p_signal text,
  p_rating text,
  p_score integer,
  p_safe_evidence jsonb,
  p_competency text default null,
  p_lesson_id text default null,
  p_source_hash text default null,
  p_source_section_ids jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_candidate public.mistake_flashcard_candidates%rowtype;
  v_lesson_revision_id bigint;
  v_observation_id bigint;
  v_status text;
begin
  if v_user_id is null
    or not exists (
      select 1
      from public.content_admins as admin
      where admin.user_id = v_user_id
    ) then
    raise exception 'Content admin authentication is required';
  end if;
  if p_source_kind not in ('coach', 'mock_v4')
    or char_length(btrim(p_source_attempt_id)) not between 1 and 80
    or char_length(btrim(p_source_question_id)) not between 1 and 160
    or p_source_question_version <= 0
    or char_length(btrim(p_source_content_revision)) not between 1 and 128
    or char_length(btrim(p_criterion_key)) not between 1 and 160
    or char_length(btrim(p_criterion_text)) not between 3 and 500
    or p_concept_fingerprint !~ '^[a-f0-9]{64}$'
    or p_evidence_fingerprint !~ '^[a-f0-9]{64}$'
    or p_signal not in ('missed', 'partial')
    or (p_rating is not null and p_rating not in ('again', 'hard', 'good', 'easy'))
    or (p_score is not null and p_score not between 0 and 100)
    or jsonb_typeof(p_safe_evidence) <> 'object'
    or octet_length(p_safe_evidence::text) > 16384
    or public.mock_history_has_forbidden_fields(p_safe_evidence) then
    raise exception 'Invalid mistake evidence';
  end if;

  if p_source_kind = 'coach' then
    if p_source_attempt_id !~ '^[0-9]+$'
      or not exists (
        select 1
        from public.coach_attempts as attempt
        where attempt.id = p_source_attempt_id::bigint
          and attempt.user_id = v_user_id
          and attempt.question_id = p_source_question_id
          and attempt.question_version = p_source_question_version
      ) then
      raise exception 'Coach attempt does not belong to this user';
    end if;
  elsif p_source_attempt_id !~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or not exists (
      select 1
      from public.mock_interview_attempts as attempt
      where attempt.id = p_source_attempt_id::uuid
        and attempt.user_id = v_user_id
        and attempt.status = 'completed'
    ) then
    raise exception 'Completed mock attempt does not belong to this user';
  end if;

  if p_lesson_id is null then
    if p_source_hash is not null
      or jsonb_typeof(p_source_section_ids) <> 'array'
      or jsonb_array_length(p_source_section_ids) <> 0 then
      raise exception 'Ungrounded evidence cannot claim lesson sources';
    end if;
    v_status := 'needs_grounding';
  else
    if p_source_hash !~ '^[a-f0-9]{64}$'
      or jsonb_typeof(p_source_section_ids) <> 'array'
      or jsonb_array_length(p_source_section_ids) = 0 then
      raise exception 'Grounded evidence requires source sections';
    end if;
    select revision.id
    into v_lesson_revision_id
    from public.content_lessons as lesson
    join public.content_lesson_revisions as revision
      on revision.lesson_id = lesson.id
      and revision.source_hash = lesson.current_source_hash
    where lesson.id = p_lesson_id
      and lesson.lifecycle_status = 'active'
      and lesson.current_source_hash = p_source_hash;
    if not found or exists (
      select 1
      from jsonb_array_elements_text(p_source_section_ids) as source(section_id)
      where not exists (
        select 1
        from public.content_lesson_revisions as revision,
          jsonb_array_elements(revision.sections) as section(item)
        where revision.id = v_lesson_revision_id
          and section.item ->> 'id' = source.section_id
      )
    ) then
      raise exception 'Mistake evidence cites a stale or unknown lesson section';
    end if;
    v_status := 'detected';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || p_concept_fingerprint, 0)
  );

  select *
  into v_candidate
  from public.mistake_flashcard_candidates
  where user_id = v_user_id
    and concept_fingerprint = p_concept_fingerprint
  for update;

  if not found then
    insert into public.mistake_flashcard_candidates (
      user_id,
      source_kind,
      source_attempt_id,
      source_question_id,
      source_question_version,
      source_content_revision,
      lesson_id,
      lesson_revision_id,
      source_hash,
      source_section_ids,
      criterion_key,
      criterion_text,
      concept_fingerprint,
      safe_evidence,
      competency,
      status
    ) values (
      v_user_id,
      p_source_kind,
      p_source_attempt_id,
      p_source_question_id,
      p_source_question_version,
      p_source_content_revision,
      p_lesson_id,
      v_lesson_revision_id,
      p_source_hash,
      p_source_section_ids,
      p_criterion_key,
      p_criterion_text,
      p_concept_fingerprint,
      p_safe_evidence,
      p_competency,
      v_status
    )
    returning * into v_candidate;
  elsif v_candidate.status not in (
    'dismissed',
    'approved',
    'pending_review',
    'reinforce_existing'
  ) then
    update public.mistake_flashcard_candidates
    set safe_evidence = p_safe_evidence,
        competency = coalesce(p_competency, competency),
        lesson_id = coalesce(lesson_id, p_lesson_id),
        lesson_revision_id = coalesce(lesson_revision_id, v_lesson_revision_id),
        source_hash = coalesce(source_hash, p_source_hash),
        source_section_ids = case
          when jsonb_array_length(source_section_ids) = 0
            then p_source_section_ids
          else source_section_ids
        end,
        status = case
          when status = 'needs_grounding' and p_lesson_id is not null
            then 'detected'
          else status
        end
    where id = v_candidate.id
    returning * into v_candidate;
  end if;

  insert into public.mistake_flashcard_observations (
    candidate_id,
    user_id,
    evidence_fingerprint,
    source_kind,
    source_attempt_id,
    source_question_id,
    source_question_version,
    signal,
    rating,
    score
  ) values (
    v_candidate.id,
    v_user_id,
    p_evidence_fingerprint,
    p_source_kind,
    p_source_attempt_id,
    p_source_question_id,
    p_source_question_version,
    p_signal,
    p_rating,
    p_score
  )
  on conflict (user_id, evidence_fingerprint) do nothing
  returning id into v_observation_id;

  if v_observation_id is not null then
    update public.mistake_flashcard_candidates
    set occurrence_count = occurrence_count + 1,
        last_seen_at = now()
    where id = v_candidate.id
    returning * into v_candidate;
  end if;

  return jsonb_build_object(
    'id', v_candidate.id,
    'status', v_candidate.status,
    'occurrenceCount', v_candidate.occurrence_count,
    'isNewObservation', v_observation_id is not null,
    'materializedQuestionId', v_candidate.materialized_question_id,
    'matchedQuestionId', v_candidate.matched_question_id
  );
end;
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
    'dismissed'
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

create or replace function public.complete_mistake_flashcard_candidate(
  p_candidate_id uuid,
  p_lease_token uuid,
  p_draft jsonb,
  p_provider text,
  p_model text,
  p_prompt_version text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_candidate public.mistake_flashcard_candidates%rowtype;
  v_lesson public.content_lessons%rowtype;
  v_lesson_revision public.content_lesson_revisions%rowtype;
  v_next_suffix integer;
  v_manifest_order integer;
  v_question_id text;
begin
  if v_user_id is null
    or not exists (
      select 1 from public.content_admins as admin
      where admin.user_id = v_user_id
    )
    or p_candidate_id is null
    or p_lease_token is null
    or jsonb_typeof(p_draft) <> 'object'
    or char_length(btrim(p_provider)) = 0
    or char_length(btrim(p_model)) = 0
    or char_length(btrim(p_prompt_version)) = 0 then
    raise exception 'Invalid mistake draft completion';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('cpp-recall-mistake-question-generation')
  );

  select *
  into v_candidate
  from public.mistake_flashcard_candidates
  where id = p_candidate_id
    and user_id = v_user_id
  for update;
  if not found
    or v_candidate.status <> 'generating'
    or v_candidate.lease_token is distinct from p_lease_token
    or v_candidate.lease_expires_at <= now() then
    raise exception 'Mistake generation lease is invalid or expired';
  end if;
  if v_candidate.lesson_id is null
    or v_candidate.lesson_revision_id is null
    or v_candidate.source_hash is null then
    raise exception 'Mistake candidate is not grounded';
  end if;

  select *
  into v_lesson
  from public.content_lessons
  where id = v_candidate.lesson_id
  for update;
  select *
  into v_lesson_revision
  from public.content_lesson_revisions
  where id = v_candidate.lesson_revision_id;
  if not found
    or v_lesson.lifecycle_status <> 'active'
    or v_lesson.current_source_hash is distinct from v_candidate.source_hash
    or v_lesson_revision.source_hash is distinct from v_candidate.source_hash then
    update public.mistake_flashcard_candidates
    set status = 'needs_grounding',
        lease_token = null,
        lease_expires_at = null,
        last_error = jsonb_build_object('code', 'stale_source')
    where id = v_candidate.id;
    return jsonb_build_object('id', v_candidate.id, 'status', 'needs_grounding');
  end if;

  if (p_draft ->> 'contentChecksum') !~ '^[a-f0-9]{64}$'
    or (p_draft ->> 'type') not in ('recall', 'code_reasoning', 'pitfall', 'scenario')
    or coalesce(p_draft ->> 'responseMode', 'text') not in ('text', 'code')
    or (p_draft ->> 'difficulty') not in ('beginner', 'intermediate', 'advanced')
    or (p_draft ->> 'estimatedMinutes')::integer not between 1 and 15
    or char_length(btrim(p_draft ->> 'prompt')) < 10
    or char_length(btrim(p_draft ->> 'hint')) < 5
    or jsonb_typeof(p_draft -> 'answer') <> 'object'
    or jsonb_typeof(p_draft -> 'rubric') <> 'object'
    or jsonb_typeof(p_draft -> 'sources') <> 'array'
    or jsonb_array_length(p_draft -> 'sources') = 0
    or jsonb_typeof(p_draft -> 'taxonomy') <> 'object' then
    raise exception 'Invalid generated mistake question';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_draft -> 'sources') as source(item)
    where not exists (
      select 1
      from jsonb_array_elements(v_lesson_revision.sections) as section(item)
      where section.item ->> 'id' = source.item ->> 'sectionId'
        and source.item ->> 'sectionId' in (
          select jsonb_array_elements_text(v_candidate.source_section_ids)
        )
    )
  ) then
    raise exception 'Generated mistake question cites an unknown section';
  end if;

  select coalesce(max(
    (
      substring(
        question.id
        from ('^' || v_candidate.lesson_id || '-mistake-([0-9]+)$')
      )
    )::integer
  ), 0)
  into v_next_suffix
  from public.content_questions as question
  where question.id ~ (
    '^' || v_candidate.lesson_id || '-mistake-[0-9]+$'
  );

  select greatest(1000000, coalesce(max(question.manifest_order), 0))
  into v_manifest_order
  from public.content_questions as question;

  v_question_id := v_candidate.lesson_id || '-mistake-' ||
    lpad((v_next_suffix + 1)::text, 3, '0');

  insert into public.content_questions (
    id,
    lesson_id,
    lifecycle_status,
    origin,
    archived_at,
    manifest_order,
    storage_owner
  ) values (
    v_question_id,
    v_candidate.lesson_id,
    'draft',
    'mistake',
    null,
    v_manifest_order + 1,
    'database'
  );

  insert into public.content_question_revisions (
    question_id,
    lesson_id,
    version,
    lesson_revision_id,
    source_hash,
    source_commit_sha,
    type,
    response_mode,
    difficulty,
    estimated_minutes,
    prompt,
    code,
    hint,
    answer,
    rubric,
    sources,
    taxonomy,
    content_checksum,
    generator_provider,
    generator_model,
    generator_prompt_version,
    created_by
  ) values (
    v_question_id,
    v_candidate.lesson_id,
    1,
    v_lesson_revision.id,
    v_candidate.source_hash,
    v_lesson_revision.source_commit_sha,
    p_draft ->> 'type',
    coalesce(p_draft ->> 'responseMode', 'text'),
    p_draft ->> 'difficulty',
    (p_draft ->> 'estimatedMinutes')::integer,
    p_draft ->> 'prompt',
    p_draft ->> 'code',
    p_draft ->> 'hint',
    p_draft -> 'answer',
    p_draft -> 'rubric',
    p_draft -> 'sources',
    p_draft -> 'taxonomy',
    p_draft ->> 'contentChecksum',
    p_provider,
    p_model,
    p_prompt_version,
    v_user_id
  );

  update public.content_questions
  set current_version = 1
  where id = v_question_id;

  insert into public.content_question_events (
    question_id,
    event_type,
    to_version,
    actor_user_id,
    metadata
  ) values (
    v_question_id,
    'generated',
    1,
    v_user_id,
    jsonb_build_object(
      'source', 'mistake-remediation',
      'candidateId', v_candidate.id,
      'sourceKind', v_candidate.source_kind
    )
  );

  update public.mistake_flashcard_candidates
  set status = 'pending_review',
      materialized_question_id = v_question_id,
      generator_provider = p_provider,
      generator_model = p_model,
      generator_prompt_version = p_prompt_version,
      lease_token = null,
      lease_expires_at = null,
      last_error = null
  where id = v_candidate.id;

  return jsonb_build_object(
    'id', v_candidate.id,
    'status', 'pending_review',
    'questionId', v_question_id
  );
end;
$$;

create or replace function public.fail_mistake_flashcard_candidate(
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
  v_status text;
begin
  if v_user_id is null
    or p_candidate_id is null
    or p_lease_token is null
    or p_error_code !~ '^[a-z0-9]+(_[a-z0-9]+)*$' then
    raise exception 'Invalid mistake generation failure';
  end if;
  update public.mistake_flashcard_candidates
  set status = case
        when attempt_count >= 5 then 'dead_letter'
        else 'failed'
      end,
      lease_token = null,
      lease_expires_at = null,
      last_error = jsonb_build_object('code', p_error_code)
  where id = p_candidate_id
    and user_id = v_user_id
    and status = 'generating'
    and lease_token = p_lease_token
  returning status into v_status;
  return jsonb_build_object(
    'id', p_candidate_id,
    'status', coalesce(v_status, 'lease_invalid')
  );
end;
$$;

create or replace function public.resolve_mistake_flashcard_candidate(
  p_candidate_id uuid,
  p_action text,
  p_matched_question_id text default null
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
    or p_action not in ('dismiss', 'reinforce_existing') then
    raise exception 'Invalid mistake candidate resolution';
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
  if p_action = 'reinforce_existing' then
    if p_matched_question_id is null
      or not exists (
        select 1
        from public.content_questions as question
        where question.id = p_matched_question_id
          and question.lifecycle_status <> 'archived'
      ) then
      raise exception 'A current question is required';
    end if;
    update public.mistake_flashcard_candidates
    set status = 'reinforce_existing',
        matched_question_id = p_matched_question_id,
        materialized_question_id = null,
        lease_token = null,
        lease_expires_at = null
    where id = v_candidate.id;
  else
    if v_candidate.materialized_question_id is not null then
      update public.content_questions
      set lifecycle_status = 'archived',
          archived_at = now()
      where id = v_candidate.materialized_question_id
        and origin = 'mistake'
        and lifecycle_status = 'draft';
      insert into public.content_question_events (
        question_id,
        event_type,
        from_version,
        actor_user_id,
        metadata
      )
      select
        question.id,
        'archived',
        question.current_version,
        v_user_id,
        jsonb_build_object(
          'source', 'mistake-remediation',
          'candidateId', v_candidate.id
        )
      from public.content_questions as question
      where question.id = v_candidate.materialized_question_id
        and question.lifecycle_status = 'archived';
    end if;
    update public.mistake_flashcard_candidates
    set status = 'dismissed',
        lease_token = null,
        lease_expires_at = null
    where id = v_candidate.id;
  end if;
  return jsonb_build_object('id', v_candidate.id, 'status', p_action);
end;
$$;

create or replace function public.ground_mistake_flashcard_candidate(
  p_candidate_id uuid,
  p_lesson_id text,
  p_source_section_ids jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_lesson public.content_lessons%rowtype;
  v_revision public.content_lesson_revisions%rowtype;
  v_updated_id uuid;
begin
  if v_user_id is null
    or jsonb_typeof(p_source_section_ids) <> 'array'
    or jsonb_array_length(p_source_section_ids) = 0 then
    raise exception 'Invalid mistake grounding request';
  end if;
  select * into v_lesson
  from public.content_lessons
  where id = p_lesson_id and lifecycle_status = 'active';
  if not found then raise exception 'Active lesson not found'; end if;
  select * into v_revision
  from public.content_lesson_revisions
  where lesson_id = v_lesson.id
    and source_hash = v_lesson.current_source_hash;
  if not found or exists (
    select 1
    from jsonb_array_elements_text(p_source_section_ids) as source(section_id)
    where not exists (
      select 1
      from jsonb_array_elements(v_revision.sections) as section(item)
      where section.item ->> 'id' = source.section_id
    )
  ) then
    raise exception 'Unknown lesson section';
  end if;
  update public.mistake_flashcard_candidates
  set lesson_id = v_lesson.id,
      lesson_revision_id = v_revision.id,
      source_hash = v_lesson.current_source_hash,
      source_section_ids = p_source_section_ids,
      status = 'detected',
      last_error = null
  where id = p_candidate_id
    and user_id = v_user_id
    and status in ('needs_grounding', 'failed')
  returning id into v_updated_id;
  if v_updated_id is null then
    raise exception 'Groundable mistake candidate not found';
  end if;
  return jsonb_build_object('id', v_updated_id, 'status', 'detected');
end;
$$;

create or replace function public.sync_mistake_candidate_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.mistake_flashcard_candidates
    set status = 'pending_review'
    where user_id = old.user_id
      and materialized_question_id = old.question_id
      and status = 'approved';
    return old;
  end if;
  update public.mistake_flashcard_candidates
  set status = 'approved'
  where user_id = new.user_id
    and materialized_question_id = new.question_id;
  return new;
end;
$$;

drop trigger if exists question_approvals_sync_mistake_candidate
  on public.question_approvals;
create trigger question_approvals_sync_mistake_candidate
after insert or update or delete on public.question_approvals
for each row execute function public.sync_mistake_candidate_approval();

revoke all on function public.record_mistake_flashcard_candidate(
  text, text, text, integer, text, text, text, text, text, text, text,
  integer, jsonb, text, text, text, jsonb
) from public, anon;
revoke all on function public.claim_mistake_flashcard_candidate(uuid, integer)
  from public, anon;
revoke all on function public.complete_mistake_flashcard_candidate(
  uuid, uuid, jsonb, text, text, text
) from public, anon;
revoke all on function public.fail_mistake_flashcard_candidate(
  uuid, uuid, text
) from public, anon;
revoke all on function public.resolve_mistake_flashcard_candidate(
  uuid, text, text
) from public, anon;
revoke all on function public.ground_mistake_flashcard_candidate(
  uuid, text, jsonb
) from public, anon;

grant execute on function public.record_mistake_flashcard_candidate(
  text, text, text, integer, text, text, text, text, text, text, text,
  integer, jsonb, text, text, text, jsonb
) to authenticated;
grant execute on function public.claim_mistake_flashcard_candidate(uuid, integer)
  to authenticated;
grant execute on function public.complete_mistake_flashcard_candidate(
  uuid, uuid, jsonb, text, text, text
) to authenticated;
grant execute on function public.fail_mistake_flashcard_candidate(
  uuid, uuid, text
) to authenticated;
grant execute on function public.resolve_mistake_flashcard_candidate(
  uuid, text, text
) to authenticated;
grant execute on function public.ground_mistake_flashcard_candidate(
  uuid, text, jsonb
) to authenticated;

comment on table public.mistake_flashcard_candidates is
  'Owner-private, deduplicated misconception queue. Generated cards remain inactive until exact owner approval.';
comment on table public.mistake_flashcard_observations is
  'Append-only safe evidence for repeated mistakes; never stores candidate answers or hidden runner data.';
