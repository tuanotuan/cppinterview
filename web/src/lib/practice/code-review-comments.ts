export type CodeReviewComment = {
  line: number;
  comment: string;
};

const commentHeader = /^\[Dòng (\d+)\]\s*$/;

export function parseCodeReviewComments(value: string): CodeReviewComment[] {
  const blocks = value.trim().split(/\n\s*\n/);
  const comments: CodeReviewComment[] = [];

  for (const block of blocks) {
    const [header, ...body] = block.split("\n");
    const match = commentHeader.exec(header?.trim() ?? "");
    const line = Number(match?.[1]);
    const comment = body.join("\n").trim();
    if (!match || !Number.isInteger(line) || line < 1 || !comment) continue;
    comments.push({ line, comment });
  }

  return comments.sort((left, right) => left.line - right.line);
}

export function renderCodeReviewComments(comments: readonly CodeReviewComment[]) {
  return [...comments]
    .filter(
      (item) =>
        Number.isInteger(item.line) && item.line > 0 && item.comment.trim(),
    )
    .sort((left, right) => left.line - right.line)
    .map((item) => `[Dòng ${item.line}]\n${item.comment.trim()}`)
    .join("\n\n");
}
