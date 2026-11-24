export type ReadingTime =
  | { readonly kind: 'zero' }
  | { readonly kind: 'under_one' }
  | { readonly kind: 'minutes'; readonly minutes: number };

export interface TextStats {
  readonly characters: number;
  readonly charactersNoSpaces: number;
  readonly cjkCharacters: number;
  readonly latinWords: number;
  readonly words: number;
  readonly paragraphs: number;
  readonly readingTime: ReadingTime;
}

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const wordSegmenter = new Intl.Segmenter('en', { granularity: 'word' });
const hanCharPattern = /\p{Script=Han}/u;
const whitespaceOnlyPattern = /^\s+$/u;

export function analyzeText(text: string): TextStats {
  if (!text) {
    return {
      characters: 0,
      charactersNoSpaces: 0,
      cjkCharacters: 0,
      latinWords: 0,
      words: 0,
      paragraphs: 0,
      readingTime: { kind: 'zero' },
    };
  }

  let characters = 0;
  let charactersNoSpaces = 0;
  let cjkCharacters = 0;

  for (const { segment } of graphemeSegmenter.segment(text)) {
    characters += 1;
    if (!whitespaceOnlyPattern.test(segment)) {
      charactersNoSpaces += 1;
      if (hanCharPattern.test(segment)) {
        cjkCharacters += 1;
      }
    }
  }

  let latinWords = 0;
  for (const { segment, isWordLike } of wordSegmenter.segment(text)) {
    if (isWordLike && !hanCharPattern.test(segment)) {
      latinWords += 1;
    }
  }

  const words = cjkCharacters + latinWords;
  const paragraphs = text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '').length;

  let readingTime: ReadingTime;
  if (words === 0) {
    readingTime = { kind: 'zero' };
  } else {
    const rawMinutes = cjkCharacters / 300 + latinWords / 200;
    readingTime = rawMinutes < 1
      ? { kind: 'under_one' }
      : { kind: 'minutes', minutes: Math.ceil(rawMinutes) };
  }

  return {
    characters,
    charactersNoSpaces,
    cjkCharacters,
    latinWords,
    words,
    paragraphs,
    readingTime,
  };
}
