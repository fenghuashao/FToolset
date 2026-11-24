import { describe, expect, it } from 'vitest';
import { analyzeText } from '../../src/tools/text-cleaner/stats';
import {
  cleanSpaces,
  dedupeLines,
  fixPdfLineBreaks,
  removeBlankLines,
  transformCase,
} from '../../src/tools/text-cleaner/transform';

describe('text stats', () => {
  it('returns zeroes for empty input', () => {
    expect(analyzeText('')).toEqual({
      characters: 0,
      charactersNoSpaces: 0,
      cjkCharacters: 0,
      latinWords: 0,
      words: 0,
      paragraphs: 0,
      readingTime: { kind: 'zero' },
    });
  });

  it('counts emoji grapheme clusters and mixed Chinese/English words accurately', () => {
    const stats = analyzeText('你好世界 hello world 👨‍👩‍👧‍👦\n\n第二段');
    expect(stats.characters).toBe(23);
    expect(stats.charactersNoSpaces).toBe(18);
    expect(stats.cjkCharacters).toBe(7);
    expect(stats.latinWords).toBe(2);
    expect(stats.words).toBe(9);
    expect(stats.paragraphs).toBe(2);
    expect(stats.readingTime).toEqual({ kind: 'under_one' });
  });

  it('estimates multi-minute reading time for longer texts', () => {
    const longEnglish = Array.from({ length: 450 }, () => 'word').join(' ');
    expect(analyzeText(longEnglish).readingTime).toEqual({ kind: 'minutes', minutes: 3 });
  });
});

describe('text transforms', () => {
  it('cleans redundant spaces and trims outer lines', () => {
    expect(cleanSpaces('  hello   world \t \r\n  foo   bar  \n')).toBe('hello world\nfoo bar');
  });

  it('removes blank lines while keeping non-empty lines intact', () => {
    expect(removeBlankLines('a\n\n   \nb\r\n\r\nc')).toBe('a\nb\nc');
  });

  it('fixes PDF line breaks for both Chinese and English while preserving paragraph boundaries', () => {
    const mixed = '这是一段从 PDF 复制出来的\n中文段落。\n\nThis is an English\nparagraph split across lines.';
    expect(fixPdfLineBreaks(mixed)).toBe(
      '这是一段从 PDF 复制出来的中文段落。\n\nThis is an English paragraph split across lines.',
    );
  });

  it('deduplicates lines preserving first occurrence order', () => {
    expect(dedupeLines('apple\nbanana\napple\ncherry\nbanana')).toBe('apple\nbanana\ncherry');
  });

  it('converts English letter cases predictably', () => {
    expect(transformCase('hello world', 'upper')).toBe('HELLO WORLD');
    expect(transformCase('HELLO WORLD', 'lower')).toBe('hello world');
    expect(transformCase('hello world. how ARE you?\nnext line', 'sentence')).toBe(
      'Hello world. How are you?\nNext line',
    );
    expect(transformCase("don't stop believing in ftoolset", 'title')).toBe(
      "Don't Stop Believing In Ftoolset",
    );
  });
});
