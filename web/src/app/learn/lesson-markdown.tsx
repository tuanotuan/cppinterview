import { createElement, type ReactNode } from "react";
import remarkParse from "remark-parse";
import { unified } from "unified";

type MarkdownNode = {
  type: string;
  children?: MarkdownNode[];
  value?: string;
  depth?: number;
  ordered?: boolean;
  url?: string;
  alt?: string;
};

export function LessonMarkdown({ markdown }: { markdown: string }) {
  const tree = unified().use(remarkParse).parse(markdown) as unknown as MarkdownNode;
  return (
    <div className="lesson-markdown space-y-4 text-[15px] leading-7 text-[#405149]">
      {renderChildren(tree.children ?? [], "root")}
    </div>
  );
}

function renderChildren(nodes: MarkdownNode[], path: string): ReactNode[] {
  return nodes.map((node, index) =>
    renderNode(node, `${path}-${index}`),
  );
}

function renderNode(node: MarkdownNode, key: string): ReactNode {
  const children = renderChildren(node.children ?? [], key);
  switch (node.type) {
    case "text":
      return node.value ?? "";
    case "paragraph":
      return <p key={key}>{children}</p>;
    case "strong":
      return <strong key={key} className="font-bold text-[#172033]">{children}</strong>;
    case "emphasis":
      return <em key={key}>{children}</em>;
    case "inlineCode":
      return (
        <code key={key} className="rounded-md bg-[#eaf2f8] px-1.5 py-0.5 font-mono text-[0.9em] text-[#16865a]">
          {node.value ?? ""}
        </code>
      );
    case "code":
      return (
        <pre key={key} className="overflow-x-auto rounded-2xl bg-[#092c51] p-5 font-mono text-[13px] leading-6 text-[#e6f8f5]">
          <code>{node.value ?? ""}</code>
        </pre>
      );
    case "heading": {
      const depth = Math.min(6, Math.max(3, node.depth ?? 3));
      return createElement(
        `h${depth}`,
        {
          key,
          className:
            depth === 3
              ? "pt-3 text-xl font-semibold tracking-tight text-[#172033]"
              : "pt-2 text-lg font-semibold text-[#172033]",
        },
        children,
      );
    }
    case "list": {
      const List = node.ordered ? "ol" : "ul";
      return (
        <List
          key={key}
          className={`space-y-2 pl-6 ${node.ordered ? "list-decimal" : "list-disc"}`}
        >
          {children}
        </List>
      );
    }
    case "listItem":
      return <li key={key} className="pl-1">{children}</li>;
    case "blockquote":
      return (
        <blockquote key={key} className="border-l-4 border-[#138f8c] bg-[#e6f8f5] px-4 py-3 text-[#43546a]">
          {children}
        </blockquote>
      );
    case "link": {
      const href = safeHref(node.url);
      return href ? (
        <a key={key} href={href} className="font-semibold text-[#16865a] underline decoration-[#138f8c] underline-offset-4">
          {children}
        </a>
      ) : (
        <span key={key}>{children}</span>
      );
    }
    case "break":
      return <br key={key} />;
    case "thematicBreak":
      return <hr key={key} className="border-[#0f3a69]/12" />;
    case "image":
      return node.alt ? <span key={key}>[Hình: {node.alt}]</span> : null;
    case "html":
      return null;
    default:
      return children.length ? <span key={key}>{children}</span> : null;
  }
}

function safeHref(value: string | undefined) {
  if (!value) return null;
  return /^(?:https?:\/\/|\/|#)/u.test(value) ? value : null;
}
