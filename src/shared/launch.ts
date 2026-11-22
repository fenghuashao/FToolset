export const lastToolIdKey = 'lastToolId';
export const pendingLaunchKey = 'pendingQrText';
export const consumePendingLaunchMessage = 'consume-pending-qr-text';

export interface ToolLaunch {
  toolId: string;
  text: string;
}

const shareableProtocols = new Set(['https:', 'http:', 'file:', 'ftp:']);

export function getShareablePageUrl(value: string | undefined): string {
  if (!value) return '';

  try {
    return shareableProtocols.has(new URL(value).protocol) ? value : '';
  } catch {
    return '';
  }
}

export async function consumePendingLaunch(): Promise<ToolLaunch | null> {
  try {
    return await chrome.runtime.sendMessage({ type: consumePendingLaunchMessage }) ?? null;
  } catch {
    return null;
  }
}
