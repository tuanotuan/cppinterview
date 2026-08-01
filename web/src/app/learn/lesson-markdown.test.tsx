import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LessonMarkdown } from "./lesson-markdown";

describe("lesson Markdown renderer", () => {
  it("renders common lesson structures and drops raw HTML", () => {
    const html = renderToStaticMarkup(
      <LessonMarkdown
        markdown={[
          "### Mental model",
          "",
          "Use `std::vector` safely.",
          "",
          "- first",
          "- second",
          "",
          "```cpp",
          "int value = 1;",
          "```",
          "",
          "<script>alert('xss')</script>",
        ].join("\n")}
      />,
    );

    expect(html).toContain("Mental model");
    expect(html).toContain("<ul");
    expect(html).toContain("int value = 1;");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert");
  });

  it("does not create a link for unsafe protocols", () => {
    const html = renderToStaticMarkup(
      <LessonMarkdown markdown="[bad](javascript:alert(1))" />,
    );

    expect(html).not.toContain("href=");
    expect(html).toContain("bad");
  });
});
