import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getRepoContentManifest,
  loadQuestionStoreManifest,
  loadSupabaseContentManifest,
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

  it("loads C++14 lessons from the database content store", async () => {
    const cpp14Lesson: LessonRow = {
      id: "cpp14-toolchain",
      lifecycle_status: "active",
      source_hash: "a".repeat(64),
      source_commit_sha: null,
      source_path: "cpp14/01_toolchain",
      standard: "cpp14",
      language: "cpp",
      track: "cpp14",
      lesson_order: 1,
      title: "C++14 toolchain",
      tags: ["toolchain"],
      prerequisites: [],
      code: "int main() {}",
      sections: [
        {
          id: "toolchain",
          heading: "Toolchain",
          bodyMarkdown: "Compiler pipeline",
          bodyText: "Compiler pipeline",
        },
      ],
      checklist_items: [],
      manifest_order: 1,
    };
    const relationCalls = new Map<string, number>();
    const from = vi.fn((relation: string) => {
      if (relation === "content_store_state") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { source_revision: "b".repeat(64) },
                error: null,
              }),
            }),
          }),
        };
      }

      const query = {
        select: () => query,
        order: () => query,
        range: async () => {
          const call = relationCalls.get(relation) ?? 0;
          relationCalls.set(relation, call + 1);
          return {
            data:
              call === 0 && relation === "content_current_lessons"
                ? [cpp14Lesson]
                : [],
            error: null,
          };
        },
      };
      return query;
    });
    const supabase = { from } as unknown as SupabaseClient;

    const manifest = await loadSupabaseContentManifest(supabase);

    expect(manifest.lessons).toHaveLength(1);
    expect(manifest.lessons[0]).toMatchObject({
      id: cpp14Lesson.id,
      track: "cpp14",
      standard: "cpp14",
    });
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
