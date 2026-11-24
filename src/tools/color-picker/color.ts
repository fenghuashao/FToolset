export interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface HslColor {
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

export type WcagLevel = 'AAA' | 'AA' | 'AA Large' | 'Fail';

export interface ContrastResult {
  readonly ratio: number;
  readonly formatted: string;
  readonly level: WcagLevel;
}

export interface ParsedColor {
  readonly hex: string;
  readonly rgb: RgbColor;
  readonly hsl: HslColor;
  readonly rgbString: string;
  readonly hslString: string;
  readonly onWhite: ContrastResult;
  readonly onBlack: ContrastResult;
  readonly recommendedText: '#FFFFFF' | '#000000';
}

export const DEFAULT_COLOR_HEX = '#314BD8';

const hex6Pattern = /^#?([0-9a-f]{6})$/i;
const hex3Pattern = /^#?([0-9a-f]{3})$/i;
const rgbPattern = /^rgb\(\s*(\d{1,3})\s*(?:,\s*|\s+)(\d{1,3})\s*(?:,\s*|\s+)(\d{1,3})\s*\)$/i;
const hslPattern = /^hsl\(\s*(\d{1,3})\s*(?:deg)?\s*(?:,\s*|\s+)(\d{1,3})%\s*(?:,\s*|\s+)(\d{1,3})%\s*\)$/i;

function isByte(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 255;
}

function byteToHex(value: number): string {
  return value.toString(16).padStart(2, '0').toUpperCase();
}

export function rgbToHex({ r, g, b }: RgbColor): string {
  return `#${byteToHex(r)}${byteToHex(g)}${byteToHex(b)}`;
}

export function rgbToHsl({ r, g, b }: RgbColor): HslColor {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === rn) {
      h = 60 * (((gn - bn) / delta) % 6);
    } else if (max === gn) {
      h = 60 * ((bn - rn) / delta + 2);
    } else {
      h = 60 * ((rn - gn) / delta + 4);
    }
  }

  const normalizedHue = Math.round((h + 360) % 360) % 360;
  return {
    h: normalizedHue,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToRgb({ h, s, l }: HslColor): RgbColor {
  const hue = ((h % 360) + 360) % 360;
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hue < 60) [r1, g1, b1] = [c, x, 0];
  else if (hue < 120) [r1, g1, b1] = [x, c, 0];
  else if (hue < 180) [r1, g1, b1] = [0, c, x];
  else if (hue < 240) [r1, g1, b1] = [0, x, c];
  else if (hue < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function linearizeChannel(channel8Bit: number): number {
  const srgb = channel8Bit / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance({ r, g, b }: RgbColor): number {
  return 0.2126 * linearizeChannel(r) + 0.7152 * linearizeChannel(g) + 0.0722 * linearizeChannel(b);
}

export function getContrastRatio(first: RgbColor, second: RgbColor): number {
  const l1 = relativeLuminance(first);
  const l2 = relativeLuminance(second);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function evaluateContrast(first: RgbColor, second: RgbColor): ContrastResult {
  const ratio = getContrastRatio(first, second);
  let level: WcagLevel = 'Fail';
  if (ratio >= 7) level = 'AAA';
  else if (ratio >= 4.5) level = 'AA';
  else if (ratio >= 3) level = 'AA Large';
  return {
    ratio,
    formatted: `${ratio.toFixed(2)}:1`,
    level,
  };
}

function parseRgb(input: string): RgbColor | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const match6 = hex6Pattern.exec(trimmed);
  if (match6?.[1]) {
    const raw = match6[1];
    return {
      r: Number.parseInt(raw.slice(0, 2), 16),
      g: Number.parseInt(raw.slice(2, 4), 16),
      b: Number.parseInt(raw.slice(4, 6), 16),
    };
  }

  const match3 = hex3Pattern.exec(trimmed);
  if (match3?.[1]) {
    const raw = match3[1];
    return {
      r: Number.parseInt(raw.charAt(0).repeat(2), 16),
      g: Number.parseInt(raw.charAt(1).repeat(2), 16),
      b: Number.parseInt(raw.charAt(2).repeat(2), 16),
    };
  }

  const matchRgb = rgbPattern.exec(trimmed);
  if (matchRgb?.[1] && matchRgb[2] && matchRgb[3]) {
    const r = Number(matchRgb[1]);
    const g = Number(matchRgb[2]);
    const b = Number(matchRgb[3]);
    if (isByte(r) && isByte(g) && isByte(b)) return { r, g, b };
    return null;
  }

  const matchHsl = hslPattern.exec(trimmed);
  if (matchHsl?.[1] && matchHsl[2] && matchHsl[3]) {
    const h = Number(matchHsl[1]);
    const s = Number(matchHsl[2]);
    const l = Number(matchHsl[3]);
    if (h >= 0 && h <= 360 && s >= 0 && s <= 100 && l >= 0 && l <= 100) {
      return hslToRgb({ h, s, l });
    }
    return null;
  }

  return null;
}

const WHITE_RGB: RgbColor = { r: 255, g: 255, b: 255 };
const BLACK_RGB: RgbColor = { r: 0, g: 0, b: 0 };

export function parseColor(input: string): ParsedColor | null {
  const rgb = parseRgb(input);
  if (!rgb) return null;
  const hex = rgbToHex(rgb);
  const hsl = rgbToHsl(rgb);
  const onWhite = evaluateContrast(rgb, WHITE_RGB);
  const onBlack = evaluateContrast(rgb, BLACK_RGB);

  return {
    hex,
    rgb,
    hsl,
    rgbString: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    hslString: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    onWhite,
    onBlack,
    recommendedText: onWhite.ratio >= onBlack.ratio ? '#FFFFFF' : '#000000',
  };
}
