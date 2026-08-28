-- Retire the exact legacy question set that predates the 53-day C++11
-- curriculum. Tombstones keep repository sync from publishing these IDs again
-- while immutable revisions, approvals, and learning history remain available
-- for audit.
begin;

create temporary table legacy_content_question_ids (
  question_id text primary key
) on commit drop;

insert into legacy_content_question_ids (question_id)
values
  ('cpp11-auto-001'),
  ('cpp11-auto-002'),
  ('cpp11-const-pointer-lvalue-reference-ai-001'),
  ('cpp11-const-pointer-lvalue-reference-ai-002'),
  ('cpp11-const-pointer-lvalue-reference-interview-ownership-001'),
  ('cpp11-constexpr-001'),
  ('cpp11-copy-assignment-ai-001'),
  ('cpp11-copy-assignment-ai-002'),
  ('cpp11-copy-assignment-interview-test-first-001'),
  ('cpp11-copy-constructor-ai-001'),
  ('cpp11-copy-constructor-ai-002'),
  ('cpp11-copy-constructor-interview-crash-001'),
  ('cpp11-defaulted-functions-001'),
  ('cpp11-defaulted-functions-002'),
  ('cpp11-deleted-functions-001'),
  ('cpp11-enum-class-001'),
  ('cpp11-enum-class-002'),
  ('cpp11-final-001'),
  ('cpp11-final-002'),
  ('cpp11-final-003'),
  ('cpp11-final-004'),
  ('cpp11-initializer-list-001'),
  ('cpp11-initializer-list-002'),
  ('cpp11-lambda-algorithms-001'),
  ('cpp11-lambda-algorithms-002'),
  ('cpp11-lambda-basic-001'),
  ('cpp11-lambda-basic-002'),
  ('cpp11-lambda-capture-value-001'),
  ('cpp11-lambda-capture-value-002'),
  ('cpp11-lambda-reference-001'),
  ('cpp11-lvalue-ai-001'),
  ('cpp11-lvalue-ai-002'),
  ('cpp11-moved-from-object-ai-001'),
  ('cpp11-moved-from-object-ai-002'),
  ('cpp11-mutable-lambda-001'),
  ('cpp11-mutable-lambda-002'),
  ('cpp11-nullptr-001'),
  ('cpp11-old-style-enum-001'),
  ('cpp11-old-style-enum-002'),
  ('cpp11-override-001'),
  ('cpp11-override-002'),
  ('cpp11-override-003'),
  ('cpp11-override-004'),
  ('cpp11-override-interview-api-review-001'),
  ('cpp11-override-interview-compiler-001'),
  ('cpp11-range-based-for-001'),
  ('cpp11-range-based-for-002'),
  ('cpp11-range-based-for-interview-optimize-001'),
  ('cpp11-reference-001'),
  ('cpp11-reference-002'),
  ('cpp11-rvalue-ai-001'),
  ('cpp11-rvalue-ai-002'),
  ('cpp11-static-assert-001'),
  ('cpp11-static-assert-002'),
  ('cpp11-toolchain-ai-001'),
  ('cpp11-toolchain-ai-002'),
  ('cpp11-using-alias-001'),
  ('cpp11-using-alias-002'),
  ('cpp20-designated-initializers-001'),
  ('cpp20-feed-arbitration-recovery-001'),
  ('cpp20-market-by-order-reconstruction-ai-001'),
  ('cpp20-market-by-order-reconstruction-ai-002'),
  ('cpp20-market-by-price-and-book-invariants-ai-001'),
  ('cpp20-market-by-price-and-book-invariants-ai-002'),
  ('cpp20-mbo-replace-transaction-001'),
  ('cpp20-mbp-metadata-invariants-001'),
  ('cpp20-sequencing-gaps-and-recovery-ai-001'),
  ('cpp20-sequencing-gaps-and-recovery-ai-002'),
  ('cpp20-tick-binary-parsing-001'),
  ('cpp20-tick-event-lifetime-001'),
  ('cpp20-tick-event-model-and-binary-parsing-ai-001'),
  ('cpp20-tick-event-model-and-binary-parsing-ai-002'),
  ('cpp20-trade-correction-bar-revision-001'),
  ('cpp20-trade-statistics-timestamps-and-corrections-ai-001'),
  ('cpp20-trade-statistics-timestamps-and-corrections-ai-002'),
  ('cpp98-address-pointer-001'),
  ('cpp98-address-pointer-002'),
  ('cpp98-address-pointer-interview-bug-001'),
  ('cpp98-address-pointer-interview-code-review-001'),
  ('cpp98-array-one-past-end-001'),
  ('cpp98-array-one-past-end-002'),
  ('cpp98-array-one-past-end-interview-ub-001'),
  ('cpp98-object-variable-memory-001'),
  ('cpp98-object-variable-memory-002'),
  ('cpp98-reference-001'),
  ('cpp98-reference-002'),
  ('cpp98-struct-padding-001'),
  ('cpp98-struct-padding-interview-compare-001'),
  ('python-day-1-ai-001'),
  ('python-day-1-ai-002');

-- Follow the same candidate-before-question lock order as the interactive
-- rejection RPC so a concurrent remediation resolution cannot retain a stale
-- link to retired content.
do $migration$
begin
  perform 1
  from public.mistake_flashcard_candidates as candidate
  join legacy_content_question_ids as legacy
    on legacy.question_id = candidate.materialized_question_id
    or legacy.question_id = candidate.matched_question_id
  for update of candidate;

  perform 1
  from public.content_questions as question
  join legacy_content_question_ids as legacy
    on legacy.question_id = question.id
  for update of question;

  if exists (
    select 1
    from public.content_questions as question
    join legacy_content_question_ids as legacy
      on legacy.question_id = question.id
    left join public.content_question_rejections as rejection
      on rejection.question_id = question.id
    where rejection.question_id is null
  ) and not exists (
    select 1 from public.content_admins
  ) then
    raise exception 'Cannot audit legacy question retirement without a content admin'
      using errcode = '55000';
  end if;
end;
$migration$;

insert into public.content_question_rejections (
  question_id,
  question_version,
  source_hash,
  rejected_by
)
select
  question.id,
  question.current_version,
  revision.source_hash,
  actor.user_id
from legacy_content_question_ids as legacy
join public.content_questions as question
  on question.id = legacy.question_id
join public.content_question_revisions as revision
  on revision.question_id = question.id
  and revision.version = question.current_version
cross join lateral (
  select admin.user_id
  from public.content_admins as admin
  order by admin.created_at, admin.user_id
  limit 1
) as actor
on conflict (question_id) do nothing;

update public.mistake_flashcard_candidates as candidate
set
  status = 'dismissed',
  materialized_question_id = null,
  matched_question_id = null,
  lease_token = null,
  lease_expires_at = null
from legacy_content_question_ids as legacy
where candidate.materialized_question_id = legacy.question_id
   or candidate.matched_question_id = legacy.question_id;

commit;
