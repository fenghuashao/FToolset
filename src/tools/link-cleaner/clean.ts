import { isSafeHttpUrl } from '../../shared/launch';
import { isTrackingParam } from './rules';

export interface TrackingParamEntry {
  readonly id: string;
  readonly key: string;
  readonly value: string;
  readonly restored: boolean;
}

export type CleanUrlResult =
  | { readonly status: 'empty' }
  | { readonly status: 'invalid' }
  | {
      readonly status: 'cleaned';
      readonly originalUrl: string;
      readonly cleanedUrl: string;
      readonly trackingParams: readonly TrackingParamEntry[];
      readonly removedCount: number;
    };

export function cleanUrl(
  raw: string,
  restoredIds: ReadonlySet<string> = new Set(),
): CleanUrlResult {
  const trimmed = raw.trim();
  if (!trimmed) return { status: 'empty' };
  if (!isSafeHttpUrl(trimmed)) return { status: 'invalid' };

  const parsed = new URL(trimmed);
  const originalEntries = Array.from(parsed.searchParams.entries());
  const trackingParams: TrackingParamEntry[] = [];
  const kept = new URLSearchParams();
  let removedCount = 0;

  originalEntries.forEach(([key, value], index) => {
    const id = `${index}:${key}`;
    if (isTrackingParam(parsed.hostname, key)) {
      const restored = restoredIds.has(id);
      trackingParams.push({ id, key, value, restored });
      if (restored) {
        kept.append(key, value);
      } else {
        removedCount += 1;
      }
    } else {
      kept.append(key, value);
    }
  });

  const nextUrl = new URL(parsed.href);
  nextUrl.search = kept.toString();

  return {
    status: 'cleaned',
    originalUrl: trimmed,
    cleanedUrl: nextUrl.toString(),
    trackingParams,
    removedCount,
  };
}
