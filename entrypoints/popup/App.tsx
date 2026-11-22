import { Suspense, useEffect, useRef, useState } from 'react';
import { Icon } from '../../src/shared/Icon';
import { t } from '../../src/shared/i18n';
import { consumePendingLaunch, getShareablePageUrl, lastToolIdKey } from '../../src/shared/launch';
import { getTool, searchTools } from '../../src/tools/registry';
import { ErrorBoundary } from './ErrorBoundary';
import { PopupToolbar } from './PopupToolbar';

interface PopupState {
  toolId: string;
  initialText: string;
  currentPageUrl: string;
}

async function loadPopup(): Promise<PopupState> {
  const [tabs, stored, launch] = await Promise.all([
    chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []),
    chrome.storage.local.get(lastToolIdKey).catch(() => ({} as Record<string, unknown>)),
    consumePendingLaunch(),
  ]);
  const currentPageUrl = getShareablePageUrl(tabs[0]?.url);
  const toolId = getTool(launch?.toolId ?? stored[lastToolIdKey]).id;
  void chrome.storage.local.set({ [lastToolIdKey]: toolId }).catch(() => undefined);
  return { toolId, initialText: launch?.text ?? currentPageUrl, currentPageUrl };
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

  function closePicker() {
    setPickerOpen(false);
    setQuery('');
    pickerButton.current?.focus();
  }

  function selectTool(id: string) {
    setState((previous) => previous && previous.toolId !== id
      ? { ...previous, toolId: id, initialText: previous.currentPageUrl }
      : previous);
    void chrome.storage.local.set({ [lastToolIdKey]: id }).catch(() => undefined);
    closePicker();
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
                      onClick={() => selectTool(option.id)}
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
            </>
          )}
        </div>
      </header>

      <main className="grid gap-3 px-4 pt-3.5 pb-4">
        {tool && state ? (
          <>
            <h1 className="text-lg font-bold tracking-tight">{t(tool.nameKey)}</h1>
            <ErrorBoundary key={tool.id}>
              <Suspense fallback={<LoadingTool />}>
                <tool.component initialText={state.initialText} currentPageUrl={state.currentPageUrl} />
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
