import { useState } from 'react';
import { Icon } from '../../src/shared/Icon';
import { t } from '../../src/shared/i18n';
import { MAX_PINNED_TOOLS } from '../../src/shared/launch';
import type { ToolId } from '../../src/shared/tool-ids';
import { searchTools } from '../../src/tools/registry';

interface ToolCatalogProps {
  readonly activeToolId: ToolId;
  readonly pinnedToolIds: readonly ToolId[];
  readonly showQuickSwitcher: boolean;
  readonly onSelectTool: (id: ToolId) => void;
  readonly onTogglePin: (id: ToolId) => void;
  readonly onMovePinned: (id: ToolId, direction: -1 | 1) => void;
  readonly onToggleQuickSwitcher: (enabled: boolean) => void;
  readonly onBack: () => void;
}

export function ToolCatalog({
  activeToolId,
  pinnedToolIds,
  showQuickSwitcher,
  onSelectTool,
  onTogglePin,
  onMovePinned,
  onToggleQuickSwitcher,
  onBack,
}: ToolCatalogProps) {
  const [query, setQuery] = useState('');
  const tools = searchTools(query, t);
  const pinnedFull = pinnedToolIds.length >= MAX_PINNED_TOOLS;

  return (
    <div className="grid gap-3.5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold tracking-tight">{t('allTools')}</h1>
        <button
          className="button button-plain min-h-8 px-2 py-1 text-xs"
          onClick={onBack}
          type="button"
        >
          <Icon name="arrowLeft" size={14} />
          {t('backToTool')}
        </button>
      </div>

      <input
        aria-label={t('searchTools')}
        className="field"
        onChange={(event) => setQuery(event.currentTarget.value)}
        placeholder={t('searchToolsPlaceholder')}
        type="search"
        value={query}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs">
        <span className="font-medium text-ink">
          {t('pinnedCount', [String(pinnedToolIds.length), String(MAX_PINNED_TOOLS)])}
        </span>
        <label className="flex cursor-pointer items-center gap-2 text-muted select-none">
          <input
            checked={showQuickSwitcher}
            className="size-3.5 accent-accent"
            onChange={(event) => onToggleQuickSwitcher(event.currentTarget.checked)}
            type="checkbox"
          />
          <span>{t('showQuickSwitcher')}</span>
        </label>
      </div>

      {tools.length > 0 ? (
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {tools.map((item) => {
            const pinnedIndex = pinnedToolIds.indexOf(item.id);
            const isPinned = pinnedIndex !== -1;
            const disablePin = !isPinned && pinnedFull;
            const isCurrent = item.id === activeToolId;

            return (
              <li
                key={item.id}
                className={`grid gap-2.5 rounded-xl border bg-surface p-3 ${isCurrent ? 'border-accent' : 'border-line'}`}
              >
                <button
                  className="flex w-full items-start gap-2.5 text-left"
                  onClick={() => onSelectTool(item.id)}
                  type="button"
                >
                  <span className="mt-0.5 text-accent">
                    <Icon name={item.icon} size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{t(item.nameKey)}</span>
                    <span className="mt-0.5 block text-xs text-muted">{t(item.descKey)}</span>
                  </span>
                </button>

                <div className="flex items-center justify-between gap-1.5 border-t border-line pt-2">
                  <button
                    aria-pressed={isPinned}
                    className={`button min-h-7 px-2 py-0.5 text-xs ${isPinned ? '' : 'button-plain'}`}
                    disabled={disablePin}
                    onClick={() => onTogglePin(item.id)}
                    title={disablePin ? t('pinLimitReached', String(MAX_PINNED_TOOLS)) : t(isPinned ? 'unpinTool' : 'pinTool')}
                    type="button"
                  >
                    <Icon name="pin" size={13} />
                    {t(isPinned ? 'unpinTool' : 'pinTool')}
                  </button>

                  {isPinned && pinnedToolIds.length > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        aria-label={`${t(item.shortNameKey)} ${t('moveEarlier')}`}
                        className="button button-plain min-h-7 px-1.5 py-0.5"
                        disabled={pinnedIndex === 0}
                        onClick={() => onMovePinned(item.id, -1)}
                        title={t('moveEarlier')}
                        type="button"
                      >
                        <Icon name="arrowLeft" size={13} />
                      </button>
                      <button
                        aria-label={`${t(item.shortNameKey)} ${t('moveLater')}`}
                        className="button button-plain min-h-7 px-1.5 py-0.5"
                        disabled={pinnedIndex === pinnedToolIds.length - 1}
                        onClick={() => onMovePinned(item.id, 1)}
                        title={t('moveLater')}
                        type="button"
                      >
                        <Icon name="arrowRight" size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-6 text-center text-xs text-muted" role="status">
          {t('noTools')}
        </p>
      )}
    </div>
  );
}
