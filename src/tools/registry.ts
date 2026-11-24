import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { IconName } from '../shared/Icon';
import type { MessageKey } from '../shared/i18n';
import { TOOL_IDS, type ToolId } from '../shared/tool-ids';

export interface ToolProps {
  readonly launchText?: string;
  readonly currentPageUrl: string;
  readonly openTool: (toolId: ToolId, launchText?: string) => void;
  readonly reportDraft?: (text: string) => void;
}

export interface ToolDefinition {
  readonly id: ToolId;
  readonly nameKey: MessageKey;
  readonly shortNameKey: MessageKey;
  readonly descKey: MessageKey;
  readonly icon: IconName;
  readonly category: string;
  readonly keywords: readonly string[];
  readonly component: LazyExoticComponent<ComponentType<ToolProps>>;
}

export const defaultToolId: ToolId = TOOL_IDS.qrCode;

export const toolRegistry = [
  {
    id: TOOL_IDS.qrCode,
    nameKey: 'toolQrName',
    shortNameKey: 'toolQrShortName',
    descKey: 'toolQrDescription',
    icon: 'qr',
    category: 'links',
    keywords: ['qr', 'qrcode', 'barcode', 'scan', 'decode', 'link', 'url', '二维码', '生成', '识别', '扫码', '链接'],
    component: lazy(() => import('./qr-code')),
  },
  {
    id: TOOL_IDS.linkCleaner,
    nameKey: 'toolLinkName',
    shortNameKey: 'toolLinkShortName',
    descKey: 'toolLinkDescription',
    icon: 'link',
    category: 'links',
    keywords: ['link', 'url', 'clean', 'utm', 'tracker', 'tracking', 'strip', 'params', '链接', '净化', '追踪', '参数', '网址', '去参数'],
    component: lazy(() => import('./link-cleaner')),
  },
  {
    id: TOOL_IDS.textCleaner,
    nameKey: 'toolTextName',
    shortNameKey: 'toolTextShortName',
    descKey: 'toolTextDescription',
    icon: 'text',
    category: 'text',
    keywords: ['text', 'word', 'count', 'clean', 'spaces', 'lines', 'pdf', 'case', '文字', '文本', '字数', '统计', '空格', '空行', '断行', '去重', '大小写'],
    component: lazy(() => import('./text-cleaner')),
  },
] as const satisfies readonly ToolDefinition[];

export function getTool(id: unknown): ToolDefinition {
  return toolRegistry.find((tool) => tool.id === id) ?? toolRegistry[0];
}

export function searchTools(query: string, translate: (key: MessageKey) => string): ToolDefinition[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return toolRegistry.filter((tool) => {
    const searchable = [
      translate(tool.nameKey),
      translate(tool.shortNameKey),
      translate(tool.descKey),
      tool.id,
      tool.category,
      ...tool.keywords,
    ].join(' ').toLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
}
