export const TOOL_IDS = {
  qrCode: 'qr-code',
  linkCleaner: 'link-cleaner',
  textCleaner: 'text-cleaner',
} as const;

export type ToolId = (typeof TOOL_IDS)[keyof typeof TOOL_IDS];

const knownToolIds = new Set<string>(Object.values(TOOL_IDS));

export function isToolId(value: unknown): value is ToolId {
  return typeof value === 'string' && knownToolIds.has(value);
}
