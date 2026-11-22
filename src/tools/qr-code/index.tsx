import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Icon } from '../../shared/Icon';
import { t } from '../../shared/i18n';
import type { MessageKey } from '../../shared/i18n';
import {
  DEFAULT_QR_CONFIG,
  isQrCapacityError,
  QR_DEBOUNCE_MS,
  QR_SIZE,
  resetQrColors,
  withQrLogo,
} from './config';
import type { QrCorrection, QrDotStyle } from './config';
import { QrLogoError, readQrLogo } from './image';
import { renderQr } from './render';
import type { QrRender } from './render';

interface QrCodeProps {
  readonly initialText: string;
  readonly currentPageUrl: string;
}

const CORRECTIONS = [
  ['L', '7%'],
  ['M', '15%'],
  ['Q', '25%'],
  ['H', '30%'],
] as const;

const DOT_STYLES = [
  ['square', 'qrSquare'],
  ['dots', 'qrDots'],
  ['rounded', 'qrRounded'],
  ['classy', 'qrClassy'],
] as const;

function PreviewCanvas({ image }: { readonly image: HTMLCanvasElement }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    ref.current?.getContext('2d')?.drawImage(image, 0, 0);
  }, [image]);
  return (
    <canvas
      aria-label={t('qrPreview')}
      className="size-44 rounded-md bg-white shadow-sm"
      height={QR_SIZE}
      ref={ref}
      role="img"
      width={QR_SIZE}
    />
  );
}

