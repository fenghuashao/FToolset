import QRCodeStyling from 'qr-code-styling';
import { buildQrOptions, QR_SIZE, type QrConfig } from './config';
import { decodeImage, drawImage } from './image';

export interface QrRender {
  readonly canvas: HTMLCanvasElement;
  readonly png: Blob;
  readonly svg: Blob;
}

export async function renderQr(text: string, config: QrConfig): Promise<QrRender> {
  const qr = new QRCodeStyling(buildQrOptions(text, config));
  // A failed Image load inside qr-code-styling 1.9.2 can leave its
  // SVG drawing promise pending. Give the user a recoverable state.
  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error('QR image rendering timed out.')), 5000);
  });
  const svg = await Promise.race([qr.getRawData('svg'), timeout]).finally(() =>
    window.clearTimeout(timer),
  );
  if (!(svg instanceof Blob)) throw new Error('Could not render QR code SVG.');

  const url = URL.createObjectURL(svg);
  try {
    const canvas = drawImage(await decodeImage(url), QR_SIZE, QR_SIZE);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Could not render QR code PNG.'));
      }, 'image/png');
    });
    return { canvas, png, svg };
  } finally {
    URL.revokeObjectURL(url);
  }
}
