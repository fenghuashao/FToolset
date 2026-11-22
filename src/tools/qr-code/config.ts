import type { DotType, ErrorCorrectionLevel, Options } from 'qr-code-styling';

export type QrDotStyle = Extract<DotType, 'square' | 'dots' | 'rounded' | 'classy'>;
export type QrCorrection = ErrorCorrectionLevel;

export interface QrLogo {
  readonly dataUrl: string;
  readonly name: string;
}

export interface QrConfig {
  readonly foreground: string;
  readonly background: string;
  readonly dotStyle: QrDotStyle;
  readonly correction: QrCorrection;
  readonly logo: QrLogo | null;
}

export const QR_SIZE = 512;
export const QR_MARGIN = 72;
export const QR_DEBOUNCE_MS = 150;
const MAX_TEXT_LENGTH = 7089; // Maximum possible QR payload, in numeric mode.
const encoder = new TextEncoder();

export const DEFAULT_QR_CONFIG: QrConfig = {
  foreground: '#000000',
  background: '#ffffff',
  dotStyle: 'square',
  correction: 'M',
  logo: null,
};

export class QrCapacityError extends Error {}

export function isQrCapacityError(error: unknown): boolean {
  // qrcode-generator 1.x can throw an overflow string.
  return (
    error instanceof QrCapacityError ||
    /code length overflow/i.test(error instanceof Error ? error.message : String(error))
  );
}

export function resetQrColors(config: QrConfig): QrConfig {
  return {
    ...config,
    foreground: DEFAULT_QR_CONFIG.foreground,
    background: DEFAULT_QR_CONFIG.background,
  };
}

export function withQrLogo(config: QrConfig, logo: QrLogo | null): QrConfig {
  return { ...config, logo, correction: logo ? 'H' : config.correction };
}

export function buildQrOptions(text: string, config: QrConfig): Options {
  if (text.length > MAX_TEXT_LENGTH) throw new QrCapacityError();

  const bytes = encoder.encode(text);
  const useUtf8Bytes = bytes.length !== text.length;
  return {
    type: 'svg',
    width: QR_SIZE,
    height: QR_SIZE,
    margin: QR_MARGIN,
    // The generator bundled in qr-code-styling 1.9.2 writes each Byte-mode
    // code unit's low 8 bits. Supply real UTF-8 bytes for non-ASCII text.
    data: useUtf8Bytes ? String.fromCharCode(...bytes) : text,
    qrOptions: {
      errorCorrectionLevel: config.correction,
      ...(useUtf8Bytes ? { mode: 'Byte' } : {}),
    },
    dotsOptions: { color: config.foreground, type: config.dotStyle },
    cornersSquareOptions: { color: config.foreground, type: 'square' },
    cornersDotOptions: { color: config.foreground, type: 'square' },
    backgroundOptions: { color: config.background },
    image: config.logo?.dataUrl,
    imageOptions: {
      imageSize: 0.27,
      margin: 2,
      hideBackgroundDots: true,
      saveAsBlob: false,
    },
  };
}
