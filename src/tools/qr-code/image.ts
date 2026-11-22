import type { QrLogo } from './config';

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 4096;
const MAX_LOGO_DIMENSION = 256;

type LogoErrorReason = 'type' | 'size';

export class QrLogoError extends Error {
  constructor(readonly reason: LogoErrorReason) {
    super(reason);
  }
}

function logoMimeType(file: File): string {
  const type = file.type.toLowerCase();
  if (['image/png', 'image/jpeg', 'image/svg+xml'].includes(type)) return type;
  if (!type || type === 'application/octet-stream') {
    if (/\.png$/i.test(file.name)) return 'image/png';
    if (/\.jpe?g$/i.test(file.name)) return 'image/jpeg';
    if (/\.svg$/i.test(file.name)) return 'image/svg+xml';
  }
  throw new QrLogoError('type');
}

function readDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('FileReader returned an invalid image.'));
    }, { once: true });
    reader.addEventListener('error', () => reject(reader.error), { once: true });
    reader.addEventListener('abort', () => reject(new Error('Image read was aborted.')), {
      once: true,
    });
    reader.readAsDataURL(blob);
  });
}

export async function decodeImage(source: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = source;
  await image.decode();
  return image;
}

export function drawImage(
  image: CanvasImageSource,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not open a canvas context.');
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

export async function readQrLogo(file: File): Promise<QrLogo> {
  const type = logoMimeType(file);
  if (file.size > MAX_FILE_BYTES) throw new QrLogoError('size');

  // SVGs loaded as images run in static image mode. Scripts and external
  // resources are blocked. Export only the raster pixels of every upload.
  const input = type === file.type ? file : file.slice(0, file.size, type);
  const image = await decodeImage(await readDataUrl(input));
  const { naturalWidth: width, naturalHeight: height } = image;
  if (!width || !height) throw new Error('The image is empty.');
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    throw new QrLogoError('size');
  }
  const scale = Math.min(1, MAX_LOGO_DIMENSION / Math.max(width, height));
  const canvas = drawImage(
    image,
    Math.max(1, Math.round(width * scale)),
    Math.max(1, Math.round(height * scale)),
  );
  return { dataUrl: canvas.toDataURL('image/png'), name: file.name };
}
