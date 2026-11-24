export type LetterCaseMode = 'upper' | 'lower' | 'sentence' | 'title';

const CJK_OR_FULLWIDTH_END =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}，。！？；：、（）《》【】「」『』]$/u;
const CJK_OR_FULLWIDTH_START =
  /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}，。！？；：、（）《》【】「」『』]/u;

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

export function cleanSpaces(text: string): string {
  return normalizeLineEndings(text)
    .split('\n')
    .map((line) => line.replace(/[ \t\u00a0]+/g, ' ').trim())
    .join('\n')
    .trim();
}

export function removeBlankLines(text: string): string {
  return normalizeLineEndings(text)
    .split('\n')
    .filter((line) => line.trim() !== '')
    .join('\n');
}

export function fixPdfLineBreaks(text: string): string {
  const normalized = normalizeLineEndings(text).trim();
  if (!normalized) return '';

  return normalized
    .split(/\n[ \t]*\n+/)
    .map((paragraph) => {
      const lines = paragraph
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      return lines.reduce((acc, line) => {
        if (!acc) return line;
        const joinTightly = CJK_OR_FULLWIDTH_END.test(acc) || CJK_OR_FULLWIDTH_START.test(line);
        return joinTightly ? `${acc}${line}` : `${acc} ${line}`;
      }, '');
    })
    .filter(Boolean)
    .join('\n\n');
}

export function dedupeLines(text: string): string {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const line of normalizeLineEndings(text).split('\n')) {
    if (seen.has(line)) continue;
    seen.add(line);
    kept.push(line);
  }
  return kept.join('\n');
}

export function transformCase(text: string, mode: LetterCaseMode): string {
  switch (mode) {
    case 'upper':
      return text.toUpperCase();
    case 'lower':
      return text.toLowerCase();
    case 'sentence':
      return text
        .toLowerCase()
        .replace(/(^|[.!?。！？]\s+|\n+)(\p{L})/gu, (_match, prefix: string, letter: string) =>
          `${prefix}${letter.toUpperCase()}`,
        );
    case 'title':
      return text
        .toLowerCase()
        .replace(/(^|[^\p{L}\p{N}'’])(\p{L})/gu, (_match, boundary: string, letter: string) =>
          `${boundary}${letter.toUpperCase()}`,
        );
  }
}
