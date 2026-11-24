import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../shared/Icon';
import { t, type MessageKey } from '../../shared/i18n';
import type { ToolProps } from '../registry';
import {
  DEFAULT_COLOR_HEX,
  parseColor,
  type ContrastResult,
  type ParsedColor,
  type WcagLevel,
} from './color';
import {
  addRecentColor,
  favoriteColorsKey,
  MAX_FAVORITE_COLORS,
  MAX_RECENT_COLORS,
  parseStoredColors,
  recentColorsKey,
  toggleFavoriteColor,
} from './storage';

interface EyeDropperResult {
  readonly sRGBHex: string;
}

interface EyeDropperInstance {
  open(options?: { signal?: AbortSignal }): Promise<EyeDropperResult>;
}

type EyeDropperConstructor = new () => EyeDropperInstance;

function getEyeDropperConstructor(): EyeDropperConstructor | null {
  const candidate = (window as unknown as { EyeDropper?: unknown }).EyeDropper;
  return typeof candidate === 'function' ? (candidate as EyeDropperConstructor) : null;
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  return typeof error === 'object' && error !== null && 'name' in error && (error as { name?: unknown }).name === 'AbortError';
}

function levelMessageKey(level: WcagLevel): MessageKey {
  switch (level) {
    case 'AAA':
      return 'colorContrastPassAAA';
    case 'AA':
      return 'colorContrastPassAA';
    case 'AA Large':
      return 'colorContrastPassLarge';
    case 'Fail':
      return 'colorContrastFail';
  }
}

