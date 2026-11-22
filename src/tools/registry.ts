import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { IconName } from '../shared/Icon';
import type { MessageKey } from '../shared/i18n';
import { qrToolId } from '../shared/qr-id';

export interface ToolProps {
  initialText: string;
  currentPageUrl: string;
}

export interface ToolDefinition {
  id: string;
  nameKey: MessageKey;
  descKey: MessageKey;
  icon: IconName;
  category: string;
  keywords: readonly string[];
  component: LazyExoticComponent<ComponentType<ToolProps>>;
}

export const defaultToolId = qrToolId;

export const toolRegistry = [
  {
    id: defaultToolId,
    nameKey: 'toolQrName',
    descKey: 'toolQrDescription',
    icon: 'qr',
    category: 'generators',
    keywords: ['qr', 'barcode', 'link', 'url', '二维码', '生成', '链接'],
    component: lazy(() => import('./qr-code')),
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
      translate(tool.descKey),
      tool.id,
      tool.category,
      ...tool.keywords,
    ].join(' ').toLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
}
