import { defineBackground } from 'wxt/utils/define-background';
import { t } from '../src/shared/i18n';
import { consumePendingLaunchMessage, pendingLaunchKey, type ToolLaunch } from '../src/shared/launch';
import { qrToolId } from '../src/shared/qr-id';

const qrMenus = [
  {
    id: 'qr-from-selection',
    context: 'selection',
    titleKey: 'menuSelection',
    contentKey: 'selectionText',
  },
  {
    id: 'qr-from-link',
    context: 'link',
    titleKey: 'menuLink',
    contentKey: 'linkUrl',
  },
] as const;

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

      for (const menu of qrMenus) {
        chrome.contextMenus.create({
          id: menu.id,
          title: t(menu.titleKey),
          contexts: [menu.context],
        }, () => { void chrome.runtime.lastError; });
      }
    });
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    const menu = qrMenus.find(({ id }) => id === info.menuItemId);
    const text = menu && info[menu.contentKey];
    if (!text) return;

    void withPending(() => chrome.storage.session.set({ [pendingLaunchKey]: text }))
      .then(async () => {
        try {
          await chrome.action.openPopup?.(tab ? { windowId: tab.windowId } : undefined);
        } catch {
          // Chrome can block openPopup. A toolbar click will consume the queued text.
        }
      })
      .catch(() => undefined);
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== consumePendingLaunchMessage) return;

    void withPending(async (): Promise<ToolLaunch | null> => {
      const items = await chrome.storage.session.get(pendingLaunchKey);
      const text = items[pendingLaunchKey];
      if (typeof text !== 'string' || !text) return null;
      await chrome.storage.session.remove(pendingLaunchKey);
      return { toolId: qrToolId, text };
    }).then(sendResponse, () => sendResponse(null));

    // Returning true keeps the response channel open on older Chrome releases.
    return true;
  });
});
