-- Keep translated copy on the same canonical question identity, but require an
-- independent editorial decision before a draft locale overlay is published.
alter table public.content_question_translations
  add column if not exists approved_by uuid
    references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz;

create index if not exists content_question_translations_approved_by_idx
  on public.content_question_translations (approved_by)
  where approved_by is not null;

drop policy if exists "Content admins read question translation drafts"
  on public.content_question_translations;
create policy "Content admins read question translation drafts"
on public.content_question_translations
for select
to authenticated
using ((select public.is_content_admin()));

drop policy if exists "Content admins insert approved question translations"
  on public.content_question_translations;
create policy "Content admins insert approved question translations"
on public.content_question_translations
for insert
to authenticated
with check (
  (select public.is_content_admin())
  and approved_by = (select auth.uid())
  and approved_at is not null
  and translation_status = 'verified'
  and locale = 'en'
  and exists (
    select 1
    from public.content_questions as question
    join public.content_question_revisions as revision
      on revision.question_id = question.id
      and revision.version = question.current_version
    where question.id = content_question_translations.question_id
      and question.current_version =
        content_question_translations.question_version
      and revision.source_hash =
        content_question_translations.source_hash
      and question.lifecycle_status <> 'archived'
  )
);

drop policy if exists "Content admins update approved question translations"
  on public.content_question_translations;
create policy "Content admins update approved question translations"
on public.content_question_translations
for update
to authenticated
using ((select public.is_content_admin()))
with check (
  (select public.is_content_admin())
  and approved_by = (select auth.uid())
  and approved_at is not null
  and translation_status = 'verified'
  and locale = 'en'
  and exists (
    select 1
    from public.content_questions as question
    join public.content_question_revisions as revision
      on revision.question_id = question.id
      and revision.version = question.current_version
    where question.id = content_question_translations.question_id
      and question.current_version =
        content_question_translations.question_version
      and revision.source_hash =
        content_question_translations.source_hash
      and question.lifecycle_status <> 'archived'
  )
);

grant insert, update on table public.content_question_translations
  to authenticated;

comment on column public.content_question_translations.approved_by is
  'Content admin who approved this exact translated copy.';
comment on column public.content_question_translations.approved_at is
  'Time this exact translated copy was approved for publication.';

notify pgrst, 'reload schema';
