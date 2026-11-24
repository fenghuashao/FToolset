import { parseColor } from './color';

export const recentColorsKey = 'colorPickerRecent';
export const favoriteColorsKey = 'colorPickerFavorites';
export const MAX_RECENT_COLORS = 12;
export const MAX_FAVORITE_COLORS = 24;

export function parseStoredColors(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const parsed = parseColor(item);
    if (!parsed || seen.has(parsed.hex)) continue;
    seen.add(parsed.hex);
    result.push(parsed.hex);
    if (result.length >= limit) break;
  }
  return result;
}

export function addRecentColor(existing: readonly string[], hex: string): string[] {
  const parsed = parseColor(hex);
  if (!parsed) return [...existing].slice(0, MAX_RECENT_COLORS);
  return [parsed.hex, ...existing.filter((item) => item !== parsed.hex)].slice(0, MAX_RECENT_COLORS);
}

export function toggleFavoriteColor(existing: readonly string[], hex: string): string[] {
  const parsed = parseColor(hex);
  if (!parsed) return [...existing].slice(0, MAX_FAVORITE_COLORS);
  if (existing.includes(parsed.hex)) {
    return existing.filter((item) => item !== parsed.hex);
  }
  return [parsed.hex, ...existing].slice(0, MAX_FAVORITE_COLORS);
}
