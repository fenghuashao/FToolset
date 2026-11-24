import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../../src/shared/Icon';
import { t } from '../../src/shared/i18n';
import {
  consumePendingLaunch,
  consumeTabHandoff,
  getShareablePageUrl,
  lastToolIdKey,
  MAX_PINNED_TOOLS,
  parsePinnedToolIds,
  pinnedToolIdsKey,
  quickSwitcherKey,
  writeTabHandoff,
} from '../../src/shared/launch';
import type { ToolId } from '../../src/shared/tool-ids';
import { defaultPinnedToolIds, getTool, searchTools } from '../../src/tools/registry';
import { ErrorBoundary } from './ErrorBoundary';
import { PopupToolbar } from './PopupToolbar';
import { ToolCatalog } from './ToolCatalog';

type ActiveView = 'tool' | 'catalog';

interface PopupState {
  toolId: ToolId;
  activeView: ActiveView;
  launchText?: string;
  launchNonce: number;
  currentPageUrl: string;
  showQuickSwitcher: boolean;
  pinnedToolIds: ToolId[];
}

async function loadPopup(isTabView: boolean): Promise<PopupState> {
  const [tabs, stored, launch, handoff] = await Promise.all([
    isTabView
      ? Promise.resolve([])
      : chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []),
    chrome.storage.local
      .get([lastToolIdKey, quickSwitcherKey, pinnedToolIdsKey])
      .catch(() => ({} as Record<string, unknown>)),
    consumePendingLaunch(),
    isTabView ? consumeTabHandoff() : Promise.resolve(null),
  ]);
  const currentPageUrl = isTabView
    ? (handoff?.sourceUrl ?? '')
    : getShareablePageUrl(tabs[0]?.url);
  const toolId = getTool(launch?.toolId ?? handoff?.toolId ?? stored[lastToolIdKey]).id;
  void chrome.storage.local.set({ [lastToolIdKey]: toolId }).catch(() => undefined);
  return {
    toolId,
    activeView: 'tool',
    launchText: launch?.text ?? handoff?.text,
    launchNonce: 0,
    currentPageUrl,
    showQuickSwitcher: stored[quickSwitcherKey] !== false,
    pinnedToolIds: parsePinnedToolIds(stored[pinnedToolIdsKey], defaultPinnedToolIds),
  };
}

