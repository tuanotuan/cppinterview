const SIMPLE_EXAMPLE_SECTION_POSITION = 8;

export type LessonReaderBlock<T> =
  | { kind: "section"; section: T; sectionIndex: number }
  | { kind: "sample-code" };

export function buildLessonReaderBlocks<T>(
  sections: readonly T[],
  hasSampleCode: boolean,
): LessonReaderBlock<T>[] {
  const blocks: LessonReaderBlock<T>[] = sections.map((section, sectionIndex) => ({
    kind: "section",
    section,
    sectionIndex,
  }));

  if (!hasSampleCode) return blocks;

  blocks.splice(Math.min(SIMPLE_EXAMPLE_SECTION_POSITION, blocks.length), 0, {
    kind: "sample-code",
  });
  return blocks;
}
