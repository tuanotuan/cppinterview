import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationRoot = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "supabase",
  "migrations",
);
const webRoot = path.resolve(migrationRoot, "..", "..");

describe("database hardening migrations", () => {
  it("keeps Coach evaluation idempotency locale-bound", async () => {
    const sql = await readMigration(
      "20260828110000_localize_coach_evaluation_fingerprints.sql",
    );

    expect(sql).toContain(
      "create or replace function public.coach_evaluation_response_locale(",
    );
    expect(sql).toContain("array['vi', 'en']");
    expect(sql).toContain("return 'vi';");
    expect(sql).toContain("v_response_locale = 'vi'");
    expect(sql).toContain("request_fingerprint = v_legacy_fingerprint");
    expect(sql).toContain("and response_locale = v_response_locale");
    expect(sql).toContain("response_locale = excluded.response_locale");
    expect(sql).toContain(
      "or v_attempt.response_locale is distinct from v_response_locale",
    );
    expect(sql).toMatch(
      /revoke all on function public\.coach_evaluation_response_locale\([\s\S]*?\) from public, anon, authenticated;/,
    );
    expect(sql).toContain("notify pgrst, 'reload schema';");
  });

  it("keeps content translations revision-bound, verified, and read-only", async () => {
    const sql = await readMigration(
      "20260825073227_add_content_translations.sql",
    );

    expect(sql).toContain("create table public.content_lesson_translations");
    expect(sql).toContain("create table public.content_question_translations");
    expect(sql).toContain(
      "foreign key (lesson_revision_id, lesson_id, source_hash)",
    );
    expect(sql).toContain(
      "foreign key (question_id, question_version, source_hash)",
    );
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("translation_status = 'verified'");
    expect(sql).toContain("with (security_invoker = true)");
    expect(sql).toContain(
      "revoke all on table public.content_question_translations",
    );
    expect(sql).toContain(
      "grant select on table public.content_question_translations to authenticated",
    );
    expect(sql).not.toMatch(
      /grant (?:insert|update|delete|all).*content_(?:lesson|question)_translations.*authenticated/i,
    );
    expect(sql).toContain("coach_attempts_response_locale_check");
  });

  it("refreshes the exact server-only public AI quota RPC contract", async () => {
    const sql = await readMigration(
      "20260809110000_refresh_public_ai_quota_rpc_contract.sql",
    );

    expect(sql).toMatch(
      /revoke all on function public\.reserve_public_ai_quota\(\s*text, text, text, text, uuid, text, text, integer\s*\) from public, anon, authenticated;/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.reserve_public_ai_quota\(\s*text, text, text, text, uuid, text, text, integer\s*\) to service_role;/,
    );
    expect(sql).toContain("notify pgrst, 'reload schema';");
  });

  it("keeps effective public AI quota status read-only and server-only", async () => {
    const sql = await readMigration(
      "20260809120000_add_public_ai_quota_status.sql",
    );
    const statusStart = sql.indexOf(
      "create or replace function public.get_public_ai_quota_status(",
    );
    const reserveV2Start = sql.indexOf(
      "create or replace function public.reserve_public_ai_quota_v2(",
    );
    const statusFunction = sql.slice(statusStart, reserveV2Start);

    expect(statusStart).toBeGreaterThan(-1);
    expect(reserveV2Start).toBeGreaterThan(statusStart);
    expect(statusFunction).toMatch(
      /returns jsonb\s+language plpgsql\s+volatile\s+security definer\s+set search_path = ''/,
    );
    expect(statusFunction).toContain("v_effective_used integer := 0");
    expect(statusFunction).toContain("v_used > v_effective_used");
    expect(statusFunction).toContain("v_used = v_effective_used");
    expect(statusFunction).toContain(
      "greatest(0, v_limit - v_effective_used)",
    );
    expect(statusFunction).toContain(
      "when v_effective_used >= v_limit then 'quota_exceeded'",
    );
    expect(statusFunction).not.toMatch(
      /\b(?:insert into|update|delete from|for update)\b/,
    );

    expect(sql).toMatch(
      /create or replace function public\.reserve_public_ai_quota_v2\(\s*p_principal_hash text,\s*p_ip_hash text,\s*p_device_hash text,\s*p_account_hash text,\s*p_idempotency_key uuid,\s*p_request_fingerprint text,\s*p_request_kind text,\s*p_lease_seconds integer default 600\s*\)/,
    );
    expect(sql).toMatch(
      /v_result := public\.reserve_public_ai_quota\(\s*p_principal_hash,\s*p_ip_hash,\s*p_device_hash,\s*p_account_hash,\s*p_idempotency_key,\s*p_request_fingerprint,\s*p_request_kind,\s*p_lease_seconds\s*\);/,
    );
    expect(sql).toContain(
      "v_status := public.get_public_ai_quota_status(",
    );
    expect(sql).toContain("return v_result || (v_status - 'status');");
    expect(sql).not.toContain("alter function public.reserve_public_ai_quota(");

    expect(sql).toMatch(
      /revoke all on function public\.get_public_ai_quota_status\(text, text, text\)\s+from public, anon, authenticated;/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.get_public_ai_quota_status\(text, text, text\)\s+to service_role;/,
    );
    expect(sql).toMatch(
      /revoke all on function public\.reserve_public_ai_quota_v2\(\s*text, text, text, text, uuid, text, text, integer\s*\) from public, anon, authenticated;/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.reserve_public_ai_quota_v2\(\s*text, text, text, text, uuid, text, text, integer\s*\) to service_role;/,
    );
    expect(sql).toContain("notify pgrst, 'reload schema';");
  });

  it("creates manual admin questions as database-owned drafts with grounded sources", async () => {
    const sql = await readMigration(
      "20260808193000_create_admin_manual_content_question.sql",
    );

    expect(sql).toContain("create or replace function public.create_admin_content_question");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("public.is_content_admin()");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("'admin'");
    expect(sql).toContain("'database'");
    expect(sql).toContain("Manual question cites an unknown lesson section");
    expect(sql).toContain("'generated'");
    expect(sql).toContain("revoke all on function public.create_admin_content_question");
    expect(sql).toContain("grant execute on function public.create_admin_content_question(text, jsonb) to authenticated;");
  });

  it("creates standalone manual questions without a repository lesson or .md section", async () => {
    const sql = await readMigration(
      "20260809100000_create_standalone_admin_manual_questions.sql",
    );

    expect(sql).toContain(
      "create or replace function public.create_standalone_admin_content_question",
    );
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("public.is_content_admin()");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("'admin-manual-questions'");
    expect(sql).toContain("'database'");
    expect(sql).toContain("keep_standalone_manual_lesson_active");
    expect(sql).toContain(
      "grant execute on function public.create_standalone_admin_content_question(jsonb)",
    );
  });

  it("keeps WorldQuant training evidence account-scoped and revision-checked", async () => {
    const sql = await readMigration(
      "20260801090000_add_worldquant_cloud_state.sql",
    );

    expect(sql).toContain("create table if not exists public.worldquant_training_states");
    expect(sql).toContain("create table if not exists public.worldquant_mission_snapshots");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("for select to authenticated");
    expect(sql).toContain("revoke all on public.worldquant_training_states from anon, authenticated");
    expect(sql).toContain("revoke all on public.worldquant_mission_snapshots from anon, authenticated");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = public");
    expect(sql).toContain("auth.uid()");
    expect(sql).toContain("pg_catalog.pg_advisory_xact_lock");
    expect(sql).toContain("p_expected_revision");
    expect(sql).toContain("'conflict', true");
    expect(sql).toContain("offset 23");
    expect(sql).toContain("grant execute on function public.save_worldquant_training_state(jsonb, bigint) to authenticated;");
    expect(sql).toContain("grant execute on function public.save_worldquant_mission_snapshot(date, text, smallint, jsonb, bigint) to authenticated;");
  });

  it("keeps terminal mistake-card failures from reopening paid work", async () => {
    const sql = await readMigration(
      "20260730140000_harden_mistake_generation_retries.sql",
    );

    expect(sql).toContain("'dead_letter'");
    expect(sql).toContain(
      "create or replace function public.mistake_generation_retry_protocol_version()",
    );
    expect(sql).toContain("select 3");
    expect(sql).toContain(
      "add column if not exists provider_dispatched_at timestamptz",
    );
    expect(sql).toContain(
      "create or replace function public.mark_mistake_generation_dispatched(",
    );
    expect(sql).toMatch(
      /create or replace function public\.mark_mistake_generation_dispatched\([\s\S]*?v_candidate\.lease_token is distinct from p_lease_token[\s\S]*?v_candidate\.lease_expires_at <= now\(\)[\s\S]*?set provider_dispatched_at = coalesce\(provider_dispatched_at, now\(\)\)[\s\S]*?'status', 'dispatched'/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.mark_mistake_generation_dispatched\(\s*uuid, uuid\s*\) to authenticated;/,
    );
    expect(sql).toContain(
      "create or replace function public.enforce_mistake_generation_dispatch()",
    );
    expect(sql).toContain(
      "create trigger mistake_generation_requires_dispatch",
    );
    expect(sql).toMatch(
      /old\.status = 'generating'[\s\S]*new\.status = 'pending_review'[\s\S]*old\.provider_dispatched_at is null/,
    );
    expect(sql).toContain(
      "create or replace function public.terminate_mistake_flashcard_generation(",
    );
    expect(sql).toContain(
      "v_candidate.lease_token is distinct from p_lease_token",
    );
    expect(sql).toMatch(
      /if v_candidate\.provider_dispatched_at is null then\s+update public\.mistake_flashcard_candidates\s+set status = 'failed'/,
    );
    expect(sql).toContain(
      "'generation_lease_expired_before_dispatch'",
    );
    expect(sql).toContain("'generation_lease_expired_unconfirmed'");
    expect(sql).toContain("'status', 'dispatch_required'");
    expect(sql).not.toContain("reject_mistake_flashcard_completion");
  });

  it("expands, serializes, and then finalizes durable practice-history generations", async () => {
    const [expandSql, finalizeSql, syncRoute] = await Promise.all([
      readMigration(
        "20260730200000_serialize_practice_reviews.sql",
      ),
      readMigration(
        "20260730220000_finalize_practice_history_generations.sql",
      ),
      readFile(
        path.join(
          webRoot,
          "src",
          "app",
          "api",
          "progress",
          "sync",
          "route.ts",
        ),
        "utf8",
      ),
    ]);
    const recordFunctionAt = expandSql.indexOf(
      "create function public.record_practice_review(",
    );
    const lockAt = expandSql.indexOf(
      "pg_catalog.pg_advisory_xact_lock",
      recordFunctionAt,
    );
    const existingReadAt = expandSql.indexOf(
      "review.rating,\n    review.question_version,\n    review.source_hash",
    );
    const resetMismatchAt = expandSql.indexOf(
      "if v_history_reset_token is distinct from p_history_reset_token",
    );
    const alreadyRecordedAt = expandSql.indexOf(
      "if v_daily_review_found\n    and v_existing_review_version",
    );

    expect(expandSql).toContain(
      "drop function public.record_practice_review(",
    );
    expect(expandSql).toContain(
      "add column if not exists history_reset_token uuid",
    );
    expect(expandSql).toMatch(
      /create function public\.record_practice_review\(\s*p_question_id text,\s*p_question_version integer,\s*p_source_hash text,\s*p_reviewed_on date,\s*p_rating text,\s*p_history_reset_token uuid\s*\)/,
    );
    expect(expandSql).not.toMatch(
      /p_history_reset_token uuid default/,
    );
    expect(expandSql).toContain(
      "v_user_id::text || ':' || p_question_id",
    );
    expect(lockAt).toBeGreaterThan(-1);
    expect(existingReadAt).toBeGreaterThan(lockAt);
    expect(resetMismatchAt).toBeGreaterThan(lockAt);
    expect(alreadyRecordedAt).toBeGreaterThan(resetMismatchAt);
    expect(expandSql).toMatch(
      /v_existing_review_reset_token\s+is not distinct from p_history_reset_token then\s+return jsonb_build_object\(\s+'status', 'already_recorded'/,
    );
    expect(expandSql).toContain("'status', 'reset_discarded'");
    expect(expandSql).toContain("'status', 'recorded'");
    expect(expandSql).toContain("'status', 'history_recorded'");
    expect(expandSql).toContain(
      "p_reviewed_on < v_existing_last_reviewed_on",
    );
    const historicalBranchStart = expandSql.indexOf(
      "if v_state_found\n    and v_existing_last_reviewed_on is not null",
    );
    const historicalBranchEnd = expandSql.indexOf(
      "\n  if not v_state_found then",
      historicalBranchStart,
    );
    const historicalBranch = expandSql.slice(
      historicalBranchStart,
      historicalBranchEnd,
    );
    expect(historicalBranch).toMatch(
      /if not v_daily_review_found then\s+--[\s\S]*?update public\.user_question_states\s+set review_count = review_count \+ 1/,
    );
    expect(expandSql).toMatch(
      /create function public\.record_practice_review\(\s*p_question_id text,\s*p_question_version integer,\s*p_source_hash text,\s*p_reviewed_on date,\s*p_rating text\s*\)[\s\S]*?return public\.record_practice_review\([\s\S]*?null::uuid/,
    );
    expect(expandSql).toMatch(
      /grant execute on function public\.record_practice_review\(\s*text,\s*integer,\s*text,\s*date,\s*text\s*\) to authenticated;/,
    );

    expect(finalizeSql).toMatch(
      /update public\.user_question_states\s+set history_reset_token = extensions\.gen_random_uuid\(\)\s+where history_reset_token is null;/,
    );
    expect(finalizeSql).toMatch(
      /update public\.practice_reviews as review\s+set history_reset_token = state\.history_reset_token/,
    );
    expect(finalizeSql).toContain(
      "drop trigger if exists practice_reviews_clear_history_reset",
    );
    expect(finalizeSql).toContain(
      "drop function if exists public.clear_question_history_reset_on();",
    );
    expect(finalizeSql).toContain(
      "pg_catalog.pg_advisory_xact_lock",
    );
    expect(finalizeSql).toMatch(
      /p_action = 'reschedule'[\s\S]*?else\s+delete from public\.practice_reviews[\s\S]*?history_reset_token = extensions\.gen_random_uuid\(\)/,
    );
    expect(finalizeSql).toMatch(
      /drop function public\.record_practice_review\(\s*text,\s*integer,\s*text,\s*date,\s*text\s*\);/,
    );
    expect(syncRoute).toContain(
      "p_history_reset_token: review.historyResetToken ?? null",
    );
    expect(syncRoute).toContain('rpcError.code === "PGRST202"');
    expect(syncRoute).toContain(
      "practiceReviewDiscardIdentity(outcome.review)",
    );
    expect(syncRoute).toContain(
      "filterReviewsForLearningHistory",
    );
  });

  it("marks provider dispatch before DB-native generation can be retried", async () => {
    const [
      sql,
      baseGenerationSql,
      worker,
      drafts,
      retryRoute,
      adminDashboard,
    ] = await Promise.all([
      readMigration(
        "20260730210000_harden_content_generation_dispatch.sql",
      ),
      readMigration(
        "20260726100000_create_db_native_generation_pipeline.sql",
      ),
      readFile(
        path.join(
          webRoot,
          "scripts",
          "generate-db-question-drafts.ts",
        ),
        "utf8",
      ),
      readFile(
        path.join(webRoot, "src", "lib", "content", "drafts.ts"),
        "utf8",
      ),
      readFile(
        path.join(
          webRoot,
          "src",
          "app",
          "api",
          "admin",
          "generation-jobs",
          "route.ts",
        ),
        "utf8",
      ),
      readFile(
        path.join(webRoot, "src", "app", "admin", "admin-dashboard.tsx"),
        "utf8",
      ),
    ]);

    expect(sql).toContain(
      "add column if not exists provider_dispatched_at timestamptz",
    );
    expect(sql).toContain("provider_dispatch_history jsonb not null");
    expect(sql).toContain("manual_retry_history jsonb not null");
    expect(sql).toMatch(
      /set status = 'dead_letter',[\s\S]*?'legacy_pending_retry_outcome_unconfirmed'[\s\S]*?where status = 'pending';/,
    );
    expect(sql).not.toContain(
      "where status = 'pending'\n  and updated_at > created_at;",
    );
    expect(sql).toMatch(
      /set status = 'dead_letter',[\s\S]*?'legacy_deferred_outcome_unconfirmed'[\s\S]*?where status = 'deferred';/,
    );
    expect(sql.indexOf("where status = 'deferred';")).toBeLessThan(
      sql.indexOf("create function public.claim_content_generation_job("),
    );
    expect(sql).toContain(
      "create or replace function public.content_generation_retry_protocol_version()",
    );
    expect(sql).toContain("select 2");
    expect(sql).toContain(
      "drop function if exists public.claim_content_generation_job(integer);",
    );
    expect(sql).toMatch(
      /create function public\.claim_content_generation_job\(\s*p_protocol_version integer,\s*p_generator_version text,\s*p_lease_seconds integer default 600/,
    );
    expect(sql).toContain(
      "if p_protocol_version is distinct from 2 then",
    );
    expect(sql).toContain(
      "and job.generator_version = p_generator_version",
    );
    expect(
      sql.match(
        /hashtext\('cpp-recall-db-question-generation'\)/g,
      ),
    ).toHaveLength(3);
    expect(baseGenerationSql).toMatch(
      /create or replace function public\.complete_content_generation_job\([\s\S]*?pg_advisory_xact_lock\(\s*pg_catalog\.hashtext\('cpp-recall-db-question-generation'\)/,
    );
    expect(sql).toMatch(
      /'code', 'source_already_materialized'[\s\S]*?from public\.content_questions as question[\s\S]*?question_revision\.source_hash = job\.source_hash[\s\S]*?select job\.id, job\.lesson_id, job\.source_hash/,
    );
    expect(sql).toMatch(
      /create or replace function public\.enqueue_content_generation_jobs\([\s\S]*?pg_advisory_xact_lock\([\s\S]*?'content-generation:' \|\| v_candidate\.lesson_id \|\| ':'[\s\S]*?v_candidate\.source_hash,[\s\S]*?2026073021[\s\S]*?insert into public\.content_generation_jobs/,
    );
    expect(sql).toMatch(
      /create function public\.claim_content_generation_job\([\s\S]*?pg_advisory_xact_lock\([\s\S]*?'content-generation:' \|\| v_candidate_lesson_id \|\| ':'[\s\S]*?v_candidate_source_hash,[\s\S]*?2026073021[\s\S]*?from public\.content_generation_jobs as sibling/,
    );
    expect(
      sql.match(
        /pg_advisory_xact_lock\([\s\S]*?hashtextextended\([\s\S]*?'content-generation:'/g,
      ),
    ).toHaveLength(3);
    expect(sql).toMatch(
      /sibling\.status in \('pending', 'deferred', 'running'\)[\s\S]*?sibling\.status in \('failed', 'dead_letter'\)[\s\S]*?sibling\.provider_dispatched_at is not null/,
    );
    expect(sql).toContain("'status', 'generation_history_conflict'");
    expect(sql).toContain(
      "'providerOutcomeUnconfirmed',\n        v_blocked_dispatched_at is not null",
    );
    expect(sql).not.toContain("newer_job.id");
    expect(sql).not.toContain("current_job.id > job.id");
    expect(sql).not.toContain("'code', 'obsolete_generator_version'");
    expect(sql).toContain(
      "'generatorVersion', v_job.generator_version",
    );
    expect(sql).toContain("'status', 'generator_version_mismatch'");
    expect(sql).toMatch(
      /grant execute on function public\.claim_content_generation_job\(\s*integer, text, integer\s*\)\s+to service_role;/,
    );
    expect(sql).not.toContain(
      "grant execute on function public.claim_content_generation_job(integer)",
    );
    expect(sql).toContain(
      "create or replace function public.mark_content_generation_dispatched(",
    );
    expect(sql).toMatch(
      /create or replace function public\.mark_content_generation_dispatched\(\s*p_job_id bigint,\s*p_lease_token uuid,\s*p_provider text,\s*p_model text[\s\S]*?v_job\.lease_token is distinct from p_lease_token[\s\S]*?provider_dispatched_at = v_dispatched_at[\s\S]*?provider_dispatch_history = provider_dispatch_history[\s\S]*?'provider', p_provider[\s\S]*?'model', p_model[\s\S]*?'status', 'dispatched'/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.mark_content_generation_dispatched\(\s*bigint, uuid, text, text\s*\) to service_role;/,
    );
    expect(sql).toMatch(
      /set status = 'dead_letter'[\s\S]*?where status = 'running'[\s\S]*?provider_dispatched_at is not null/,
    );
    expect(sql).toMatch(
      /set status = case[\s\S]*?else 'deferred'[\s\S]*?where status = 'running'[\s\S]*?provider_dispatched_at is null/,
    );
    expect(sql).toMatch(
      /set status = 'running'[\s\S]*?provider_dispatched_at = null/,
    );
    expect(sql).toContain(
      "create trigger content_generation_requires_dispatch",
    );
    expect(sql).toMatch(
      /old\.status = 'running'[\s\S]*?new\.status = 'completed'[\s\S]*?old\.provider_dispatched_at is null/,
    );
    expect(sql).toMatch(
      /v_confirmed_rate_limit :=\s+p_retryable is true\s+and p_error ->> 'code' = 'provider_rate_limit'/,
    );
    expect(sql).toContain(
      "drop function if exists public.fail_content_generation_job(\n  bigint, uuid, jsonb, boolean\n);",
    );
    expect(sql).toMatch(
      /create function public\.fail_content_generation_job\(\s*p_protocol_version integer,[\s\S]*?if p_protocol_version is distinct from 2 then/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.fail_content_generation_job\(\s*integer, bigint, uuid, jsonb, boolean\s*\) to service_role;/,
    );
    expect(sql).toMatch(
      /provider_dispatched_at = case\s+when v_confirmed_rate_limit then null/,
    );
    expect(sql).toMatch(
      /create function public\.retry_content_generation_job\(\s*p_job_id bigint,\s*p_generator_version text,\s*p_confirm_ambiguous_outcome boolean[\s\S]*?pg_advisory_xact_lock\([\s\S]*?'content-generation:' \|\| v_job\.lesson_id \|\| ':'[\s\S]*?v_job\.source_hash,[\s\S]*?2026073021[\s\S]*?v_requires_confirmation := v_job\.provider_dispatched_at is not null[\s\S]*?explicit retry confirmation is required/,
    );
    expect(sql).toMatch(
      /v_job\.status in \('deferred', 'failed', 'dead_letter'\)[\s\S]*?v_job\.status = 'pending'[\s\S]*?v_job\.generator_version is distinct from p_generator_version/,
    );
    expect(sql).toMatch(
      /if v_job\.generator_version is distinct from p_generator_version then[\s\S]*?set status = 'completed'[\s\S]*?provider_dispatched_at = null[\s\S]*?'code', 'obsolete_generator_version_acknowledged'[\s\S]*?'action', 'acknowledge_obsolete_generator'[\s\S]*?'status', 'superseded'/,
    );
    expect(sql).toMatch(
      /manual_retry_history = manual_retry_history \|\| jsonb_build_array\([\s\S]*?'previousError', v_job\.last_error[\s\S]*?'previousProviderDispatchedAt',\s+v_job\.provider_dispatched_at/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.retry_content_generation_job\(\s*bigint, text, boolean\s*\)\s+to authenticated;/,
    );
    expect(sql).not.toContain(
      "grant execute on function public.retry_content_generation_job(bigint)\n",
    );

    const preflightAt = worker.indexOf(
      "await assertContentGenerationRetryProtocol(supabase);",
    );
    const claimAt = worker.indexOf(
      '"claim_content_generation_job"',
    );
    expect(preflightAt).toBeGreaterThan(-1);
    expect(claimAt).toBeGreaterThan(preflightAt);
    expect(worker).toContain(
      "CONTENT_GENERATION_RETRY_PROTOCOL_VERSION = 2",
    );
    expect(worker).toContain(
      "p_protocol_version: CONTENT_GENERATION_RETRY_PROTOCOL_VERSION",
    );
    expect(worker).toContain(
      "p_generator_version: QUESTION_GENERATOR_PROMPT_VERSION",
    );
    expect(worker).toContain(
      "p_protocol_version: CONTENT_GENERATION_RETRY_PROTOCOL_VERSION",
    );
    expect(worker).toContain(
      "generatorVersion: z.literal(QUESTION_GENERATOR_PROMPT_VERSION)",
    );
    expect(worker).toContain(
      'status: z.literal("generator_version_mismatch")',
    );
    expect(worker).toContain(
      'status: z.literal("generation_history_conflict")',
    );
    expect(worker).toContain(
      'if (claim.status === "generation_history_conflict")',
    );
    expect(worker).toContain(
      "Resolve that job in Admin before generation.",
    );
    expect(worker).toContain(
      "Run content:sync with the current worker before generation.",
    );
    expect(worker).toContain(
      "beforeProviderRequest: (provider, model) =>",
    );
    expect(worker).toContain(
      "markContentGenerationDispatched(supabase, job, provider, model)",
    );

    const openAiMarkerAt = drafts.indexOf(
      'await beforeProviderRequest?.("openai", model);',
    );
    const openAiRequestAt = drafts.indexOf(
      "client.responses.parse(request)",
    );
    const geminiMarkerAt = drafts.indexOf(
      'await beforeProviderRequest?.("gemini", model);',
    );
    const geminiRequestAt = drafts.indexOf(
      "client.interactions.create(",
    );
    expect(openAiMarkerAt).toBeGreaterThan(-1);
    expect(openAiRequestAt).toBeGreaterThan(openAiMarkerAt);
    expect(geminiMarkerAt).toBeGreaterThan(-1);
    expect(geminiRequestAt).toBeGreaterThan(geminiMarkerAt);

    expect(retryRoute).toContain("confirmAmbiguousOutcome: z.boolean()");
    expect(retryRoute).toContain(
      "p_confirm_ambiguous_outcome: parsed.data.confirmAmbiguousOutcome",
    );
    expect(retryRoute).toContain(
      "p_generator_version: QUESTION_GENERATOR_PROMPT_VERSION",
    );
    expect(retryRoute).toContain(
      "{ error: message, requiresConfirmation }",
    );
    expect(retryRoute).toContain(
      'status: z.enum(["pending", "superseded"])',
    );
    expect(adminDashboard).toContain(
      "Chạy lại có thể tạo thêm một yêu cầu tính phí.",
    );
    expect(adminDashboard).toContain("legacy_deferred_outcome_unconfirmed");
    expect(adminDashboard).toContain(
      "legacy_pending_retry_outcome_unconfirmed",
    );
    expect(adminDashboard).not.toContain(
      "generationRetryNeedsConfirmation",
    );
    expect(adminDashboard).toContain(
      "result.payload.requiresConfirmation",
    );
    expect(adminDashboard).toContain(
      'payload.status !== "superseded"',
    );
    expect(adminDashboard).toContain(
      'code: "obsolete_generator_version_acknowledged"',
    );
    expect(adminDashboard).toContain(
      'job.status === "pending" && obsoleteGenerator',
    );
    expect(adminDashboard).toContain("Đóng phiên bản cũ");
    expect(adminDashboard).toContain(
      "Đã đóng tác vụ dùng bộ sinh cũ và giữ dấu vết xác nhận.",
    );
  });

  it("retires metadata-based legacy administrator provisioning", async () => {
    const sql = await readMigration(
      "20260730150000_retire_legacy_content_backfill.sql",
    );

    expect(sql).toContain(
      "create or replace function public.backfill_content_question_bank(",
    );
    expect(sql).toContain("raise sqlstate '55000'");
    expect(sql).not.toContain("raw_user_meta_data");
    expect(sql).toMatch(
      /revoke all on function public\.backfill_content_question_bank\([\s\S]*?\) from public, anon, authenticated, service_role;/,
    );
  });

  it("does not advertise commands for the retired content backfill", async () => {
    const [packageRaw, readme] = await Promise.all([
      readFile(path.join(webRoot, "package.json"), "utf8"),
      readFile(path.join(webRoot, "supabase", "README.md"), "utf8"),
    ]);
    const packageJson = JSON.parse(packageRaw) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts).not.toHaveProperty("content:backfill:sql");
    expect(packageJson.scripts).not.toHaveProperty("content:backfill:check");
    expect(
      Object.values(packageJson.scripts ?? {}).some((command) =>
        command.includes("generate-content-backfill-sql"),
      ),
    ).toBe(false);
    expect(readme).not.toContain("content:backfill");
    expect(readme).toContain("unconditional SQLSTATE `55000`");
  });

  it("binds Coach completion caches to persisted attempts and requests", async () => {
    const sql = await readMigration(
      "20260730130000_create_coach_evaluation_reservations.sql",
    );

    expect(sql).toContain(
      "on public.coach_evaluation_reservations (user_id, request_fingerprint)",
    );
    expect(sql).toContain(
      "attempt_id bigint references public.coach_attempts(id) on delete cascade",
    );
    expect(sql).toContain(
      "and idempotency_key = v_reservation.idempotency_key",
    );
    expect(sql).toContain(
      "status in ('running', 'completed', 'outcome_unknown')",
    );
    expect(sql).toContain(
      "mark_coach_evaluation_outcome_unknown",
    );
    expect(sql).toContain("dispatched_at timestamptz");
    expect(sql).toContain(
      "create or replace function public.mark_coach_evaluation_dispatched(",
    );
    expect(sql).toMatch(
      /if v_reservation\.dispatched_at is null then\s+delete from public\.coach_evaluation_reservations/,
    );
    expect(sql).toContain("'status', 'dispatch_required'");
    expect(sql).not.toContain("lease_attempt = lease_attempt + 1");
  });

  it("terminalizes ambiguous Coach follow-ups instead of renewing them", async () => {
    const sql = await readMigration(
      "20260730160000_create_coach_follow_up_reservations.sql",
    );

    expect(sql).toContain(
      "on public.coach_follow_up_reservations (\n    user_id,\n    request_fingerprint",
    );
    expect(sql).toContain(
      "status in ('running', 'completed', 'outcome_unknown')",
    );
    expect(sql).toContain(
      "set status = 'outcome_unknown'",
    );
    expect(sql).toContain(
      "mark_coach_follow_up_outcome_unknown",
    );
    expect(sql).toContain("dispatched_at timestamptz");
    expect(sql).toContain(
      "create or replace function public.mark_coach_follow_up_dispatched(",
    );
    expect(sql).toMatch(
      /if v_reservation\.dispatched_at is null then\s+delete from public\.coach_follow_up_reservations/,
    );
    expect(sql).toContain("'status', 'dispatch_required'");
    expect(sql).not.toContain("lease_attempt");
  });

  it("terminalizes expired mock-report work and deletes only safe releases", async () => {
    const sql = await readMigration(
      "20260730170000_terminalize_mock_report_outcomes.sql",
    );

    expect(sql).toContain(
      "create or replace function public.mock_interview_retry_protocol_version()",
    );
    expect(sql).toContain("select 2");
    expect(sql).toContain(
      "and v_existing.lease_expires_at <= now()",
    );
    expect(sql).toContain("'provider_outcome_unknown'");
    expect(sql).toContain(
      "delete from public.mock_interview_attempts",
    );
    expect(sql).toContain(
      "add column if not exists dispatched_at timestamptz",
    );
    expect(sql).toContain(
      "create or replace function public.mark_mock_interview_attempt_dispatched(",
    );
    expect(sql).toMatch(
      /if v_existing\.dispatched_at is null then\s+delete from public\.mock_interview_attempts/,
    );
    const legacyCleanupStart = sql.indexOf(
      "-- The renamed v1 implementation still performs a seven-day cleanup",
    );
    const legacyCallAt = sql.indexOf(
      "return public.reserve_mock_interview_attempt_v1(",
    );
    const legacyCleanup = sql.slice(legacyCleanupStart, legacyCallAt);
    expect(legacyCleanupStart).toBeGreaterThan(-1);
    expect(legacyCallAt).toBeGreaterThan(legacyCleanupStart);
    expect(legacyCleanup).toMatch(
      /update public\.mock_interview_attempts[\s\S]*?status = 'failed'[\s\S]*?lease_expires_at < now\(\) - interval '7 days'[\s\S]*?dispatched_at is not null;/,
    );
    expect(legacyCleanup).toMatch(
      /delete from public\.mock_interview_attempts[\s\S]*?lease_expires_at < now\(\) - interval '7 days'[\s\S]*?dispatched_at is null;/,
    );

    const deletePolicy = sql.slice(
      sql.indexOf(
        'create policy "Users delete their own mock interview attempts"',
      ),
      sql.indexOf(
        "alter function public.reserve_mock_interview_attempt(",
      ),
    );
    expect(deletePolicy).toContain(
      "failure @> '{\"retryable\": true}'::jsonb",
    );
    expect(deletePolicy).toMatch(
      /status = 'reserved'[\s\S]*?lease_expires_at <= now\(\)[\s\S]*?dispatched_at is null/,
    );

    const abortFunction = sql.slice(
      sql.indexOf(
        "create or replace function public.abort_mock_interview_attempt(",
      ),
      sql.indexOf(
        "create or replace function public.delete_mock_interview_attempt(",
      ),
    );
    const abortDispatchGuardAt = abortFunction.indexOf(
      "if v_attempt.dispatched_at is not null then",
    );
    const abortDeleteAt = abortFunction.indexOf(
      "delete from public.mock_interview_attempts",
    );
    expect(abortDispatchGuardAt).toBeGreaterThan(-1);
    expect(abortDeleteAt).toBeGreaterThan(abortDispatchGuardAt);
    expect(abortFunction).toContain("'status', 'dispatch_confirmed'");

    const deleteFunction = sql.slice(
      sql.indexOf(
        "create or replace function public.delete_mock_interview_attempt(",
      ),
      sql.indexOf(
        "revoke all on function public.mock_interview_retry_protocol_version()",
      ),
    );
    expect(deleteFunction).toContain(
      "failure @> '{\"retryable\": true}'::jsonb",
    );
    expect(deleteFunction).toMatch(
      /status = 'reserved'[\s\S]*?lease_expires_at <= now\(\)[\s\S]*?dispatched_at is null/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.mock_interview_retry_protocol_version\(\)\s+to service_role;/,
    );
  });

  it("terminalizes post-provider Mock processing failures before any safe release", async () => {
    const route = await readFile(
      path.join(
        webRoot,
        "src",
        "app",
        "api",
        "mock-interview",
        "report",
        "route.ts",
      ),
      "utf8",
    );
    const postProviderBranch = extractBracedBlock(
      route,
      "if (providerCompleted) {",
    );
    const failAt = postProviderBranch.indexOf(
      "await failMockInterviewAttempt(",
    );
    const responseAt = postProviderBranch.indexOf("return Response.json(");

    expect(failAt).toBeGreaterThan(-1);
    expect(postProviderBranch).toContain(
      'code: "report_processing_failed"',
    );
    expect(postProviderBranch).toContain("retryable: false");
    expect(responseAt).toBeGreaterThan(failAt);
    expect(postProviderBranch).not.toContain(
      "releaseMockInterviewAttempt(",
    );
  });

  it("accounts for AI requests through exact idempotent reservations", async () => {
    const sql = await readMigration(
      "20260730190000_ai_budget_reservation_ledger.sql",
    );

    expect(sql).toContain("primary key (user_id, reservation_id)");
    expect(sql).toContain(
      "status in ('running', 'finalized', 'released')",
    );
    expect(sql).toContain("pg_catalog.pg_advisory_xact_lock");
    expect(sql).toContain("if v_reservation.status <> 'running' then");
    expect(sql).toContain(
      "create function public.release_ai_budget_reservation(\n  p_reservation_id uuid",
    );
    expect(sql).toContain(
      "when v_reservation.dispatched_at is null then 0",
    );
    expect(sql).toContain(
      "else v_reservation.requested_usd_micros",
    );
    expect(sql).toContain(
      "create index ai_budget_reservations_user_day_idx",
    );
    expect(
      sql.match(/create index ai_budget_reservations_user_day_idx/g),
    ).toHaveLength(1);
    expect(sql).toContain("p_reservation_usd_micros > 500000");
    expect(sql).toContain("p_daily_limit_usd_micros > 4000000");
    expect(sql).toContain("v_daily_reservation_count >= 256");
    expect(sql).toContain("p_actual_usd_micros > 4000000");
    expect(sql).toContain("octet_length(p_model) > 200");
    expect(sql).toMatch(
      /revoke all on table public\.ai_budget_reservations\s+from public, anon, authenticated;/,
    );
    expect(sql).toContain("message = 'AI budget client upgrade required'");
    expect(sql).toContain(
      "lock table public.ai_usage_monthly in share row exclusive mode",
    );
    expect(sql).toMatch(
      /revoke all on function public\.release_ai_budget\(bigint, date, date\)\s+from public, anon, authenticated;/,
    );
    expect(sql).toMatch(
      /revoke all on function public\.release_ai_budget\(bigint\)\s+from public, anon, authenticated;/,
    );
    expect(sql).toMatch(
      /revoke all on function public\.finalize_ai_budget\([\s\S]*?date, date\s*\) from public, anon, authenticated;/,
    );
    expect(sql).toMatch(
      /revoke all on function public\.finalize_ai_budget\(\s*bigint, bigint, text, bigint, bigint, bigint, bigint\s*\) from public, anon, authenticated;/,
    );
    expect(sql).toMatch(
      /revoke all on function public\.reserve_web_ai_budget\(bigint, bigint\)\s+from public, anon, authenticated;/,
    );
    expect(sql).toMatch(
      /revoke all on function public\.reserve_ai_budget\(bigint, bigint, bigint\)\s+from public, anon, authenticated;/,
    );
    expect(sql).toMatch(
      /revoke all on function public\.reserve_ai_budget\(bigint, bigint\)\s+from public, anon, authenticated;/,
    );
  });
});

async function readMigration(name: string) {
  return (await readFile(path.join(migrationRoot, name), "utf8")).replaceAll(
    "\r\n",
    "\n",
  );
}

function extractBracedBlock(source: string, marker: string) {
  const markerAt = source.indexOf(marker);
  expect(markerAt).toBeGreaterThan(-1);
  const blockStart = source.indexOf("{", markerAt);
  expect(blockStart).toBeGreaterThan(markerAt);

  let depth = 0;
  for (let index = blockStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] !== "}") continue;
    depth -= 1;
    if (depth === 0) return source.slice(blockStart, index + 1);
  }

  throw new Error(`Unterminated block after ${marker}`);
}
