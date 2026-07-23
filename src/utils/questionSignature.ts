/**
 * Semantic signature for questions.
 *
 * Normalises a question text so that variants which only differ in numbers,
 * punctuation, whitespace or capitalisation collapse to the same key.
 * Used to deduplicate "essentially the same" tasks (e.g. "25 - 13 = ?" and
 * "26 - 14 = ?" both map to "# - # = #").
 */
export function questionSignature(text: unknown): string {
  if (typeof text !== "string") return "";
  return text
    .toLowerCase()
    // Replace decimal / fractional / plain numbers with a placeholder
    .replace(/\d+(?:[.,]\d+)?(?:\/\d+)?/g, "#")
    // Strip punctuation but keep math operators for structural context
    .replace(/[^\p{L}\p{N}#+\-*/=<>×÷·\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSignatureSet(texts: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const t of texts) {
    const sig = questionSignature(t);
    if (sig) out.add(sig);
  }
  return out;
}