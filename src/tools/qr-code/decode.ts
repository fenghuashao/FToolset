import jsQR from 'jsqr';
import {
  decodeImage,
  decodeMimeType,
  drawImage,
  MAX_FILE_BYTES,
  MAX_IMAGE_DIMENSION,
  readDataUrl,
} from './image';

export type QrDecodeErrorReason = 'type' | 'size' | 'unreadable' | 'not_found';

export class QrDecodeError extends Error {
  constructor(readonly reason: QrDecodeErrorReason) {
    super(reason);
  }
}

export interface QrDecodeResult {
  readonly text: string;
  readonly previewDataUrl: string;
}

interface NativeBarcodeDetector {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue?: string }>>;
}

interface NativeBarcodeDetectorConstructor {
  new (options: { formats: string[] }): NativeBarcodeDetector;
  getSupportedFormats(): Promise<string[]>;
}

const RETRY_MAX_DIMENSION = 1000;
const PREVIEW_MAX_DIMENSION = 240;

function scanCanvasWithJsQr(canvas: HTMLCanvasElement): string | null {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  });
  return result?.data ? result.data : null;
}

async function scanWithNativeBarcodeDetector(canvas: HTMLCanvasElement): Promise<string | null> {
  const Detector = (globalThis as { BarcodeDetector?: NativeBarcodeDetectorConstructor }).BarcodeDetector;
  if (typeof Detector !== 'function' || typeof Detector.getSupportedFormats !== 'function') {
    return null;
  }
  try {
    const formats = await Detector.getSupportedFormats();
    if (!formats.includes('qr_code')) return null;
    const detector = new Detector({ formats: ['qr_code'] });
    const detected = await detector.detect(canvas);
    const value = detected.find((item) => typeof item.rawValue === 'string' && item.rawValue)?.rawValue;
    return value ?? null;
  } catch {
    return null;
  }
}

export async function decodeQrFromBlob(file: Blob): Promise<QrDecodeResult> {
  const type = decodeMimeType(file);
  if (!type) throw new QrDecodeError('type');
  if (file.size > MAX_FILE_BYTES) throw new QrDecodeError('size');

  const input = type === file.type ? file : file.slice(0, file.size, type);
  let image: HTMLImageElement;
  try {
    image = await decodeImage(await readDataUrl(input));
  } catch {
    throw new QrDecodeError('unreadable');
  }

  const { naturalWidth: width, naturalHeight: height } = image;
  if (!width || !height) throw new QrDecodeError('unreadable');
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    throw new QrDecodeError('size');
  }

  const fullCanvas = drawImage(image, width, height, { willReadFrequently: true });
  let text = scanCanvasWithJsQr(fullCanvas);

  if (!text && Math.max(width, height) > RETRY_MAX_DIMENSION) {
    const scale = RETRY_MAX_DIMENSION / Math.max(width, height);
    const scaled = drawImage(
      image,
      Math.max(1, Math.round(width * scale)),
      Math.max(1, Math.round(height * scale)),
      { willReadFrequently: true },
    );
    text = scanCanvasWithJsQr(scaled);
  }

  if (!text) {
    text = await scanWithNativeBarcodeDetector(fullCanvas);
  }

  if (!text) throw new QrDecodeError('not_found');

  const previewScale = Math.min(1, PREVIEW_MAX_DIMENSION / Math.max(width, height));
  const previewCanvas = drawImage(
    image,
    Math.max(1, Math.round(width * previewScale)),
    Math.max(1, Math.round(height * previewScale)),
  );
  return {
    text,
    previewDataUrl: previewCanvas.toDataURL('image/png'),
  };
}
