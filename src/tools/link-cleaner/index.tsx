import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../shared/Icon';
import { t, type MessageKey } from '../../shared/i18n';
import { TOOL_IDS } from '../../shared/tool-ids';
import type { ToolProps } from '../registry';
import { cleanUrl } from './clean';

export default function LinkCleaner({ launchText, currentPageUrl, openTool, reportDraft }: ToolProps) {
  const [input, setInput] = useState(launchText ?? currentPageUrl);
  const [restoredIds, setRestoredIds] = useState<ReadonlySet<string>>(() => new Set());
  const [toast, setToast] = useState<{ key: MessageKey; error: boolean }>();

  const result = useMemo(() => cleanUrl(input, restoredIds), [input, restoredIds]);

  useEffect(() => {
    reportDraft?.(input);
  }, [input, reportDraft]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(undefined), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function updateInput(next: string) {
    setInput(next);
    setRestoredIds(new Set());
  }

  function toggleParam(id: string) {
    setRestoredIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function restoreAllParams() {
    if (result.status !== 'cleaned') return;
    setRestoredIds(new Set(result.trackingParams.map((item) => item.id)));
  }

  async function copyCleaned() {
    if (result.status !== 'cleaned') return;
    try {
      await navigator.clipboard.writeText(result.cleanedUrl);
      setToast({ key: 'linkCopySuccess', error: false });
    } catch {
      setToast({ key: 'linkCopyError', error: true });
    }
  }

  return (
    <div className="grid gap-3.5">
      <div className="grid gap-1.5">
        <label className="text-sm font-semibold text-ink" htmlFor="link-input">
          {t('linkInputLabel')}
        </label>
        <textarea
          className="field min-h-18 resize-y break-all"
          id="link-input"
          onChange={(event) => updateInput(event.currentTarget.value)}
          placeholder={t('linkInputPlaceholder')}
          rows={3}
          spellCheck={false}
          value={input}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            className="button button-plain"
            disabled={!input}
            onClick={() => updateInput('')}
            type="button"
          >
            {t('linkClear')}
          </button>
          <button
            className="button button-plain"
            disabled={!currentPageUrl || input === currentPageUrl}
            onClick={() => updateInput(currentPageUrl)}
            type="button"
          >
            <Icon name="restore" size={14} />
            {t('linkRestore')}
          </button>
        </div>
      </div>

      {result.status === 'cleaned' ? (
        <section className="grid gap-2.5 rounded-xl border border-line bg-surface p-3">
          <label className="text-xs font-semibold text-ink" htmlFor="link-cleaned-output">
            {t('linkResultLabel')}
          </label>
          <textarea
            className="field min-h-18 resize-y break-all"
            id="link-cleaned-output"
            readOnly
            rows={3}
            value={result.cleanedUrl}
          />

          {result.trackingParams.length === 0 ? (
            <p className="text-xs text-muted" role="status">
              {t('linkAlreadyClean')}
            </p>
          ) : (
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted" role="status">
                  {result.removedCount === 1
                    ? t('linkRemovedOne')
                    : t('linkRemovedCount', String(result.removedCount))}
                </p>
                {result.removedCount > 0 && (
                  <button
                    className="button button-plain min-h-0 px-1 py-0.5 text-xs"
                    onClick={restoreAllParams}
                    type="button"
                  >
                    {t('linkRestoreAll')}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.trackingParams.map((param) => (
                  <button
                    key={param.id}
                    aria-pressed={param.restored}
                    className={`button min-h-7 max-w-full px-2 py-0.5 text-xs ${param.restored ? '' : 'line-through opacity-80'}`}
                    onClick={() => toggleParam(param.id)}
                    title={`${param.key}=${param.value}`}
                    type="button"
                  >
                    <span className="truncate">{param.key}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              className="button button-primary"
              onClick={() => void copyCleaned()}
              type="button"
            >
              <Icon name="copy" size={15} />
              {t('linkCopy')}
            </button>
            <button
              className="button"
              onClick={() => openTool(TOOL_IDS.qrCode, result.cleanedUrl)}
              type="button"
            >
              <Icon name="qr" size={15} />
              {t('linkMakeQr')}
            </button>
          </div>
        </section>
      ) : (
        <div
          className={`flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-4 text-xs ${result.status === 'invalid' ? 'text-danger' : 'text-muted'}`}
          role={result.status === 'invalid' ? 'alert' : 'status'}
        >
          <Icon name={result.status === 'invalid' ? 'alert' : 'link'} size={16} />
          <span>{t(result.status === 'invalid' ? 'linkInvalid' : 'linkEmpty')}</span>
        </div>
      )}

      {toast && (
        <div
          className="pointer-events-none fixed inset-x-3 bottom-3 z-10 flex justify-center"
          role={toast.error ? 'alert' : 'status'}
        >
          <p className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink shadow-md">
            <span className={toast.error ? 'text-danger' : 'text-accent'}>
              <Icon name={toast.error ? 'alert' : 'check'} size={15} />
            </span>
            {t(toast.key)}
          </p>
        </div>
      )}
    </div>
  );
}
