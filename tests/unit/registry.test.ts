import { describe, expect, it } from 'vitest';
import en from '../../public/_locales/en/messages.json';
import zh from '../../public/_locales/zh_CN/messages.json';
import {
  getShareablePageUrl,
  isSafeHttpUrl,
  parsePendingLaunch,
  parsePinnedToolIds,
  parseTabHandoff,
} from '../../src/shared/launch';
import { TOOL_IDS } from '../../src/shared/tool-ids';
import { defaultPinnedToolIds, defaultToolId, getTool, searchTools, toolRegistry } from '../../src/tools/registry';

describe('tool registry', () => {
  it('registers unique tool IDs and names the default tool', () => {
    expect(new Set(toolRegistry.map((tool) => tool.id)).size).toBe(toolRegistry.length);
    expect(toolRegistry.map((tool) => tool.id)).toEqual([
      TOOL_IDS.qrCode,
      TOOL_IDS.linkCleaner,
      TOOL_IDS.textCleaner,
      TOOL_IDS.colorPicker,
    ]);
    expect(getTool(defaultToolId).id).toBe('qr-code');
  });

  it.each([undefined, null, '', 4, 'removed-tool'])('falls back for saved tool ID %s', (id) => {
    expect(getTool(id).id).toBe(defaultToolId);
  });

  it('matches localized names, descriptions, keywords and multiple terms', () => {
    const ids = (query: string, catalog: typeof en) =>
      searchTools(query, (key) => catalog[key].message).map((tool) => tool.id);

    expect(ids(' QR  link ', en)).toEqual([TOOL_IDS.qrCode]);
    expect(ids('二维码', zh)).toEqual([TOOL_IDS.qrCode]);
    expect(ids('utm', en)).toEqual([TOOL_IDS.linkCleaner]);
    expect(ids('追踪 参数', zh)).toEqual([TOOL_IDS.linkCleaner]);
    expect(ids('word count', en)).toEqual([TOOL_IDS.textCleaner]);
    expect(ids('字数 断行', zh)).toEqual([TOOL_IDS.textCleaner]);
    expect(ids('eyedropper wcag', en)).toEqual([TOOL_IDS.colorPicker]);
    expect(ids('取色 对比度', zh)).toEqual([TOOL_IDS.colorPicker]);
    expect(ids('  ', en)).toEqual(toolRegistry.map((tool) => tool.id));
    expect(ids('timestamp', en)).toEqual([]);
  });
});

describe('URL and launch helpers', () => {
  it.each(['https://example.com/a#heading', 'http://localhost:4000/?a=b', 'file:///tmp/example.txt'])(
    'preserves a shareable URL (%s)',
    (url) => expect(getShareablePageUrl(url)).toBe(url),
  );

  it.each([undefined, '', 'about:blank', 'chrome://newtab/', 'chrome-extension://id/popup.html', 'text'])(
    'falls back to empty content (%s)',
    (url) => expect(getShareablePageUrl(url)).toBe(''),
  );

  it('allows only http and https URLs in isSafeHttpUrl', () => {
    expect(isSafeHttpUrl('https://example.com/path?a=1')).toBe(true);
    expect(isSafeHttpUrl('http://localhost:3000')).toBe(true);
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeHttpUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeHttpUrl('not a url')).toBe(false);
  });

  it('validates structured pending launch payloads', () => {
    expect(parsePendingLaunch({ toolId: TOOL_IDS.textCleaner, text: 'hello' })).toEqual({
      toolId: TOOL_IDS.textCleaner,
      text: 'hello',
    });
    expect(parsePendingLaunch({ toolId: 'unknown', text: 'hello' })).toBeNull();
    expect(parsePendingLaunch({ toolId: TOOL_IDS.qrCode, text: '' })).toBeNull();
    expect(parsePendingLaunch('legacy-string')).toBeNull();
  });

  it('validates tab handoff payloads and filters non-shareable source URLs', () => {
    expect(parseTabHandoff({
      toolId: TOOL_IDS.linkCleaner,
      text: 'https://example.com/?utm_source=a',
      sourceUrl: 'https://example.com/',
    })).toEqual({
      toolId: TOOL_IDS.linkCleaner,
      text: 'https://example.com/?utm_source=a',
      sourceUrl: 'https://example.com/',
    });
    expect(parseTabHandoff({
      toolId: TOOL_IDS.textCleaner,
      text: '',
      sourceUrl: 'chrome://extensions',
    })).toEqual({
      toolId: TOOL_IDS.textCleaner,
      text: '',
      sourceUrl: undefined,
    });
    expect(parseTabHandoff({ toolId: 'invalid' })).toBeNull();
  });

  it('sanitizes pinned quick-bar tool IDs with deduplication and fallback', () => {
    expect(parsePinnedToolIds(undefined, defaultPinnedToolIds)).toEqual(defaultPinnedToolIds);
    expect(parsePinnedToolIds([], defaultPinnedToolIds)).toEqual([]);
    expect(parsePinnedToolIds(['text-cleaner', 'unknown', 'text-cleaner', 'qr-code'], defaultPinnedToolIds)).toEqual([
      TOOL_IDS.textCleaner,
      TOOL_IDS.qrCode,
    ]);
  });
});