export function App({ isTabView = false }: { readonly isTabView?: boolean }) {
  const [state, setState] = useState<PopupState | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchButton = useRef<HTMLButtonElement>(null);
  const searchField = useRef<HTMLInputElement>(null);
  const draftRef = useRef<string | undefined>(undefined);
  const tool = state && getTool(state.toolId);
  const trimmedQuery = query.trim();
  const searchResults = searchOpen && trimmedQuery !== '' ? searchTools(trimmedQuery, t) : [];

  useEffect(() => {
    let mounted = true;
    void loadPopup(isTabView).then((loaded) => {
      if (mounted) setState(loaded);
    });
    return () => { mounted = false; };
  }, [isTabView]);

  useEffect(() => {
    if (searchOpen) searchField.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (event.key === '/' && !searchOpen) {
        const target = event.target as HTMLElement | null;
        if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [searchOpen]);

  useEffect(() => {
    if (!isTabView || !state || !tool) return;
    const title = state.activeView === 'catalog' ? t('allTools') : t(tool.nameKey);
    document.title = `${title} · ${t('extensionName')}`;
  }, [isTabView, state, tool]);

  function closeSearch(restoreFocus = true) {
    setSearchOpen(false);
    setQuery('');
    if (restoreFocus) searchButton.current?.focus();
  }

  const reportDraft = useCallback((value: string) => {
    draftRef.current = value;
  }, []);

  const openTool = useCallback((id: ToolId, launchText?: string) => {
    if (launchText !== undefined) {
      draftRef.current = launchText;
    }
    setState((previous) => {
      if (!previous) return previous;
      const isSwitchingTool = previous.toolId !== id || launchText !== undefined;
      if (!isSwitchingTool && previous.activeView === 'tool') return previous;
      if (previous.toolId !== id && launchText === undefined) {
        draftRef.current = undefined;
      }
      return {
        ...previous,
        toolId: id,
        activeView: 'tool',
        launchText: isSwitchingTool ? launchText : previous.launchText,
        launchNonce: isSwitchingTool ? previous.launchNonce + 1 : previous.launchNonce,
      };
    });
    void chrome.storage.local.set({ [lastToolIdKey]: id }).catch(() => undefined);
  }, []);

  function openCatalog() {
    setState((previous) => previous ? { ...previous, activeView: 'catalog' } : previous);
    if (searchOpen) closeSearch(false);
  }

  function returnToActiveTool() {
    setState((previous) => previous ? { ...previous, activeView: 'tool' } : previous);
  }

  function toggleQuickSwitcher(enabled: boolean) {
    setState((previous) => previous ? { ...previous, showQuickSwitcher: enabled } : previous);
    void chrome.storage.local.set({ [quickSwitcherKey]: enabled }).catch(() => undefined);
  }

  function togglePinTool(id: ToolId) {
    setState((previous) => {
      if (!previous) return previous;
      const exists = previous.pinnedToolIds.includes(id);
      if (!exists && previous.pinnedToolIds.length >= MAX_PINNED_TOOLS) return previous;
      const pinnedToolIds = exists
        ? previous.pinnedToolIds.filter((item) => item !== id)
        : [...previous.pinnedToolIds, id];
      void chrome.storage.local.set({ [pinnedToolIdsKey]: pinnedToolIds }).catch(() => undefined);
      return { ...previous, pinnedToolIds };
    });
  }

  function movePinnedTool(id: ToolId, direction: -1 | 1) {
    setState((previous) => {
      if (!previous) return previous;
      const index = previous.pinnedToolIds.indexOf(id);
      const targetIndex = index + direction;
      if (index === -1 || targetIndex < 0 || targetIndex >= previous.pinnedToolIds.length) {
        return previous;
      }
      const next = [...previous.pinnedToolIds];
      const currentItem = next[index];
      const swapItem = next[targetIndex];
      if (!currentItem || !swapItem) return previous;
      next[index] = swapItem;
      next[targetIndex] = currentItem;
      void chrome.storage.local.set({ [pinnedToolIdsKey]: next }).catch(() => undefined);
      return { ...previous, pinnedToolIds: next };
    });
  }

  async function expandToTab() {
    if (!state) return;
    await writeTabHandoff({
      toolId: state.toolId,
      text: draftRef.current,
      sourceUrl: state.currentPageUrl || undefined,
    });
    await chrome.tabs.create({ url: chrome.runtime.getURL('popup.html?view=tab') });
    window.close();
  }

  const shellContainer = isTabView ? 'mx-auto w-full max-w-3xl' : '';
  const pinnedTools = state ? state.pinnedToolIds.map((id) => getTool(id)) : [];
  const compactAllButton = !isTabView && pinnedTools.length >= MAX_PINNED_TOOLS;

  return (
    <>
      <header
        className="border-b border-line bg-surface"
        onKeyDown={(event) => { if (event.key === 'Escape' && searchOpen) closeSearch(); }}
      >
        <div className={shellContainer}>
          <PopupToolbar>
            <button
              aria-controls="tool-search"
              aria-expanded={searchOpen}
              aria-label={t('searchTools')}
              className="button"
              disabled={!state}
              onClick={() => { if (searchOpen) closeSearch(); else setSearchOpen(true); }}
              ref={searchButton}
              title={t('searchTools')}
              type="button"
            >
              <Icon name="search" size={15} />
              {t('search')}
            </button>
          </PopupToolbar>

          <div id="tool-search" hidden={!searchOpen} className="border-t border-line px-4 py-2.5">
            {searchOpen && (
              <div className="grid gap-2">
                <input
                  aria-label={t('searchTools')}
                  className="field"
                  onChange={(event) => setQuery(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && searchResults[0]) {
                      event.preventDefault();
                      openTool(searchResults[0].id);
                      closeSearch(false);
                    }
                  }}
                  placeholder={t('searchToolsPlaceholder')}
                  ref={searchField}
                  type="search"
                  value={query}
                />
                {trimmedQuery === '' ? (
                  <div className="flex items-center justify-between gap-2 text-xs text-muted">
                    <span>{t('searchEmptyHint')}</span>
                    <button
                      className="button button-plain min-h-7 shrink-0 px-2 py-0.5 text-xs text-accent"
                      onClick={openCatalog}
                      type="button"
                    >
                      <Icon name="grid" size={13} />
                      {t('allTools')}
                    </button>
                  </div>
                ) : searchResults.length > 0 ? (
                  <ul className="grid gap-1">
                    {searchResults.map((option) => (
                      <li key={option.id}>
                        <button
                          aria-pressed={state?.activeView === 'tool' && option.id === tool?.id}
                          className="button w-full justify-start py-1.5 text-left"
                          onClick={() => {
                            openTool(option.id);
                            closeSearch(false);
                          }}
                          type="button"
                        >
                          <Icon name={option.icon} size={17} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{t(option.nameKey)}</span>
                            <span className="block truncate font-normal text-muted">{t(option.descKey)}</span>
                          </span>
                          {state?.activeView === 'tool' && option.id === tool?.id && <Icon name="check" size={15} />}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center justify-between gap-2 text-xs text-muted">
                    <p role="status">{t('noTools')}</p>
                    <button
                      className="button button-plain min-h-7 shrink-0 px-2 py-0.5 text-xs text-accent"
                      onClick={openCatalog}
                      type="button"
                    >
                      <Icon name="grid" size={13} />
                      {t('allTools')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {state?.showQuickSwitcher && (
            <nav
              aria-label={t('quickSwitcherLabel')}
              className="flex items-center gap-1.5 border-t border-line px-4 py-2"
            >
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                {pinnedTools.map((item) => (
                  <button
                    key={item.id}
                    aria-pressed={state.activeView === 'tool' && item.id === tool?.id}
                    className="button min-h-8 min-w-0 flex-1 px-2 py-1 text-xs"
                    onClick={() => {
                      openTool(item.id);
                      if (searchOpen) closeSearch(false);
                    }}
                    title={t(item.nameKey)}
                    type="button"
                  >
                    <Icon name={item.icon} size={14} />
                    <span className="truncate">{t(item.shortNameKey)}</span>
                  </button>
                ))}
              </div>
              <button
                aria-label={t('allTools')}
                aria-pressed={state.activeView === 'catalog'}
                className="button button-plain min-h-8 shrink-0 px-2 py-1 text-xs"
                onClick={() => {
                  if (state.activeView === 'catalog') returnToActiveTool();
                  else openCatalog();
                }}
                title={t('allTools')}
                type="button"
              >
                <Icon name="grid" size={14} />
                {!compactAllButton && <span>{t('allToolsShort')}</span>}
              </button>
            </nav>
          )}
        </div>
      </header>

      <main className={`grid gap-3 ${isTabView ? 'mx-auto w-full max-w-3xl px-4 py-6 sm:px-6' : 'px-4 pt-3.5 pb-4'}`}>
        {tool && state ? (
          state.activeView === 'catalog' ? (
            <ToolCatalog
              activeToolId={state.toolId}
              onBack={returnToActiveTool}
              onMovePinned={movePinnedTool}
              onSelectTool={(id) => openTool(id)}
              onTogglePin={togglePinTool}
              onToggleQuickSwitcher={toggleQuickSwitcher}
              pinnedToolIds={state.pinnedToolIds}
              showQuickSwitcher={state.showQuickSwitcher}
            />
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-lg font-bold tracking-tight">{t(tool.nameKey)}</h1>
                {!isTabView && (
                  <button
                    aria-label={t('openInNewTab')}
                    className="button button-plain min-h-8 px-2 py-1 text-xs"
                    onClick={() => void expandToTab()}
                    title={t('openInNewTab')}
                    type="button"
                  >
                    <Icon name="maximize" size={14} />
                    {t('openInNewTabShort')}
                  </button>
                )}
              </div>
              <ErrorBoundary key={`${tool.id}-${state.launchNonce}`}>
                <Suspense fallback={<LoadingTool />}>
                  <tool.component
                    key={`${tool.id}-${state.launchNonce}`}
                    launchText={state.launchText}
                    currentPageUrl={state.currentPageUrl}
                    openTool={openTool}
                    reportDraft={reportDraft}
                  />
                </Suspense>
              </ErrorBoundary>
            </>
          )
        ) : <LoadingTool />}
      </main>
    </>
  );
}

function LoadingTool() {
  return <p className="py-6 text-center text-muted" role="status">{t('loadingTool')}</p>;
}
