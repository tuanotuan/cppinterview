-- The product is intentionally C++-only. Preserve historical source and
-- revision rows, but prevent retired Python/CMake lessons, drafts, and jobs
-- from being served or generated.
begin;

update public.content_generation_jobs as job
set
  status = 'dead_letter',
  lease_token = null,
  lease_expires_at = null,
  completed_at = coalesce(job.completed_at, now()),
  last_error = jsonb_build_object(
    'code', 'retired_non_cpp_track',
    'message', 'The cppinterview product now serves C++ content only.'
  )
from public.content_lessons as lesson
where job.lesson_id = lesson.id
  and lesson.current_language in ('python', 'cmake')
  and job.status in ('pending', 'running', 'deferred');

update public.content_questions as question
set
  lifecycle_status = 'archived',
  archived_at = coalesce(question.archived_at, now())
from public.content_lessons as lesson
where question.lesson_id = lesson.id
  and lesson.current_language in ('python', 'cmake')
  and question.lifecycle_status <> 'archived';

update public.content_lessons as lesson
set
  lifecycle_status = 'archived',
  archived_at = coalesce(lesson.archived_at, now())
where lesson.current_language in ('python', 'cmake')
  and lesson.lifecycle_status <> 'archived';

commit;
