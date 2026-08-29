begin;

-- Keep the existing immutable compatibility field, but allow the C++14
-- curriculum to flow through the same content-sync pipeline as other C++
-- tracks. Add and validate replacement checks before removing the old names so
-- existing rows remain protected throughout the migration.
alter table public.content_lesson_revisions
  add constraint content_lesson_revisions_standard_cpp14_check check (
    standard in ('cpp98', 'cpp11', 'cpp14', 'cpp20', 'python3', 'cmake')
  ) not valid,
  add constraint content_lesson_revisions_track_cpp14_check check (
    track in ('cpp98', 'cpp11', 'cpp14', 'cpp20', 'python3', 'cmake')
  ) not valid;

alter table public.content_lesson_revisions
  validate constraint content_lesson_revisions_standard_cpp14_check,
  validate constraint content_lesson_revisions_track_cpp14_check;

alter table public.content_lesson_revisions
  drop constraint content_lesson_revisions_standard_check,
  drop constraint content_lesson_revisions_track_check;

alter table public.content_lesson_revisions
  rename constraint content_lesson_revisions_standard_cpp14_check
  to content_lesson_revisions_standard_check;

alter table public.content_lesson_revisions
  rename constraint content_lesson_revisions_track_cpp14_check
  to content_lesson_revisions_track_check;

alter table public.content_lessons
  add constraint content_lessons_current_standard_cpp14_check check (
    current_standard is null
    or current_standard in ('cpp98', 'cpp11', 'cpp14', 'cpp20', 'python3', 'cmake')
  ) not valid,
  add constraint content_lessons_current_track_cpp14_check check (
    current_track is null
    or current_track in ('cpp98', 'cpp11', 'cpp14', 'cpp20', 'python3', 'cmake')
  ) not valid;

alter table public.content_lessons
  validate constraint content_lessons_current_standard_cpp14_check,
  validate constraint content_lessons_current_track_cpp14_check;

alter table public.content_lessons
  drop constraint content_lessons_current_standard_check,
  drop constraint content_lessons_current_track_check;

alter table public.content_lessons
  rename constraint content_lessons_current_standard_cpp14_check
  to content_lessons_current_standard_check;

alter table public.content_lessons
  rename constraint content_lessons_current_track_cpp14_check
  to content_lessons_current_track_check;

commit;
