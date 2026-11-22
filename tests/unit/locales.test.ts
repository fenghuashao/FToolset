import { describe, expect, it } from 'vitest';
import en from '../../public/_locales/en/messages.json';
import zh from '../../public/_locales/zh_CN/messages.json';

describe('Chrome message catalogs', () => {
  it('ships the same nonempty messages in English and Simplified Chinese', () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort());
    for (const catalog of [en, zh]) {
      for (const [key, { message }] of Object.entries(catalog)) {
        expect(message.trim(), key).not.toBe('');
      }
    }
  });

  it('keeps the store name and short descriptions in the Chrome limits', () => {
    for (const catalog of [en, zh]) {
      expect(catalog.extensionName.message).toBe('FToolset');
      expect(catalog.extensionDescription.message.length).toBeLessThanOrEqual(132);
    }
  });
});
