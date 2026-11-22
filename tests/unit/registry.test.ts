import { describe, expect, it } from 'vitest';
import en from '../../public/_locales/en/messages.json';
import zh from '../../public/_locales/zh_CN/messages.json';
import { getShareablePageUrl } from '../../src/shared/launch';
import { defaultToolId, getTool, searchTools, toolRegistry } from '../../src/tools/registry';

describe('tool registry', () => {
  it('registers unique tool IDs and names the default tool', () => {
    expect(new Set(toolRegistry.map((tool) => tool.id)).size).toBe(toolRegistry.length);
    expect(getTool(defaultToolId).id).toBe('qr-code');
  });

  it.each([undefined, null, '', 4, 'removed-tool'])('falls back for saved tool ID %s', (id) => {
    expect(getTool(id).id).toBe(defaultToolId);
  });

  it('matches localized names, descriptions, keywords and multiple terms', () => {
    expect(searchTools(' QR  link ', (key) => en[key].message)).toEqual(toolRegistry);
    expect(searchTools('转换', (key) => zh[key].message)).toEqual(toolRegistry);
    expect(searchTools('二维码', (key) => zh[key].message)).toEqual(toolRegistry);
    expect(searchTools('barcode', (key) => en[key].message)).toEqual(toolRegistry);
    expect(searchTools('  ', (key) => en[key].message)).toEqual(toolRegistry);
    expect(searchTools('timestamp', (key) => en[key].message)).toEqual([]);
  });
});

describe('current page URL', () => {
  it.each(['https://example.com/a#heading', 'http://localhost:4000/?a=b', 'file:///tmp/example.txt'])(
    'preserves a shareable URL (%s)',
    (url) => expect(getShareablePageUrl(url)).toBe(url),
  );

  it.each([undefined, '', 'about:blank', 'chrome://newtab/', 'chrome-extension://id/popup.html', 'text'])(
    'falls back to empty content (%s)',
    (url) => expect(getShareablePageUrl(url)).toBe(''),
  );
});
