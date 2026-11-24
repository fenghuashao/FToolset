import { defineBackground } from 'wxt/utils/define-background';
import { t, type MessageKey } from '../src/shared/i18n';
import {
  consumePendingLaunchMessage,
  maxPendingLaunchLength,
  parsePendingLaunch,
  pendingLaunchKey,
  type ToolLaunch,
} from '../src/shared/launch';
import { TOOL_IDS, type ToolId } from '../src/shared/tool-ids';

interface ContextToolMenu {
  readonly id: string;
  readonly context: 'selection' | 'link';
  readonly titleKey: MessageKey;
  readonly contentKey: 'selectionText' | 'linkUrl';
  readonly toolId: ToolId;
}

export const contextToolMenus: readonly ContextToolMenu[] = [
  {
    id: 'qr-from-selection',
    context: 'selection',
    titleKey: 'menuSelection',
    contentKey: 'selectionText',
    toolId: TOOL_IDS.qrCode,
  },
  {
    id: 'text-from-selection',
    context: 'selection',
    titleKey: 'menuCleanText',
    contentKey: 'selectionText',
    toolId: TOOL_IDS.textCleaner,
  },
  {
    id: 'qr-from-link',
    context: 'link',
    titleKey: 'menuLink',
    contentKey: 'linkUrl',
    toolId: TOOL_IDS.qrCode,
  },
  {
    id: 'clean-from-link',
    context: 'link',
    titleKey: 'menuCleanLink',
    contentKey: 'linkUrl',
    toolId: TOOL_IDS.linkCleaner,
  },
];

export default defineBackground(() => {
  // Serialize writes and read-and-remove so a consume cannot clear a newer menu click.
  let pendingOperation: Promise<unknown> = Promise.resolve();

  function withPending<T>(operation: () => Promise<T>): Promise<T> {
    const result = pendingOperation.then(operation);
    pendingOperation = result.catch(() => undefined);
    return result;
  }

  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
      if (chrome.runtime.lastError) return;

      for (const menu of contextToolMenus) {
        chrome.contextMenus.create({
          id: menu.id,
          title: t(menu.titleKey),
          contexts: [menu.context],
        }, () => { void chrome.runtime.lastError; });
      }
    });
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    const menu = contextToolMenus.find(({ id }) => id === info.menuItemId);
    const raw = menu && info[menu.contentKey];
    if (!menu || !raw) return;

    const text = raw.length > maxPendingLaunchLength ? raw.slice(0, maxPendingLaunchLength) : raw;
    const payload: ToolLaunch = { toolId: menu.toolId, text };

    void withPending(() => chrome.storage.session.set({ [pendingLaunchKey]: payload }))
      .then(async () => {
        try {
          await chrome.action.openPopup?.(tab ? { windowId: tab.windowId } : undefined);
        } catch {
          // Chrome can block openPopup. A toolbar click will consume the queued launch.
        }
      })
      .catch(() => undefined);
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== consumePendingLaunchMessage) return;

    void withPending(async (): Promise<ToolLaunch | null> => {
      const items = await chrome.storage.session.get(pendingLaunchKey);
      const launch = parsePendingLaunch(items[pendingLaunchKey]);
      if (!launch) return null;
      await chrome.storage.session.remove(pendingLaunchKey);
      return launch;
    }).then(sendResponse, () => sendResponse(null));

    // Returning true keeps the response channel open on older Chrome releases.
    return true;
  });
});
