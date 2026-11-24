import { useEffect, useState } from 'react';
import { Icon } from '../../shared/Icon';
import { t, type MessageKey } from '../../shared/i18n';
import type { ToolProps } from '../registry';
import { analyzeText, type ReadingTime, type TextStats } from './stats';
import {
  cleanSpaces,
  dedupeLines,
  fixPdfLineBreaks,
  removeBlankLines,
  transformCase,
  type LetterCaseMode,
} from './transform';

const LARGE_TEXT_THRESHOLD = 50_000;
const STATS_DEBOUNCE_MS = 150;
const MAX_UNDO_STEPS = 10;

const CASE_ACTIONS: ReadonlyArray<readonly [LetterCaseMode, MessageKey]> = [
  ['upper', 'textCaseUpper'],
  ['lower', 'textCaseLower'],
  ['sentence', 'textCaseSentence'],
  ['title', 'textCaseTitle'],
];

function formatReadingTime(readingTime: ReadingTime): string {
  switch (readingTime.kind) {
    case 'zero':
      return t('textReadZero');
    case 'under_one':
      return t('textReadLessThanMin');
    case 'minutes':
      return t('textReadMinutes', String(readingTime.minutes));
  }
}

export default function TextCleaner({ launchText }: ToolProps) {
  const initial = launchText ?? '';
  const [text, setText] = useState(initial);
  const [originalText, setOriginalText] = useState(initial);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [stats, setStats] = useState<TextStats>(() => analyzeText(initial));
  const [toast, setToast] = useState<{ key: MessageKey; error: boolean }>();

  useEffect(() => {
    if (text.length <= LARGE_TEXT_THRESHOLD) {
      setStats(analyzeText(text));
      return;
    }
    const timer = window.setTimeout(() => {
      setStats(analyzeText(text));
    }, STATS_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(undefined), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function handleInputChange(next: string) {
    setText(next);
  }

  function applyTransform(transform: (value: string) => string) {
    const next = transform(text);
    if (next === text) {
      setToast({ key: 'textNoChange', error: false });
      return;
    }
    if (originalText === '') {
      setOriginalText(text);
    }
    setUndoStack((previous) => [...previous.slice(-(MAX_UNDO_STEPS - 1)), text]);
    setText(next);
  }

  function undo() {
    const last = undoStack[undoStack.length - 1];
    if (last === undefined) return;
    setText(last);
    setUndoStack((previous) => previous.slice(0, -1));
  }

  function resetToOriginal() {
    if (!originalText || text === originalText) return;
    setUndoStack((previous) => [...previous.slice(-(MAX_UNDO_STEPS - 1)), text]);
    setText(originalText);
  }

  function clearAll() {
    if (!text && !originalText) return;
    if (text) {
      setUndoStack((previous) => [...previous.slice(-(MAX_UNDO_STEPS - 1)), text]);
    }
    setText('');
    setOriginalText(initial);
  }

  async function copyResult() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setToast({ key: 'textCopySuccess', error: false });
    } catch {
      setToast({ key: 'textCopyError', error: true });
    }
  }

  return (
    <div className="grid gap-3">
      <section className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-line bg-surface px-3 py-2">
          <p className="text-xs text-muted">{t('textStatChars')}</p>
          <p className="text-base font-bold text-ink">{stats.characters}</p>
          <p className="text-xs text-muted">{t('textStatNoSpaces', String(stats.charactersNoSpaces))}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface px-3 py-2">
          <p className="text-xs text-muted">{t('textStatWords')}</p>
          <p className="text-base font-bold text-ink">{stats.words}</p>
          <p className="text-xs text-muted">{t('textStatCjk', String(stats.cjkCharacters))}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface px-3 py-2">
          <p className="text-xs text-muted">{t('textStatParagraphs')}</p>
          <p className="text-base font-bold text-ink">{stats.paragraphs}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface px-3 py-2">
          <p className="text-xs text-muted">{t('textStatReadTime')}</p>
          <p className="text-base font-bold text-ink">{formatReadingTime(stats.readingTime)}</p>
        </div>
      </section>

      <div className="grid gap-1.5">
        <label className="text-sm font-semibold text-ink" htmlFor="text-cleaner-input">
          {t('textInputLabel')}
        </label>
        <textarea
          className="field min-h-28 resize-y break-words"
          id="text-cleaner-input"
          onChange={(event) => handleInputChange(event.currentTarget.value)}
          placeholder={t('textInputPlaceholder')}
          rows={5}
          value={text}
        />
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <button
          className="button"
          disabled={!text}
          onClick={() => applyTransform(cleanSpaces)}
          type="button"
        >
          {t('textActionCleanSpaces')}
        </button>
        <button
          className="button"
          disabled={!text}
          onClick={() => applyTransform(removeBlankLines)}
          type="button"
        >
          {t('textActionRemoveBlankLines')}
        </button>
        <button
          className="button"
          disabled={!text}
          onClick={() => applyTransform(fixPdfLineBreaks)}
          type="button"
        >
          {t('textActionFixPdf')}
        </button>
        <button
          className="button"
          disabled={!text}
          onClick={() => applyTransform(dedupeLines)}
          type="button"
        >
          {t('textActionDedupeLines')}
        </button>
      </div>

      <details className="group rounded-lg border border-line bg-surface">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-2.5 text-xs font-semibold text-ink">
          <span>{t('textCaseToggle')}</span>
          <span className="text-muted group-open:rotate-180">
            <Icon name="chevronDown" size={15} />
          </span>
        </summary>
        <div className="grid grid-cols-2 gap-1.5 border-t border-line p-2.5">
          {CASE_ACTIONS.map(([mode, key]) => (
            <button
              key={mode}
              className="button min-h-8"
              disabled={!text}
              onClick={() => applyTransform((value) => transformCase(value, mode))}
              type="button"
            >
              {t(key)}
            </button>
          ))}
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          className="button button-primary"
          disabled={!text}
          onClick={() => void copyResult()}
          type="button"
        >
          <Icon name="copy" size={15} />
          {t('textCopy')}
        </button>
        <button
          className="button"
          disabled={undoStack.length === 0}
          onClick={undo}
          type="button"
        >
          <Icon name="undo" size={14} />
          {t('textUndo')}
        </button>
        <button
          className="button button-plain ml-auto"
          disabled={!originalText || text === originalText}
          onClick={resetToOriginal}
          type="button"
        >
          {t('textReset')}
        </button>
        <button
          className="button button-plain"
          disabled={!text}
          onClick={clearAll}
          type="button"
        >
          {t('textClear')}
        </button>
      </div>

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
