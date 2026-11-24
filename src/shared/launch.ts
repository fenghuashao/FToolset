import { isToolId, type ToolId } from './tool-ids';

export const lastToolIdKey = 'lastToolId';
export const quickSwitcherKey = 'showQuickSwitcher';
export const pinnedToolIdsKey = 'pinnedToolIds';
export const MAX_PINNED_TOOLS = 4;
export const pendingLaunchKey = 'pendingToolLaunch';
export const tabHandoffKey = 'pendingTabHandoff';
export const consumePendingLaunchMessage = 'consume-pending-tool-launch';
export const maxPendingLaunchLength = 200_000;

export interface ToolLaunch {
  toolId: ToolId;
  text: string;
}

export interface TabHandoff {
  toolId: ToolId;
  text?: string;
  sourceUrl?: string;
}

const shareableProtocols = new Set(['https:', 'http:', 'file:', 'ftp:']);
const safeHttpProtocols = new Set(['https:', 'http:']);

export function getShareablePageUrl(value: string | undefined): string {
  if (!value) return '';

  try {
    return shareableProtocols.has(new URL(value).protocol) ? value : '';
  } catch {
    return '';
  }
}

export function isSafeHttpUrl(value: string): boolean {
  try {
    return safeHttpProtocols.has(new URL(value.trim()).protocol);
  } catch {
    return false;
  }
}

export function parsePendingLaunch(value: unknown): ToolLaunch | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (!isToolId(candidate.toolId)) return null;
  if (typeof candidate.text !== 'string' || !candidate.text) return null;
  return { toolId: candidate.toolId, text: candidate.text };
}

export function parseTabHandoff(value: unknown): TabHandoff | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (!isToolId(candidate.toolId)) return null;
  const text = typeof candidate.text === 'string' ? candidate.text : undefined;
  const sourceUrl = typeof candidate.sourceUrl === 'string'
    ? getShareablePageUrl(candidate.sourceUrl) || undefined
    : undefined;
  return { toolId: candidate.toolId, text, sourceUrl };
}

export async function writeTabHandoff(handoff: TabHandoff): Promise<void> {
  const text = handoff.text !== undefined && handoff.text.length > maxPendingLaunchLength
    ? handoff.text.slice(0, maxPendingLaunchLength)
    : handoff.text;
  const payload: TabHandoff = {
    toolId: handoff.toolId,
    ...(text !== undefined ? { text } : {}),
    ...(handoff.sourceUrl ? { sourceUrl: handoff.sourceUrl } : {}),
  };
  try {
    await chrome.storage.session.set({ [tabHandoffKey]: payload });
  } catch {
    // Ignore storage quota failures; the tab can still open on the selected tool.
  }
}

export async function consumeTabHandoff(): Promise<TabHandoff | null> {
  try {
    const items = await chrome.storage.session.get(tabHandoffKey);
    const handoff = parseTabHandoff(items[tabHandoffKey]);
    if (tabHandoffKey in items) {
      await chrome.storage.session.remove(tabHandoffKey);
    }
    return handoff;
  } catch {
    return null;
  }
}

export function parsePinnedToolIds(
  value: unknown,
  fallback: readonly ToolId[],
): ToolId[] {
  if (!Array.isArray(value)) return [...fallback].slice(0, MAX_PINNED_TOOLS);
  const seen = new Set<ToolId>();
  const result: ToolId[] = [];
  for (const item of value) {
    if (!isToolId(item) || seen.has(item)) continue;
    seen.add(item);
    result.push(item);
    if (result.length >= MAX_PINNED_TOOLS) break;
  }
  return result;
}

export async function consumePendingLaunch(): Promise<ToolLaunch | null> {
  try {
    const response: unknown = await chrome.runtime.sendMessage({ type: consumePendingLaunchMessage });
    return parsePendingLaunch(response);
  } catch {
    return null;
  }
}
