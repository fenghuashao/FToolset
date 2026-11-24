import { afterEach, describe, expect, it, vi } from 'vitest';
import background from '../../entrypoints/background';
import { consumePendingLaunchMessage, pendingLaunchKey, type ToolLaunch } from '../../src/shared/launch';
import { TOOL_IDS } from '../../src/shared/tool-ids';

async function startBackground() {
  const installed = vi.fn<(listener: () => void) => void>();
  const clicked = vi.fn<(listener: (info: chrome.contextMenus.OnClickData) => void) => void>();
  const messaged = vi.fn<(listener: (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    respond: (value: ToolLaunch | null) => void,
  ) => boolean | undefined) => void>();
  const create = vi.fn();
  const openPopup = vi.fn().mockRejectedValue(new Error('Action popup is unavailable'));
  const items: Record<string, unknown> = {};
  const session = {
    set: vi.fn(async (values: Record<string, unknown>) => { Object.assign(items, values); }),
    get: vi.fn(async (key: string) => ({ [key]: items[key] })),
    remove: vi.fn(async (key: string) => { delete items[key]; }),
  };

  vi.stubGlobal('chrome', {
    i18n: { getMessage: (key: string) => key },
    runtime: { onInstalled: { addListener: installed }, onMessage: { addListener: messaged } },
    action: { openPopup },
    contextMenus: {
      removeAll: (callback: () => void) => callback(),
      create,
      onClicked: { addListener: clicked },
    },
    storage: { session },
  });

  await background.main();
  const install = installed.mock.calls[0]?.[0];
  const click = clicked.mock.calls[0]?.[0];
  const message = messaged.mock.calls[0]?.[0];
  if (!install || !click || !message) throw new Error('Background listeners were not registered');

  const consume = () => new Promise<ToolLaunch | null>((resolve) => {
    expect(message({ type: consumePendingLaunchMessage }, {}, resolve)).toBe(true);
  });

  return { create, openPopup, items, install, click, consume };
}

afterEach(() => vi.unstubAllGlobals());

describe('multi-tool context menus', () => {
  it('registers distinct localized actions for selections and links across tools', async () => {
    const { create, install } = await startBackground();
    install();

    expect(create.mock.calls.map(([menu]) => menu)).toEqual([
      { id: 'qr-from-selection', title: 'menuSelection', contexts: ['selection'] },
      { id: 'text-from-selection', title: 'menuCleanText', contexts: ['selection'] },
      { id: 'qr-from-link', title: 'menuLink', contexts: ['link'] },
      { id: 'clean-from-link', title: 'menuCleanLink', contexts: ['link'] },
    ]);
  });

  it('routes link and selection menu clicks to their target tools when openPopup rejects', async () => {
    const { openPopup, items, click, consume } = await startBackground();
    click({
      menuItemId: 'clean-from-link',
      linkUrl: 'https://example.com/?utm_source=test',
      selectionText: 'Nearby selection',
      editable: false,
    });

    await vi.waitFor(() => expect(openPopup).toHaveBeenCalledOnce());
    expect(items[pendingLaunchKey]).toEqual({
      toolId: TOOL_IDS.linkCleaner,
      text: 'https://example.com/?utm_source=test',
    });
    await expect(consume()).resolves.toEqual({
      toolId: TOOL_IDS.linkCleaner,
      text: 'https://example.com/?utm_source=test',
    });
    expect(items).not.toHaveProperty(pendingLaunchKey);
    await expect(consume()).resolves.toBeNull();
  });

  it('serializes a consume with a newer menu click for another tool', async () => {
    const { click, consume } = await startBackground();
    click({ menuItemId: 'qr-from-selection', selectionText: 'first', editable: false });
    const first = consume();
    click({ menuItemId: 'text-from-selection', selectionText: 'second', editable: false });

    await expect(first).resolves.toEqual({ toolId: TOOL_IDS.qrCode, text: 'first' });
    await expect(consume()).resolves.toEqual({ toolId: TOOL_IDS.textCleaner, text: 'second' });
    await expect(consume()).resolves.toBeNull();
  });
});
