import { readFile } from "node:fs/promises";

import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import { LessonAiAssistant } from "./lesson-ai-assistant";

const messages = {
  Learn: {
    reader: {
      ai: {
        eyebrow: "Lesson tutor",
        title: "Learn with AI",
        description: "Ask about this lesson.",
        transcriptAria: "Lesson tutor conversation",
        emptyTitle: "What would you like to understand?",
        emptyBody: "Ask one specific question.",
        assistantLabel: "Luna",
        userLabel: "You",
        loading: "Luna is reading…",
        retry: "Try again",
        editQuestion: "Edit question",
        turnLimit: "Reached {count} questions.",
        questionLabel: "Your question",
        clear: "Clear conversation",
        placeholder: "Ask a question",
        keyboardHint: "Enter to send · Shift + Enter for a new line",
        send: "Send question",
        sending: "Asking Luna…",
        quotaRemaining: "{remaining}/{limit} turns left",
        grounding: {
          lesson: "Grounded in this lesson",
          lessonPlusGeneral: "Lesson + additional C++ context",
          outsideScope: "Outside scope",
        },
        errors: {
          generic: "Could not answer.",
          network: "Could not connect.",
        },
      },
    },
  },
};

describe("LessonAiAssistant", () => {
  it("renders one accessible, responsive, idle assistant without calling AI", () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={messages}>
        <LessonAiAssistant
          contextHash={"a".repeat(64)}
          lessonId="cpp11-toolchain"
          locale="en"
          sections={[{ id: "toolchain", label: "1. Toolchain" }]}
        />
      </NextIntlClientProvider>,
    );

    expect(html).toContain("Learn with AI");
    expect(html).toContain("Your question");
    expect(html).toContain("Enter to send");
    expect(html).toContain('role="log"');
    expect(html).toContain('aria-busy="false"');
    expect(html).toContain("xl:col-start-3");
    expect(html).toContain("xl:sticky");
    expect(html).not.toContain("/api/coach/lesson");
    expect(html).not.toContain("dangerouslySetInnerHTML");
  });

  it("does not submit Enter while an IME composition is active", async () => {
    const source = await readFile(
      new URL("./lesson-ai-assistant.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("!event.nativeEvent.isComposing");
  });
});
