import { describe, expect, it } from 'vitest';
import {
  buildQrOptions,
  DEFAULT_QR_CONFIG,
  isQrCapacityError,
  QR_MARGIN,
  QR_SIZE,
  resetQrColors,
  withQrLogo,
} from '../../src/tools/qr-code/config';

describe('QR configuration', () => {
  it('keeps a quiet zone of at least four modules for a version 1 symbol', () => {
    const options = buildQrOptions('hello', DEFAULT_QR_CONFIG);
    expect(options).toMatchObject({
      type: 'svg',
      width: QR_SIZE,
      height: QR_SIZE,
      margin: QR_MARGIN,
      data: 'hello',
      qrOptions: { errorCorrectionLevel: 'M' },
    });
    expect(QR_MARGIN).toBeGreaterThanOrEqual(((QR_SIZE - 2 * QR_MARGIN) / 21) * 4);
  });

  it('preserves Unicode and whitespace in Byte mode', () => {
    const text = '  象棋 😀\nリンク  ';
    const options = buildQrOptions(text, DEFAULT_QR_CONFIG);
    expect(options.qrOptions?.mode).toBe('Byte');
    const bytes = Uint8Array.from(options.data!, (char) => char.charCodeAt(0));
    expect(new TextDecoder().decode(bytes)).toBe(text);
  });

  it('lets the library choose an efficient mode for ASCII text', () => {
    const options = buildQrOptions('1234567890', DEFAULT_QR_CONFIG);
    expect(options.data).toBe('1234567890');
    expect(options.qrOptions?.mode).toBeUndefined();
  });

  it('switches to H when uploading a logo and preserves H when removing it', () => {
    const logo = { name: 'icon.png', dataUrl: 'data:image/png;base64,AA==' };
    const config = withQrLogo(DEFAULT_QR_CONFIG, logo);
    expect(config.correction).toBe('H');
    expect(buildQrOptions('hello', config).image).toBe(logo.dataUrl);
    expect(withQrLogo(config, null)).toEqual({ ...DEFAULT_QR_CONFIG, correction: 'H' });
    expect(DEFAULT_QR_CONFIG.logo).toBeNull();
  });

  it('resets only colors and uses custom colors for dots and finder patterns', () => {
    const logo = { name: 'icon.png', dataUrl: 'data:image/png;base64,AA==' };
    const config = {
      ...withQrLogo(DEFAULT_QR_CONFIG, logo),
      foreground: '#224466',
      background: '#ffffff',
      dotStyle: 'classy' as const,
    };
    const options = buildQrOptions('hello', config);
    expect(options.dotsOptions).toMatchObject({ color: '#224466', type: 'classy' });
    expect(options.cornersSquareOptions).toMatchObject({ color: '#224466' });
    expect(resetQrColors(config)).toEqual({
      ...config,
      foreground: DEFAULT_QR_CONFIG.foreground,
      background: DEFAULT_QR_CONFIG.background,
    });
  });

  it('classifies capacity limits without mislabeling render errors', () => {
    expect(() => buildQrOptions('x'.repeat(7090), DEFAULT_QR_CONFIG)).toThrow();
    expect(isQrCapacityError('code length overflow. (592>128)')).toBe(true);
    expect(isQrCapacityError(new Error('Could not render SVG'))).toBe(false);
  });
});