export default function QrCode({ initialText, currentPageUrl }: QrCodeProps) {
  const [text, setText] = useState(initialText);
  const [config, setConfig] = useState(DEFAULT_QR_CONFIG);
  const request = useMemo(() => ({ text, config }), [text, config]);
  const [generation, setGeneration] = useState<{
    request: typeof request;
    image?: QrRender;
    error?: MessageKey;
  }>();
  const ready = generation?.request === request ? generation : undefined;
  const [toast, setToast] = useState<{ key: MessageKey; error: boolean }>();

  const [logoStatus, setLogoStatus] = useState<{ key: MessageKey; error: boolean }>();
  const [loadingLogo, setLoadingLogo] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const logoRevision = useRef(0);

  useEffect(() => {
    if (request.text === '') return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void renderQr(request.text, request.config).then(
        (image) => {
          if (!cancelled) setGeneration({ request, image });
        },
        (error: unknown) => {
          if (!cancelled) {
            setGeneration({
              request,
              error: isQrCapacityError(error) ? 'qrCapacityError' : 'qrRenderError',
            });
          }
        },
      );
    }, QR_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [request]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(undefined), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    return () => {
      logoRevision.current += 1;
    };
  }, []);

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    const revision = ++logoRevision.current;
    setLoadingLogo(true);
    setLogoStatus(undefined);
    try {
      const logo = await readQrLogo(file);
      if (revision !== logoRevision.current) return;
      setConfig((previous) => withQrLogo(previous, logo));
      setLogoStatus({ key: 'qrLogoAutoH', error: false });
    } catch (error) {
      if (revision !== logoRevision.current) return;
      const logoErrors = { type: 'qrLogoTypeError', size: 'qrLogoSizeError' } as const;
      const key = error instanceof QrLogoError ? logoErrors[error.reason] : 'qrLogoReadError';
      setLogoStatus({ key, error: true });
    } finally {
      if (revision === logoRevision.current) setLoadingLogo(false);
    }
  }

  function removeLogo() {
    logoRevision.current += 1;
    setLoadingLogo(false);
    setLogoStatus(undefined);
    setConfig((previous) => withQrLogo(previous, null));
  }

  async function copyPng() {
    if (!ready?.image) return;
    try {
      const item = new ClipboardItem({ 'image/png': ready.image.png });
      await navigator.clipboard.write([item]);
      setToast({ key: 'qrCopySuccess', error: false });
    } catch {
      setToast({ key: 'qrCopyError', error: true });
    }
  }

  function download(format: 'png' | 'svg') {
    if (!ready?.image) return;
    let url: string | undefined;
    try {
      url = URL.createObjectURL(ready.image[format]);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ftoolset-qr-${Date.now()}.${format}`;
      document.body.append(link);
      try {
        link.click();
      } finally {
        link.remove();
      }
    } catch {
      setToast({ key: 'qrDownloadError', error: true });
    } finally {
      if (url) {
        const downloadUrl = url;
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      }
    }
  }

  const previewStatus = ready?.error ?? (text === '' ? 'qrEmpty' : 'qrGenerating');

  return (
    <div className="grid gap-3.5">
      <div className="grid gap-1.5">
        <label className="text-sm font-semibold text-ink" htmlFor="qr-content">
          {t('qrContent')}
        </label>
        <textarea
          className="field min-h-18 resize-y break-words"
          id="qr-content"
          onChange={(event) => setText(event.currentTarget.value)}
          placeholder={t('qrContentPlaceholder')}
          rows={3}
          spellCheck={false}
          value={text}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            className="button button-plain"
            disabled={!text}
            onClick={() => setText('')}
            type="button"
          >
            {t('qrClear')}
          </button>
          <button
            className="button button-plain"
            disabled={!currentPageUrl || text === currentPageUrl}
            onClick={() => setText(currentPageUrl)}
            type="button"
          >
            <Icon name="restore" size={14} />
            {t('qrRestore')}
          </button>
        </div>
      </div>

      <section
        className="grid min-h-52 place-items-center rounded-xl border border-line bg-tint px-3 py-4"
        style={{
          backgroundImage: 'radial-gradient(var(--preview-grid) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
        }}
      >
        {ready?.image ? (
          <PreviewCanvas image={ready.image.canvas} />
        ) : (
          <div
            className={`grid size-44 content-center justify-items-center gap-2 rounded-lg border border-line bg-surface px-3 text-center text-sm ${ready?.error ? 'text-danger' : 'text-muted'}`}
            role={ready?.error ? 'alert' : 'status'}
          >
            <Icon name={ready?.error ? 'alert' : 'qr'} size={26} />
            <span>{t(previewStatus)}</span>
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          className="button button-primary"
          disabled={!ready?.image}
          onClick={() => void copyPng()}
          type="button"
        >
          <Icon name="copy" size={16} />
          {t('qrCopyPng')}
        </button>
        <div aria-label={t('qrExport')} className="flex gap-1.5" role="group">
          <button
            className="button"
            disabled={!ready?.image}
            onClick={() => download('png')}
            type="button"
          >
            <Icon name="download" size={14} />
            {t('qrDownloadPng')}
          </button>
          <button
            className="button"
            disabled={!ready?.image}
            onClick={() => download('svg')}
            type="button"
          >
            <Icon name="download" size={14} />
            {t('qrDownloadSvg')}
          </button>
        </div>
      </div>

      <details className="group rounded-lg border border-line bg-surface">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 text-sm font-semibold text-ink">
          <span className="inline-flex items-center gap-2">
            <Icon name="sliders" size={16} />
            {t('qrStyling')}
          </span>
          <span className="text-muted group-open:rotate-180">
            <Icon name="chevronDown" size={16} />
          </span>
        </summary>
        <div className="grid gap-3 border-t border-line p-3">
          <div className="grid grid-cols-2 gap-2.5">
            <label className="grid gap-1 text-xs font-medium text-ink">
              {t('qrCorrection')}
              <select
                className="field"
                onChange={(event) => {
                  const correction = event.currentTarget.value as QrCorrection;
                  setConfig((previous) => ({ ...previous, correction }));
                  setLogoStatus(undefined);
                }}
                value={config.correction}
              >
                {CORRECTIONS.map(([level, percent]) => (
                  <option key={level} value={level}>{level} · {percent}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium text-ink">
              {t('qrDotStyle')}
              <select
                className="field"
                onChange={(event) => {
                  const dotStyle = event.currentTarget.value as QrDotStyle;
                  setConfig((previous) => ({ ...previous, dotStyle }));
                }}
                value={config.dotStyle}
              >
                {DOT_STYLES.map(([value, key]) => (
                  <option key={value} value={value}>{t(key)}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {([
              ['foreground', 'qrForeground'],
              ['background', 'qrBackground'],
            ] as const).map(([field, key]) => (
              <label className="flex min-w-0 items-center gap-1.5 text-xs text-ink" key={field}>
                <input
                  className="size-7 cursor-pointer rounded border border-line bg-surface p-0.5"
                  onChange={(event) => {
                    const color = event.currentTarget.value;
                    setConfig((previous) => ({ ...previous, [field]: color }));
                  }}
                  type="color"
                  value={config[field]}
                />
                {t(key)}
              </label>
            ))}
            <button
              className="button button-plain ml-auto"
              disabled={
                config.foreground === DEFAULT_QR_CONFIG.foreground &&
                config.background === DEFAULT_QR_CONFIG.background
              }
              onClick={() => setConfig(resetQrColors)}
              type="button"
            >
              {t('qrResetColors')}
            </button>
          </div>
          <div className="grid gap-1.5 border-t border-line pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                aria-label={t('qrUploadLogo')}
                hidden
                onChange={(event) => void uploadLogo(event)}
                ref={logoInput}
                type="file"
              />
              <button
                aria-busy={loadingLogo}
                className="button"
                disabled={loadingLogo}
                onClick={() => logoInput.current?.click()}
                type="button"
              >
                <Icon name="image" size={15} />
                {t('qrUploadLogo')}
              </button>
              {config.logo && (
                <button className="button button-plain" onClick={removeLogo} type="button">
                  {t('qrRemoveLogo')}
                </button>
              )}
            </div>
            {config.logo && (
              <p className="truncate text-xs text-muted" title={config.logo.name}>
                {config.logo.name}
              </p>
            )}
            <p className="text-xs text-muted">{t('qrLogoHelp')}</p>
            {logoStatus && (
              <p
                className={`text-xs ${logoStatus.error ? 'text-danger' : 'text-muted'}`}
                role={logoStatus.error ? 'alert' : 'status'}
              >
                {t(logoStatus.key)}
              </p>
            )}
          </div>
        </div>
      </details>

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
