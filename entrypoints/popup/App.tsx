import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../../src/shared/Icon';
import { t } from '../../src/shared/i18n';
import {
  consumePendingLaunch,
  getShareablePageUrl,
  lastToolIdKey,
  quickSwitcherKey,
} from '../../src/shared/launch';
import type { ToolId } from '../../src/shared/tool-ids';
import { getTool, searchTools, toolRegistry } from '../../src/tools/registry';
import { ErrorBoundary } from './ErrorBoundary';
import { PopupToolbar } from './PopupToolbar';

interface PopupState {
  toolId: ToolId;
  launchText?: string;
  launchNonce: number;
  currentPageUrl: string;
  showQuickSwitcher: boolean;
}

async function loadPopup(): Promise<PopupState> {
  const [tabs, stored, launch] = await Promise.all([
    chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []),
    chrome.storage.local.get([lastToolIdKey, quickSwitcherKey]).catch(() => ({} as Record<string, unknown>)),
    consumePendingLaunch(),
  ]);
  const currentPageUrl = getShareablePageUrl(tabs[0]?.url);
  const toolId = getTool(launch?.toolId ?? stored[lastToolIdKey]).id;
  void chrome.storage.local.set({ [lastToolIdKey]: toolId }).catch(() => undefined);
  return {
    toolId,
    launchText: launch?.text,
    launchNonce: 0,
    currentPageUrl,
    showQuickSwitcher: stored[quickSwitcherKey] === true,
  };
}

export function App() {
  const [state, setState] = useState<PopupState | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const pickerButton = useRef<HTMLButtonElement>(null);
  const searchField = useRef<HTMLInputElement>(null);
  const tool = state && getTool(state.toolId);
  const options = pickerOpen ? searchTools(query, t) : [];

  useEffect(() => {
    let mounted = true;
    void loadPopup().then((loaded) => {
      if (mounted) setState(loaded);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (pickerOpen) searchField.current?.focus();
  }, [pickerOpen]);

  function closePicker(restoreFocus = true) {
    setPickerOpen(false);
    setQuery('');
    if (restoreFocus) pickerButton.current?.focus();
  }

  const openTool = useCallback((id: ToolId, launchText?: string) => {
    setState((previous) => {
      if (!previous) return previous;
      if (previous.toolId === id && launchText === undefined) return previous;
      return {
        ...previous,
        toolId: id,
        launchText,
        launchNonce: previous.launchNonce + 1,
      };
    });
    void chrome.storage.local.set({ [lastToolIdKey]: id }).catch(() => undefined);
  }, []);

  function selectToolFromPicker(id: ToolId) {
    openTool(id);
    closePicker();
  }

  function toggleQuickSwitcher(enabled: boolean) {
    setState((previous) => previous ? { ...previous, showQuickSwitcher: enabled } : previous);
    void chrome.storage.local.set({ [quickSwitcherKey]: enabled }).catch(() => undefined);
  }

  return (
    <>
      <header
        className="border-b border-line bg-surface"
        onKeyDown={(event) => { if (event.key === 'Escape' && pickerOpen) closePicker(); }}
      >
        <PopupToolbar>
          <button
            className="button"
            type="button"
            ref={pickerButton}
            disabled={!state}
            aria-expanded={pickerOpen}
            aria-controls="tool-picker"
            onClick={() => { if (pickerOpen) closePicker(); else setPickerOpen(true); }}
          >
            <Icon name="search" size={15} />
            {t('tools')}
            <Icon name="chevrons" size={14} />
          </button>
        </PopupToolbar>
        {state?.showQuickSwitcher && (
          <nav
            aria-label={t('quickSwitcherLabel')}
            className="flex flex-wrap items-center gap-1.5 border-t border-line px-4 py-2"
          >
            {toolRegistry.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === tool?.id}
                className="button min-h-8 flex-1 px-2 py-1 text-xs"
                onClick={() => {
                  openTool(item.id);
                  if (pickerOpen) closePicker(false);
                }}
              >
                <Icon name={item.icon} size={14} />
                <span className="truncate">{t(item.shortNameKey)}</span>
              </button>
            ))}
          </nav>
        )}
        <div id="tool-picker" hidden={!pickerOpen} className="border-t border-line px-4 py-3">
          {pickerOpen && (
            <>
              <input
                ref={searchField}
                className="field"
                type="search"
                aria-label={t('searchTools')}
                placeholder={t('searchTools')}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <ul className="mt-2 grid gap-1">
                {options.map((option) => (
                  <li key={option.id}>
                    <button
                      type="button"
                      aria-pressed={option.id === tool?.id}
                      className="button w-full justify-start py-2 text-left"
                      onClick={() => selectToolFromPicker(option.id)}
                    >
                      <Icon name={option.icon} size={19} />
                      <span className="flex-1">
                        <span className="block">{t(option.nameKey)}</span>
                        <span className="block font-normal text-muted">{t(option.descKey)}</span>
                      </span>
                      {option.id === tool?.id && <Icon name="check" size={15} />}
                    </button>
                  </li>
                ))}
              </ul>
              {options.length === 0 && (
                <p className="px-2 py-1 text-muted" role="status">{t('noTools')}</p>
              )}
              <div className="mt-2.5 border-t border-line pt-2.5">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted select-none">
                  <input
                    type="checkbox"
                    className="size-3.5 accent-accent"
                    checked={state?.showQuickSwitcher ?? false}
                    onChange={(event) => toggleQuickSwitcher(event.currentTarget.checked)}
                  />
                  <span>{t('showQuickSwitcher')}</span>
                </label>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="grid gap-3 px-4 pt-3.5 pb-4">
        {tool && state ? (
          <>
            <h1 className="text-lg font-bold tracking-tight">{t(tool.nameKey)}</h1>
            <ErrorBoundary key={`${tool.id}-${state.launchNonce}`}>
              <Suspense fallback={<LoadingTool />}>
                <tool.component
                  key={`${tool.id}-${state.launchNonce}`}
                  launchText={state.launchText}
                  currentPageUrl={state.currentPageUrl}
                  openTool={openTool}
                />
              </Suspense>
            </ErrorBoundary>
          </>
        ) : <LoadingTool />}
      </main>
    </>
  );
}

function LoadingTool() {
  return <p className="py-6 text-center text-muted" role="status">{t('loadingTool')}</p>;
}
