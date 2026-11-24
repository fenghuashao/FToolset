import { describe, expect, it } from 'vitest';
import { cleanUrl } from '../../src/tools/link-cleaner/clean';

describe('link cleaner', () => {
  it('handles empty and non-http(s) inputs cleanly', () => {
    expect(cleanUrl('   ')).toEqual({ status: 'empty' });
    expect(cleanUrl('not-a-url')).toEqual({ status: 'invalid' });
    expect(cleanUrl('javascript:alert(1)')).toEqual({ status: 'invalid' });
    expect(cleanUrl('chrome://extensions')).toEqual({ status: 'invalid' });
  });

  it('strips global tracking parameters while preserving functional params and hashes', () => {
    const result = cleanUrl(
      'https://example.com/articles/1?q=vitest&utm_source=newsletter&utm_medium=email&fbclid=abc123&page=2#top',
    );
    expect(result.status).toBe('cleaned');
    if (result.status !== 'cleaned') return;

    expect(result.cleanedUrl).toBe('https://example.com/articles/1?q=vitest&page=2#top');
    expect(result.removedCount).toBe(3);
    expect(result.trackingParams.map((item) => item.key)).toEqual([
      'utm_source',
      'utm_medium',
      'fbclid',
    ]);
  });

  it('applies host-scoped rules for YouTube, Bilibili, X, and Amazon without harming functional params', () => {
    const yt = cleanUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&si=xyz123&feature=shared');
    expect(yt.status).toBe('cleaned');
    if (yt.status === 'cleaned') {
      expect(yt.cleanedUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s');
    }

    const bili = cleanUrl('https://www.bilibili.com/video/BV1xx411c7mD/?p=2&t=30&spm_id_from=333.999&vd_source=abc&ts=170000');
    expect(bili.status).toBe('cleaned');
    if (bili.status === 'cleaned') {
      expect(bili.cleanedUrl).toBe('https://www.bilibili.com/video/BV1xx411c7mD/?p=2&t=30');
    }

    // `ts` and `s` should NOT be stripped on unrelated domains.
    const generic = cleanUrl('https://docs.example.com/search?s=query&ts=170000');
    expect(generic.status).toBe('cleaned');
    if (generic.status === 'cleaned') {
      expect(generic.cleanedUrl).toBe('https://docs.example.com/search?s=query&ts=170000');
      expect(generic.removedCount).toBe(0);
    }

    const xPost = cleanUrl('https://x.com/user/status/12345?s=20&t=abcdef');
    expect(xPost.status).toBe('cleaned');
    if (xPost.status === 'cleaned') {
      expect(xPost.cleanedUrl).toBe('https://x.com/user/status/12345');
    }
  });

  it('allows restoring individual removed parameters by entry id', () => {
    const raw = 'https://example.com/?id=9&utm_source=x&utm_campaign=launch';
    const initial = cleanUrl(raw);
    expect(initial.status).toBe('cleaned');
    if (initial.status !== 'cleaned') return;

    const first = initial.trackingParams[0];
    expect(first).toBeDefined();
    if (!first) return;

    const restored = cleanUrl(raw, new Set([first.id]));
    expect(restored.status).toBe('cleaned');
    if (restored.status !== 'cleaned') return;

    expect(restored.cleanedUrl).toBe('https://example.com/?id=9&utm_source=x');
    expect(restored.removedCount).toBe(1);
    expect(restored.trackingParams.map((item) => item.restored)).toEqual([true, false]);
  });
});
