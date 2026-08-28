import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getRepoContentManifest,
  loadQuestionStoreManifest,
  rowsToContentManifest,
  type LessonRow,
} from "./question-store-server";

describe("database question store", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ignores retired rows before validating their legacy standard", () => {
    const legacyLesson: LessonRow = {
      id: "retired-python-lesson",
      lifecycle_status: "active",
      source_hash: "legacy",
      source_commit_sha: null,
      source_path: "python/01_legacy",
      standard: "python3",
      language: "python",
      track: "python3",
      lesson_order: 1,
      title: "Retired lesson",
      tags: [],
      prerequisites: [],
      code: null,
      sections: [],
      checklist_items: [],
      manifest_order: 1,
    };

    expect(
      rowsToContentManifest([legacyLesson], [], "a".repeat(64)).lessons,
    ).toEqual([]);
  });

  it("filters permanent rejection tombstones in repository mode", async () => {
    vi.stubEnv("QUESTION_STORE", "repo");
    const rejectedId = getRepoContentManifest().questions[0]?.id;
    expect(rejectedId).toBeTruthy();
    const range = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ question_id: rejectedId }],
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: null });
    const order = vi.fn().mockReturnValue({ range });
    const rpc = vi.fn().mockReturnValue({ order });
    const supabase = {
      rpc,
    } as unknown as SupabaseClient;

    const manifest = await loadQuestionStoreManifest({ supabase });

    expect(manifest.questions.some((question) => question.id === rejectedId)).toBe(
      false,
    );
    expect(rpc).toHaveBeenCalledWith("list_rejected_content_question_ids");
  });
});
