const comparable = (text: string) => text.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\s]/gu, '');

/** Reject substantial copied clauses, while allowing topic words, greetings and
 * quotations followed by an original contribution. This is lexical validation,
 * not a semantic or factual quality grade. */
export function copiedContribution(text: string, sources: readonly string[]): boolean {
  const unquoted = text.replace(/「[^」]*」|『[^』]*』|“[^”]*”/gu, '');
  const candidate = comparable(comparable(unquoted).length >= 12 ? unquoted : text);
  if (candidate.length < 14) return false;
  const grams = (s: string) => new Set(Array.from({ length: Math.max(0, s.length - 2) }, (_, i) => s.slice(i, i + 3)));
  const a = grams(candidate);
  return sources.some((source) => {
    const previous = comparable(source);
    if (previous.length < 14) return false;
    if (previous.includes(candidate)) return true;
    // Copying a source's complete first-person sentence is still copying when
    // the model appends a short acknowledgement or rephrases its ending.
    const clauses = source.split(/[。！？!?\n]/u).map(comparable).filter((s) => s.length >= 18);
    if (clauses.some((s) => candidate.includes(s))) return true;
    const b = grams(previous), shared = [...a].filter((g) => b.has(g)).length;
    return shared / Math.max(a.size, b.size) >= .62 && shared / a.size >= .72;
  });
}

/** Catch observed incomplete prose, without requiring punctuation for short
 * chat-like replies or claiming to understand arbitrary Japanese answers. */
export function unfinishedContribution(text: string): boolean {
  const body = text.trim();
  if (body.length >= 80 && /[ぁ-んァ-ヶ]/u.test(body) && !/[。！？!?…」』）)”"]$/u.test(body)) return true;
  const last = body.split(/(?<=[。！？!?])\s*/u).filter(Boolean).at(-1) ?? '';
  return /(?:以下|次)の(?:手順|方法|とおり|通り|よう)/u.test(last) && !/[：:\n]/u.test(last);
}