export default function ColorPicker({ launchText, reportDraft }: ToolProps) {
  const initialFromLaunch = useMemo(
    () => (launchText ? parseColor(launchText) : null),
    [launchText],
  );
  const [activeHex, setActiveHex] = useState<string>(initialFromLaunch?.hex ?? DEFAULT_COLOR_HEX);
  const [inputValue, setInputValue] = useState<string>(initialFromLaunch?.hex ?? DEFAULT_COLOR_HEX);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [favoriteColors, setFavoriteColors] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const [pickError, setPickError] = useState(false);
  const [toast, setToast] = useState<{ message: string; error: boolean }>();

  const mountedRef = useRef(true);
  const userTouchedRef = useRef(Boolean(initialFromLaunch));
  const abortRef = useRef<AbortController | null>(null);

  const eyeDropperAvailable = getEyeDropperConstructor() !== null;
  const parsedColor: ParsedColor = useMemo(
    () => parseColor(activeHex) ?? (parseColor(DEFAULT_COLOR_HEX) as ParsedColor),
    [activeHex],
  );
  const trimmedInput = inputValue.trim();
  const inputInvalid = trimmedInput !== '' && parseColor(trimmedInput) === null;
  const isFavorite = favoriteColors.includes(parsedColor.hex);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    let active = true;
    void chrome.storage.local
      .get([recentColorsKey, favoriteColorsKey])
      .catch(() => ({} as Record<string, unknown>))
      .then((stored) => {
        if (!active) return;
        const loadedRecent = parseStoredColors(stored[recentColorsKey], MAX_RECENT_COLORS);
        const loadedFavorites = parseStoredColors(stored[favoriteColorsKey], MAX_FAVORITE_COLORS);
        setRecentColors(loadedRecent);
        setFavoriteColors(loadedFavorites);
        if (!userTouchedRef.current && loadedRecent[0]) {
          setActiveHex(loadedRecent[0]);
          setInputValue(loadedRecent[0]);
        }
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    reportDraft?.(parsedColor.hex);
  }, [parsedColor.hex, reportDraft]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(undefined), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function recordRecent(hex: string) {
    setRecentColors((previous) => {
      const next = addRecentColor(previous, hex);
      void chrome.storage.local.set({ [recentColorsKey]: next }).catch(() => undefined);
      return next;
    });
  }

  function selectColor(hex: string, saveRecent: boolean) {
    const parsed = parseColor(hex);
    if (!parsed) return;
    userTouchedRef.current = true;
    setActiveHex(parsed.hex);
    setInputValue(parsed.hex);
    setPickError(false);
    if (saveRecent) recordRecent(parsed.hex);
  }

  function startScreenPick() {
    const EyeDropperCtor = getEyeDropperConstructor();
    if (!EyeDropperCtor || picking) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPicking(true);
    setPickError(false);

    // Invoke EyeDropper.open() synchronously inside the click handler to keep transient user activation.
    const picker = new EyeDropperCtor();
    void picker.open({ signal: controller.signal }).then(
      (result) => {
        if (!mountedRef.current) return;
        const parsed = parseColor(result.sRGBHex);
        if (!parsed) return;
        selectColor(parsed.hex, true);
        void navigator.clipboard.writeText(parsed.hex).then(
          () => {
            if (mountedRef.current) {
              setToast({ message: t('colorPickedCopied', parsed.hex), error: false });
            }
          },
          () => {
            if (mountedRef.current) {
              setToast({ message: t('colorPicked', parsed.hex), error: false });
            }
          },
        );
      },
      (error: unknown) => {
        if (!mountedRef.current || isAbortError(error)) return;
        setPickError(true);
      },
    ).finally(() => {
      if (abortRef.current === controller) abortRef.current = null;
      if (mountedRef.current) setPicking(false);
    });
  }

  function handleInputChange(next: string) {
    userTouchedRef.current = true;
    setInputValue(next);
    const parsed = parseColor(next);
    if (parsed) {
      setActiveHex(parsed.hex);
    }
  }

  function commitManualInput() {
    const parsed = parseColor(inputValue);
    if (!parsed) return;
    selectColor(parsed.hex, true);
  }

  function handleToggleFavorite() {
    userTouchedRef.current = true;
    setFavoriteColors((previous) => {
      const next = toggleFavoriteColor(previous, parsedColor.hex);
      void chrome.storage.local.set({ [favoriteColorsKey]: next }).catch(() => undefined);
      return next;
    });
  }

  function clearRecent() {
    setRecentColors([]);
    void chrome.storage.local.set({ [recentColorsKey]: [] }).catch(() => undefined);
  }

  async function copyFormat(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setToast({ message: t('colorCopied', value), error: false });
    } catch {
      setToast({ message: t('colorCopyError'), error: true });
    }
  }

  const formats = [
    { label: 'HEX', value: parsedColor.hex },
    { label: 'RGB', value: parsedColor.rgbString },
    { label: 'HSL', value: parsedColor.hslString },
  ] as const;

  return (
    <div className="grid gap-3.5">
      <div className="flex items-center gap-2">
        <button
          className="button button-primary flex-1"
          disabled={!eyeDropperAvailable || picking}
          onClick={startScreenPick}
          type="button"
        >
          <Icon name="eyedropper" size={16} />
          {picking ? t('colorPicking') : t('colorPickScreen')}
        </button>

        <label
          aria-label={t('colorNativePicker')}
          className="button relative shrink-0 overflow-hidden px-2"
          title={t('colorNativePicker')}
        >
          <span
            aria-hidden="true"
            className="block h-5 w-5 rounded border border-line"
            style={{ backgroundColor: parsedColor.hex }}
          />
          <input
            aria-label={t('colorNativePicker')}
            className="absolute inset-0 cursor-pointer opacity-0"
            onBlur={() => recordRecent(parsedColor.hex)}
            onChange={(event) => {
              userTouchedRef.current = true;
              const next = event.currentTarget.value.toUpperCase();
              setActiveHex(next);
              setInputValue(next);
            }}
            type="color"
            value={parsedColor.hex.toLowerCase()}
          />
        </label>

        <button
          aria-label={isFavorite ? t('colorFavoriteRemove') : t('colorFavoriteAdd')}
          aria-pressed={isFavorite}
          className="button shrink-0 px-2.5"
          onClick={handleToggleFavorite}
          title={isFavorite ? t('colorFavoriteRemove') : t('colorFavoriteAdd')}
          type="button"
        >
          <Icon name="star" size={15} />
        </button>
      </div>

      {!eyeDropperAvailable && (
        <p className="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-muted" role="status">
          {t('colorUnsupported')}
        </p>
      )}

      {pickError && (
        <div
          className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-danger"
          role="alert"
        >
          <Icon name="alert" size={15} />
          <span>{t('colorPickError')}</span>
        </div>
      )}

      <div className="grid gap-3.5 sm:grid-cols-2 sm:items-start">
        <div className="grid gap-3">
          <div
            className="flex h-24 items-end justify-between rounded-xl border border-line px-3.5 py-3 sm:h-28"
            style={{ backgroundColor: parsedColor.hex, color: parsedColor.recommendedText }}
          >
            <span className="text-2xl font-bold tracking-tight">Aa</span>
            <span className="font-mono text-sm font-semibold">{parsedColor.hex}</span>
          </div>

          <div className="grid gap-1">
            <label className="text-xs font-semibold text-ink" htmlFor="color-value-input">
              {t('colorInputLabel')}
            </label>
            <input
              aria-invalid={inputInvalid}
              className="field font-mono text-xs"
              id="color-value-input"
              onBlur={commitManualInput}
              onChange={(event) => handleInputChange(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitManualInput();
                }
              }}
              placeholder={t('colorInputPlaceholder')}
              spellCheck={false}
              type="text"
              value={inputValue}
            />
            {inputInvalid ? (
              <p className="text-xs text-danger" role="alert">
                {t('colorInputInvalid')}
              </p>
            ) : (
              <p className="text-[11px] text-muted">{t('colorScreenNote')}</p>
            )}
          </div>

          <section
            aria-label={t('colorFormatsLabel')}
            className="grid gap-1.5 rounded-xl border border-line bg-surface p-2.5"
          >
            {formats.map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between gap-2 rounded-lg bg-shell px-2.5 py-1.5"
              >
                <span className="w-9 shrink-0 text-[11px] font-semibold text-muted">{label}</span>
                <code className="min-w-0 flex-1 truncate font-mono text-xs text-ink select-all">
                  {value}
                </code>
                <button
                  aria-label={`${t('colorCopy')} ${label}`}
                  className="button min-h-7 shrink-0 px-2 py-0.5 text-xs"
                  onClick={() => void copyFormat(value)}
                  type="button"
                >
                  <Icon name="copy" size={13} />
                  {t('colorCopy')}
                </button>
              </div>
            ))}
          </section>
        </div>

        <div className="grid gap-3">
          <section className="grid gap-2 rounded-xl border border-line bg-surface p-3">
            <h2 className="text-xs font-semibold text-ink">{t('colorContrastTitle')}</h2>
            <div className="grid grid-cols-2 gap-2">
              <ContrastTile
                background={parsedColor.hex}
                foreground="#FFFFFF"
                label={t('colorContrastWhite')}
                result={parsedColor.onWhite}
              />
              <ContrastTile
                background={parsedColor.hex}
                foreground="#000000"
                label={t('colorContrastBlack')}
                result={parsedColor.onBlack}
              />
            </div>
          </section>

          <section className="grid gap-2 rounded-xl border border-line bg-surface p-3">
            <h2 className="text-xs font-semibold text-ink">{t('colorFavoritesTitle')}</h2>
            {favoriteColors.length > 0 ? (
              <SwatchList
                activeHex={parsedColor.hex}
                colors={favoriteColors}
                onSelect={(hex) => selectColor(hex, false)}
              />
            ) : (
              <p className="text-xs text-muted">{t('colorFavoritesEmpty')}</p>
            )}
          </section>

          <section className="grid gap-2 rounded-xl border border-line bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold text-ink">{t('colorRecentTitle')}</h2>
              {recentColors.length > 0 && (
                <button
                  className="button button-plain min-h-0 px-1 py-0.5 text-xs"
                  onClick={clearRecent}
                  type="button"
                >
                  {t('colorClearRecent')}
                </button>
              )}
            </div>
            {recentColors.length > 0 ? (
              <SwatchList
                activeHex={parsedColor.hex}
                colors={recentColors}
                onSelect={(hex) => selectColor(hex, false)}
              />
            ) : (
              <p className="text-xs text-muted">{t('colorRecentEmpty')}</p>
            )}
          </section>
        </div>
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
            {toast.message}
          </p>
        </div>
      )}
    </div>
  );
}

