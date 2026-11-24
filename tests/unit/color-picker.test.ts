import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COLOR_HEX,
  evaluateContrast,
  hslToRgb,
  parseColor,
  rgbToHex,
  rgbToHsl,
} from '../../src/tools/color-picker/color';
import {
  addRecentColor,
  MAX_RECENT_COLORS,
  parseStoredColors,
  toggleFavoriteColor,
} from '../../src/tools/color-picker/storage';

describe('color parsing and conversion', () => {
  it('parses 6-digit hex, 3-digit hex, rgb, and hsl formats', () => {
    const brand = parseColor('#314bd8');
    expect(brand).not.toBeNull();
    expect(brand?.hex).toBe('#314BD8');
    expect(brand?.rgb).toEqual({ r: 49, g: 75, b: 216 });
    expect(brand?.rgbString).toBe('rgb(49, 75, 216)');
    expect(brand?.hslString).toBe('hsl(231, 68%, 52%)');

    expect(parseColor('314BD8')?.hex).toBe('#314BD8');
    expect(parseColor('#0f8')?.hex).toBe('#00FF88');
    expect(parseColor('f0a')?.hex).toBe('#FF00AA');
    expect(parseColor('rgb(16, 185, 129)')?.hex).toBe('#10B981');
    expect(parseColor('rgb(16 185 129)')?.hex).toBe('#10B981');
    expect(parseColor('hsl(0, 100%, 50%)')?.hex).toBe('#FF0000');
    expect(parseColor('hsl(120deg 100% 50%)')?.hex).toBe('#00FF00');
  });

  it('rejects malformed or out-of-range colors', () => {
    for (const invalid of ['', '   ', '#12', '#12345g', 'rgb(256, 0, 0)', 'hsl(361, 50%, 50%)', 'hsl(120, 101%, 50%)', 'blue']) {
      expect(parseColor(invalid), invalid).toBeNull();
    }
  });

  it('round-trips standard RGB and HSL primaries cleanly', () => {
    const samples = [
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 255, b: 255 },
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 255, b: 0 },
      { r: 0, g: 0, b: 255 },
      { r: 255, g: 255, b: 0 },
    ];
    for (const rgb of samples) {
      expect(hslToRgb(rgbToHsl(rgb))).toEqual(rgb);
      expect(parseColor(rgbToHex(rgb))?.rgb).toEqual(rgb);
    }
  });

  it('calculates WCAG 2.1 contrast ratios and levels accurately', () => {
    const black = parseColor('#000000');
    const white = parseColor('#FFFFFF');
    const brand = parseColor(DEFAULT_COLOR_HEX);

    expect(black?.onWhite.formatted).toBe('21.00:1');
    expect(black?.onWhite.level).toBe('AAA');
    expect(black?.onBlack.formatted).toBe('1.00:1');
    expect(black?.onBlack.level).toBe('Fail');
    expect(black?.recommendedText).toBe('#FFFFFF');

    expect(white?.onBlack.formatted).toBe('21.00:1');
    expect(white?.onBlack.level).toBe('AAA');
    expect(white?.recommendedText).toBe('#000000');

    expect(brand?.onWhite.formatted).toBe('6.71:1');
    expect(brand?.onWhite.level).toBe('AA');
    expect(brand?.onBlack.formatted).toBe('3.13:1');
    expect(brand?.onBlack.level).toBe('AA Large');

    const deepBlue = parseColor('#111B46');
    expect(deepBlue?.onWhite.level).toBe('AAA');

    const midGray = evaluateContrast({ r: 118, g: 118, b: 118 }, { r: 255, g: 255, b: 255 });
    expect(midGray.level).toBe('AA');
  });
});

describe('color storage helpers', () => {
  it('sanitizes, deduplicates, and caps stored color arrays', () => {
    expect(parseStoredColors(undefined, 12)).toEqual([]);
    expect(parseStoredColors(['#abc', '#AABBCC', 'invalid', 42, '00ff00'], 12)).toEqual([
      '#AABBCC',
      '#00FF00',
    ]);
    expect(parseStoredColors(['#111111', '#222222', '#333333'], 2)).toEqual([
      '#111111',
      '#222222',
    ]);
  });

  it('moves newly picked colors to front and enforces MAX_RECENT_COLORS', () => {
    let recent: string[] = [];
    for (let i = 0; i < MAX_RECENT_COLORS + 3; i++) {
      const hex = `#${i.toString(16).padStart(2, '0')}2233`;
      recent = addRecentColor(recent, hex);
    }
    expect(recent).toHaveLength(MAX_RECENT_COLORS);
    expect(recent[0]).toBe('#0E2233');

    const promoted = addRecentColor(recent, recent[5] ?? '#000000');
    expect(promoted).toHaveLength(MAX_RECENT_COLORS);
    expect(promoted[0]).toBe(recent[5]);
  });

  it('toggles favorite colors on and off', () => {
    const added = toggleFavoriteColor([], '#314bd8');
    expect(added).toEqual(['#314BD8']);
    const removed = toggleFavoriteColor(added, '#314BD8');
    expect(removed).toEqual([]);
  });
});
