/**
 * Normalize superficial formatting differences before comparing interview prompts.
 * The normalized value is only a duplicate-detection key; authored prompts stay intact.
 *
 * @param {string} value
 */
export function normalizeInterviewQuestionPrompt(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’]/gu, "'")
    .replace(/[“”]/gu, '"')
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/\s*[?!.…]+$/u, "");
}