function ContrastTile({
  background,
  foreground,
  label,
  result,
}: {
  readonly background: string;
  readonly foreground: string;
  readonly label: string;
  readonly result: ContrastResult;
}) {
  const pass = result.level === 'AAA' || result.level === 'AA';
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <div
        className="flex items-center justify-between px-2.5 py-2 text-xs font-semibold"
        style={{ backgroundColor: background, color: foreground }}
      >
        <span className="text-sm font-bold">Aa</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="flex items-center justify-between gap-1 bg-shell px-2.5 py-1.5 text-[11px]">
        <span className="font-mono text-ink">{result.formatted}</span>
        <span
          className={`rounded px-1.5 py-0.5 font-semibold ${
            pass
              ? 'bg-tint text-accent'
              : result.level === 'AA Large'
                ? 'bg-surface text-ink'
                : 'bg-surface text-danger'
          }`}
        >
          {t(levelMessageKey(result.level))}
        </span>
      </div>
    </div>
  );
}

function SwatchList({
  activeHex,
  colors,
  onSelect,
}: {
  readonly activeHex: string;
  readonly colors: readonly string[];
  readonly onSelect: (hex: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((hex) => {
        const active = hex === activeHex;
        return (
          <button
            key={hex}
            aria-label={hex}
            aria-pressed={active}
            className={`h-7 w-7 rounded-md border border-line transition-transform hover:scale-105 ${
              active ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''
            }`}
            onClick={() => onSelect(hex)}
            style={{ backgroundColor: hex }}
            title={hex}
            type="button"
          />
        );
      })}
    </div>
  );
}
