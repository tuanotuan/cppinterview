-- Locale overlays are revision-bound display data. They never replace the
-- canonical source hash/version used by approvals and learning history.
create table public.content_lesson_translations (
  lesson_revision_id bigint not null,
  lesson_id text not null,
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  locale text not null check (locale in ('vi', 'en')),
  title text not null check (char_length(btrim(title)) > 0),
  sections jsonb not null check (
    jsonb_typeof(sections) = 'array'
    and jsonb_array_length(sections) > 0
  ),
  checklist_items jsonb not null default '[]'::jsonb check (
    jsonb_typeof(checklist_items) = 'array'
  ),
  translation_status text not null default 'draft' check (
    translation_status in ('draft', 'verified', 'archived')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (lesson_revision_id, locale),
  unique (lesson_id, source_hash, locale),
  foreign key (lesson_revision_id, lesson_id, source_hash)
    references public.content_lesson_revisions (id, lesson_id, source_hash)
    on delete restrict
);

create index content_lesson_translations_revision_fk_idx
  on public.content_lesson_translations (
    lesson_revision_id,
    lesson_id,
    source_hash
  );

create index content_lesson_translations_verified_locale_idx
  on public.content_lesson_translations (locale, lesson_id)
  where translation_status = 'verified';

alter table public.content_question_revisions
  add constraint content_question_revisions_translation_revision_key
  unique (question_id, version, source_hash);

create table public.content_question_translations (
  question_id text not null,
  question_version integer not null check (question_version > 0),
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  locale text not null check (locale in ('vi', 'en')),
  prompt text not null check (char_length(btrim(prompt)) >= 10),
  hint text not null check (char_length(btrim(hint)) >= 5),
  answer jsonb not null check (jsonb_typeof(answer) = 'object'),
  rubric jsonb not null check (jsonb_typeof(rubric) = 'object'),
  translation_status text not null default 'draft' check (
    translation_status in ('draft', 'verified', 'archived')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (question_id, question_version, locale),
  foreign key (question_id, question_version, source_hash)
    references public.content_question_revisions (
      question_id,
      version,
      source_hash
    )
    on delete restrict
);

create index content_question_translations_verified_locale_idx
  on public.content_question_translations (locale, question_id)
  where translation_status = 'verified';

alter table public.content_lesson_translations enable row level security;
alter table public.content_question_translations enable row level security;

create policy "Authenticated users read verified lesson translations"
on public.content_lesson_translations
for select
to authenticated
using (
  translation_status = 'verified'
  and exists (
    select 1
    from public.content_lessons as lesson
    where lesson.id = content_lesson_translations.lesson_id
      and lesson.current_source_hash = content_lesson_translations.source_hash
      and lesson.lifecycle_status = 'active'
  )
);

create policy "Authenticated users read verified question translations"
on public.content_question_translations
for select
to authenticated
using (
  translation_status = 'verified'
  and exists (
    select 1
    from public.content_questions as question
    join public.content_question_revisions as revision
      on revision.question_id = question.id
      and revision.version = question.current_version
    where question.id = content_question_translations.question_id
      and question.current_version =
        content_question_translations.question_version
      and revision.source_hash = content_question_translations.source_hash
      and question.lifecycle_status <> 'archived'
  )
);

revoke all on table public.content_lesson_translations
  from public, anon, authenticated;
revoke all on table public.content_question_translations
  from public, anon, authenticated;
grant select on table public.content_lesson_translations to authenticated;
grant select on table public.content_question_translations to authenticated;
grant all on table public.content_lesson_translations to service_role;
grant all on table public.content_question_translations to service_role;

create view public.content_current_lesson_translations
with (security_invoker = true)
as
select
  translation.lesson_id,
  translation.lesson_revision_id,
  translation.source_hash,
  translation.locale,
  translation.title,
  translation.sections,
  translation.checklist_items
from public.content_lesson_translations as translation
join public.content_lessons as lesson
  on lesson.id = translation.lesson_id
  and lesson.current_source_hash = translation.source_hash
where lesson.lifecycle_status = 'active'
  and translation.translation_status = 'verified';

create view public.content_current_question_translations
with (security_invoker = true)
as
select
  translation.question_id,
  translation.question_version,
  translation.source_hash,
  translation.locale,
  translation.prompt,
  translation.hint,
  translation.answer,
  translation.rubric
from public.content_question_translations as translation
join public.content_questions as question
  on question.id = translation.question_id
  and question.current_version = translation.question_version
join public.content_question_revisions as revision
  on revision.question_id = translation.question_id
  and revision.version = translation.question_version
  and revision.source_hash = translation.source_hash
where question.lifecycle_status <> 'archived'
  and translation.translation_status = 'verified';

revoke all on table public.content_current_lesson_translations
  from public, anon, authenticated;
revoke all on table public.content_current_question_translations
  from public, anon, authenticated;
grant select on table public.content_current_lesson_translations
  to authenticated;
grant select on table public.content_current_question_translations
  to authenticated;
grant select on table public.content_current_lesson_translations
  to service_role;
grant select on table public.content_current_question_translations
  to service_role;

alter table public.coach_attempts
  add column if not exists response_locale text not null default 'vi';

alter table public.coach_attempts
  drop constraint if exists coach_attempts_response_locale_check,
  add constraint coach_attempts_response_locale_check
    check (response_locale in ('vi', 'en'));

comment on table public.content_lesson_translations is
  'Verified, exact-revision locale overlays for canonical lesson content.';
comment on table public.content_question_translations is
  'Verified, exact-version locale overlays for canonical question content.';
comment on column public.coach_attempts.response_locale is
  'Language of the persisted AI feedback; historical feedback is never rewritten on locale changes.';

notify pgrst, 'reload schema';
