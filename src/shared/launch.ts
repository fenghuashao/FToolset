import { isToolId, type ToolId } from './tool-ids';

export const lastToolIdKey = 'lastToolId';
export const quickSwitcherKey = 'showQuickSwitcher';
export const pendingLaunchKey = 'pendingToolLaunch';
export const consumePendingLaunchMessage = 'consume-pending-tool-launch';
export const maxPendingLaunchLength = 200_000;

export interface ToolLaunch {
  toolId: ToolId;
  text: string;
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

export async function consumePendingLaunch(): Promise<ToolLaunch | null> {
  try {
    const response: unknown = await chrome.runtime.sendMessage({ type: consumePendingLaunchMessage });
    return parsePendingLaunch(response);
  } catch {
    return null;
  }
}
