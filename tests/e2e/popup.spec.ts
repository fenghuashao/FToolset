import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  chromium,
  expect,
  test as base,
  type BrowserContext,
  type CDPSession,
  type Locator,
  type Page,
  type Worker,
} from '@playwright/test';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import sharp from 'sharp';

const extensionDir = fileURLToPath(new URL('../../.output/chrome-mv3', import.meta.url));
const fixtureUrl = 'https://ftoolset.test/articles/chess?part=1';
const qrText = 'https://github.com';
const qrSize = 512;

interface ExtensionFixture {
  context: BrowserContext;
  id: string;
  popupUrl: string;
  worker: Worker;
}

async function launchExtension(locale: string, headless: boolean | undefined, colorScheme: 'light' | 'dark' | 'no-preference' | undefined) {
  const options = {
    channel: 'chromium',
    headless,
    locale,
    colorScheme,
    acceptDownloads: true,
    args: [
      `--disable-extensions-except=${extensionDir}`,
      `--load-extension=${extensionDir}`,
      // Only the disposable browser allows the CDP equivalent of a toolbar click.
      '--enable-unsafe-extension-debugging',
      `--lang=${locale}`,
    ],
    env: { ...process.env, LANGUAGE: locale.replace('-', '_') },
  };
  if (process.platform !== 'darwin') return chromium.launchPersistentContext('', options);

  // Cocoa reads its own language arguments even when Chromium's --lang is set.
  const wrapperDir = await mkdtemp(join(tmpdir(), 'ftoolset-chromium-'));
  try {
    const executablePath = join(wrapperDir, 'chromium');
    await writeFile(executablePath, '#!/bin/sh\nexec "$FTOOLSET_BROWSER" -AppleLanguages "($FTOOLSET_BROWSER_LOCALE)" "$@"\n', { mode: 0o700 });
    return await chromium.launchPersistentContext('', {
      ...options,
      executablePath,
      ignoreDefaultArgs: ['about:blank'],
      env: { ...options.env, FTOOLSET_BROWSER: chromium.executablePath(), FTOOLSET_BROWSER_LOCALE: locale },
    });
  } finally {
    await rm(wrapperDir, { recursive: true, force: true });
  }
}

const test = base.extend<{ extension: ExtensionFixture }>({
  extension: async ({ colorScheme, headless, locale }, use) => {
    const manifest = JSON.parse(await readFile(join(extensionDir, 'manifest.json'), 'utf8'));
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.action?.default_popup).toEqual(expect.any(String));
    const context = await launchExtension(locale ?? 'en-US', headless, colorScheme ?? undefined);
    const errors: string[] = [];
    context.on('weberror', (error) => errors.push(error.error().message));
    context.on('console', (message) => {
      if (message.type() === 'error' && message.location().url.startsWith('chrome-extension:')) {
        errors.push(message.text());
      }
    });

    try {
      await context.route(/^https?:\/\//, (route) => {
        if (route.request().url() === fixtureUrl) {
          return route.fulfill({ contentType: 'text/html', body: '<title>FToolset test article</title>' });
        }
        return route.abort('blockedbyclient');
      });

      const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
      const workerUrl = new URL(worker.url());
      expect(workerUrl.protocol).toBe('chrome-extension:');
      expect(workerUrl.pathname).toBe(`/${manifest.background.service_worker}`);
      await use({
        context,
        id: workerUrl.hostname,
        popupUrl: new URL(manifest.action.default_popup, workerUrl).href,
        worker,
      });
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  },
});

function content(page: Page) {
  return page.getByRole('textbox', { name: 'Content', exact: true });
}

function preview(page: Page) {
  return page.getByRole('img', { name: 'QR code preview', exact: true });
}

async function openPopup(extension: ExtensionFixture) {
  const page = await extension.context.newPage();
  await page.goto(extension.popupUrl);
  return page;
}

type EvaluatePopup = <T>(evaluate: () => T) => Promise<T>;

function evaluateTarget(cdp: CDPSession, sessionId: string): EvaluatePopup {
  let nextId = 0;
  return <T>(evaluate: () => T) => new Promise<T>((resolve, reject) => {
    const id = ++nextId;
    const eventName = 'Target.receivedMessageFromTarget';
    function onMessage(event: { sessionId: string; message: string }) {
      if (event.sessionId !== sessionId) return;
      const message = JSON.parse(event.message);
      if (message.id !== id) return;
      cdp.off(eventName, onMessage);
      if (message.error || message.result.exceptionDetails) {
        reject(new Error(message.error?.message ?? message.result.exceptionDetails.text));
      } else {
        resolve(message.result.result.value);
      }
    }
    cdp.on(eventName, onMessage);
    void cdp.send('Target.sendMessageToTarget', {
      sessionId,
      message: JSON.stringify({
        id,
        method: 'Runtime.evaluate',
        params: { expression: `(${evaluate.toString()})()`, returnByValue: true },
      }),
    }).catch((error: unknown) => {
      cdp.off(eventName, onMessage);
      reject(error);
    });
  });
}

async function withBrowserAction(extension: ExtensionFixture, tab: Page, inspect: (evaluate: EvaluatePopup) => Promise<void>) {
  const browser = extension.context.browser();
  if (!browser) throw new Error('The extension context must have a Chromium browser.');
  const cdp = await browser.newBrowserCDPSession();
  try {
    await tab.bringToFront();
    const { targetInfos } = await cdp.send('Target.getTargets', {
      filter: [{ type: 'tab' }, { exclude: true }],
    });
    const target = targetInfos.find((item) => item.url === tab.url());
    if (!target) throw new Error(`Missing CDP tab target for ${tab.url()}`);

    const { targetInfos: initialPages } = await cdp.send('Target.getTargets', {
      filter: [{ type: 'page' }, { exclude: true }],
    });
    const existingPopupIds = new Set(
      initialPages.filter((page) => page.url === extension.popupUrl).map((page) => page.targetId),
    );

    await cdp.send('Extensions.triggerAction', { id: extension.id, targetId: target.targetId });
    // Chrome exposes the native popup through CDP without creating a Playwright Page.
    let popupId = '';
    await expect.poll(async () => {
      const { targetInfos: pages } = await cdp.send('Target.getTargets', {
        filter: [{ type: 'page' }, { exclude: true }],
      });
      popupId = pages.find((page) => page.url === extension.popupUrl && !existingPopupIds.has(page.targetId))?.targetId ?? '';
      return popupId;
    }).not.toBe('');

    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: popupId, flatten: false });
    try {
      await inspect(evaluateTarget(cdp, sessionId));
    } finally {
      await cdp.send('Target.closeTarget', { targetId: popupId }).catch((error: unknown) => {
        if (!(error instanceof Error) || !error.message.includes('No target with given id found')) {
          throw error;
        }
      });
      // Wait for Chromium to finish tearing down the native popup before returning so a
      // back-to-back triggerAction cannot toggle or attach to the closing target.
      await expect.poll(async () => {
        const { targetInfos: pages } = await cdp.send('Target.getTargets', {
          filter: [{ type: 'page' }, { exclude: true }],
        });
        return pages.some((page) => page.targetId === popupId);
      }).toBe(false);
    }
  } finally {
    await cdp.detach();
  }
}

function decodeQr(pixels: Uint8Array, width: number, height: number) {
  return jsQR(new Uint8ClampedArray(pixels), width, height)?.data;
}

function decodePng(bytes: Buffer) {
  const png = PNG.sync.read(bytes);
  expect([png.width, png.height]).toEqual([qrSize, qrSize]);
  return decodeQr(png.data, png.width, png.height);
}

async function canvasBytes(canvas: Locator) {
  const dataUrl = await canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL());
  return Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64');
}

async function downloadBytes(page: Page, format: 'PNG' | 'SVG') {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: format, exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(new RegExp(`^ftoolset-qr-\\d+\\.${format.toLowerCase()}$`));
  expect(await download.failure()).toBeNull();
  return readFile(await download.path());
}

test('renders and downloads decodable styled PNG and SVG from the built popup', async ({ extension }) => {
  const popup = await openPopup(extension);
  await popup.setViewportSize({ width: 400, height: 550 });
  await expect(popup.getByRole('heading', { name: 'QR code generator', exact: true })).toBeVisible();
  await expect(popup.getByText('Enter content to generate a QR code.', { exact: true })).toBeVisible();
  await expect.poll(() => popup.evaluate(() => document.body.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await expect.poll(() => extension.worker.evaluate(() => chrome.storage.local.get('lastToolId')))
    .toEqual({ lastToolId: 'qr-code' });
  await content(popup).fill(qrText);
  await expect(preview(popup)).toHaveJSProperty('width', qrSize);
  await expect(preview(popup)).toHaveJSProperty('height', qrSize);
  await expect.poll(async () => decodePng(await canvasBytes(preview(popup)))).toBe(qrText);

  await popup.getByText('Style and logo', { exact: true }).click();
  const correction = popup.getByRole('combobox', { name: 'Error correction', exact: true });
  await expect(correction).toHaveValue('M');
  await correction.selectOption('H');
  const dotStyle = popup.getByRole('combobox', { name: 'Dot style', exact: true });
  await expect(dotStyle).toHaveValue('square');
  await dotStyle.selectOption('rounded');
  await popup.getByLabel('Foreground', { exact: true }).fill('#14384e');
  await popup.getByLabel('Background', { exact: true }).fill('#fff4dc');
  await expect(correction).toHaveValue('H');
  await expect(dotStyle).toHaveValue('rounded');

  const png = await downloadBytes(popup, 'PNG');
  expect(decodePng(png)).toBe(qrText);
  expect(PNG.sync.read(png).data.subarray(0, 4)).toEqual(Buffer.from([255, 244, 220, 255]));

  const svg = await downloadBytes(popup, 'SVG');
  expect(svg.toString('utf8')).toContain('<svg');
  expect(svg.toString('utf8')).toContain('#14384e');
  const { data, info } = await sharp(svg).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  expect([info.width, info.height]).toEqual([qrSize, qrSize]);
  expect(decodeQr(data, info.width, info.height)).toBe(qrText);
});

test('Chrome action grants activeTab, prioritizes the latest queued text, and restores the tab URL', async ({ extension }) => {
  const tab = await extension.context.newPage();
  await tab.goto(fixtureUrl);
  const activeUrl = () => extension.worker.evaluate(async () => {
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
    return active?.url;
  });
  expect(await activeUrl()).toBeUndefined();

  const latest = '最新选中的文字';
  // Seed the same session slot used by the browser context menu. Consumption uses the real worker.
  await extension.worker.evaluate(async (text) => {
    await chrome.storage.session.set({ pendingToolLaunch: { toolId: 'qr-code', text: 'earlier context-menu text' } });
    await chrome.storage.session.set({ pendingToolLaunch: { toolId: 'qr-code', text } });
  }, latest);

  await withBrowserAction(extension, tab, async (evaluate) => {
    const getContent = () => evaluate(() => document.querySelector('textarea')?.value ?? null);
    await expect.poll(getContent).toBe(latest);
    await expect.poll(activeUrl).toBe(fixtureUrl);
    expect(await extension.worker.evaluate(() => chrome.storage.session.get('pendingToolLaunch'))).toEqual({});
    await evaluate(() => {
      const button = Array.from(document.querySelectorAll('button'))
        .find((item) => item.textContent?.trim() === 'Restore current URL');
      button?.click();
    });
    await expect.poll(getContent).toBe(fixtureUrl);
    await evaluate(() => {
      const button = Array.from(document.querySelectorAll('button'))
        .find((item) => item.textContent?.trim() === 'Clear');
      button?.click();
    });
    await expect.poll(getContent).toBe('');
  });

  await withBrowserAction(extension, tab, async (evaluate) => {
    await expect.poll(() => evaluate(() => document.querySelector('textarea')?.value ?? null)).toBe(fixtureUrl);
  });
});

test('Chrome action on a restricted tab leaves content empty and does not enable restore', async ({ extension }) => {
  const tab = await extension.context.newPage();
  await tab.goto('chrome://version/');
  await withBrowserAction(extension, tab, async (evaluate) => {
    await expect.poll(() => evaluate(() => {
      const restore = Array.from(document.querySelectorAll('button'))
        .find((item) => item.textContent?.trim() === 'Restore current URL');
      return {
        content: document.querySelector('textarea')?.value,
        restoreDisabled: restore?.disabled,
        empty: document.body.innerText.includes('Enter content to generate a QR code.'),
      };
    })).toEqual({ content: '', restoreDisabled: true, empty: true });
  });
});

test('shares the GitHub project from an unpacked build using Chromium’s clipboard', async ({ extension, headless }) => {
  test.skip(!headless, 'Headless Chromium isolates its clipboard from the operating system.');
  const popup = await openPopup(extension);
  await content(popup).fill(fixtureUrl);
  const share = popup.getByRole('button', { name: 'Share extension', exact: true });
  await expect(share).toBeEnabled();
  await expect(popup.getByRole('link', { name: 'Rate on Chrome Web Store', exact: true })).toHaveCount(0);

  await share.click();
  await expect(popup.getByText('Share link copied.', { exact: true })).toBeVisible();
  await expect(content(popup)).toHaveValue(fixtureUrl);

  // Grant read access after the click so the extension writes with its shipped permissions.
  await extension.context.grantPermissions(['clipboard-read']);
  expect(await popup.evaluate(async () =>
    await navigator.clipboard.readText() === 'https://github.com/fenghuashao/FToolset',
  )).toBe(true);
});

test('links to store reviews and shares the listing with a manual-copy fallback', async ({ extension }) => {
  const itemId = 'abcdefghijklmnopabcdefghijklmnop';
  const listingUrl = `https://chromewebstore.google.com/detail/${itemId}`;

  const popup = await extension.context.newPage();
  await popup.setViewportSize({ width: 400, height: 600 });
  await popup.addInitScript((id) => {
    const metadata = new Promise((resolve) => {
      window.addEventListener('resolve-store-metadata', () => resolve({
        id,
        installType: 'normal',
        updateUrl: 'https://clients2.google.com/service/update2/crx',
      }), { once: true });
    });
    Object.defineProperty(chrome.management, 'getSelf', { value: () => metadata });

    let firstWrite = true;
    Object.defineProperty(navigator.clipboard, 'writeText', {
      value: async (text: string) => {
        if (firstWrite) {
          firstWrite = false;
          throw new DOMException('Clipboard blocked for this attempt.', 'NotAllowedError');
        }
        document.documentElement.dataset.copiedShareLink = text;
      },
    });
  }, itemId);
  await popup.goto(extension.popupUrl);

  const share = popup.getByRole('button', { name: 'Share extension', exact: true });
  await expect(share).toBeDisabled();
  await popup.evaluate(() => { window.dispatchEvent(new Event('resolve-store-metadata')); });
  await expect(share).toBeEnabled();
  await content(popup).fill(qrText);
  await expect(preview(popup)).toBeVisible();

  const rate = popup.getByRole('link', { name: 'Rate on Chrome Web Store', exact: true });
  await expect(rate).toBeInViewport({ ratio: 1 });
  await expect(share).toBeInViewport({ ratio: 1 });
  await expect(rate).toHaveAttribute('href', `${listingUrl}/reviews`);
  await expect(rate).toHaveAttribute('target', '_blank');
  await expect(rate).toHaveAttribute('rel', /\bnoopener\b/);

  await share.click();
  await expect(popup.getByText('Copy the link below to share FToolset.', { exact: true })).toBeVisible();
  const manualCopy = popup.getByRole('textbox', { name: 'Extension share link', exact: true });
  await expect(manualCopy).toHaveValue(listingUrl);
  await expect(manualCopy).toHaveJSProperty('readOnly', true);
  await expect(manualCopy).toBeFocused();
  expect(await manualCopy.evaluate((input: HTMLInputElement) => [input.selectionStart, input.selectionEnd]))
    .toEqual([0, listingUrl.length]);

  await share.click();
  await expect(popup.getByText('Share link copied.', { exact: true })).toBeVisible();
  await expect(popup.locator('html')).toHaveAttribute('data-copied-share-link', listingUrl);
  await expect(manualCopy).toBeHidden();
});

test('uploads and removes a logo and sends decodable PNG bytes to the Clipboard API boundary', async ({ extension }) => {
  const popup = await extension.context.newPage();
  // Capture write() locally so the test does not touch the system clipboard.
  await popup.addInitScript(() => {
    Object.defineProperty(navigator.clipboard, 'write', {
      value: async ([item]: ClipboardItem[]) => {
        const blob = await item?.getType('image/png');
        if (!blob) throw new Error('Expected a PNG clipboard item.');
        const bitmap = new Uint8Array(await blob.arrayBuffer());
        document.documentElement.dataset.copiedPng = btoa(Array.from(bitmap, (byte) => String.fromCharCode(byte)).join(''));
      },
    });
  });
  await popup.goto(extension.popupUrl);
  await content(popup).fill(qrText);
  await popup.getByText('Style and logo', { exact: true }).click();

  const logo = new PNG({ width: 24, height: 24 });
  logo.data.fill(Buffer.from([238, 67, 87, 255]));
  await popup.getByLabel('Upload logo', { exact: true }).setInputFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: PNG.sync.write(logo),
  });
  const remove = popup.getByRole('button', { name: 'Remove logo', exact: true });
  await expect(remove).toBeVisible();
  await expect(popup.getByRole('combobox', { name: 'Error correction', exact: true })).toHaveValue('H');

  const svg = await downloadBytes(popup, 'SVG');
  expect(svg.toString('utf8')).toContain('<image');
  await popup.getByRole('button', { name: 'Copy PNG', exact: true }).click();
  await expect(popup.getByText('PNG copied to clipboard.', { exact: true })).toBeVisible();
  const clipboard = await popup.locator('html').getAttribute('data-copied-png');
  expect(clipboard).toBeTruthy();
  const png = Buffer.from(clipboard ?? '', 'base64');
  expect(decodePng(png)).toBe(qrText);
  expect(PNG.sync.read(png).data).toEqual(PNG.sync.read(await canvasBytes(preview(popup))).data);

  await remove.click();
  await expect(remove).toBeHidden();
  expect((await downloadBytes(popup, 'SVG')).toString('utf8')).not.toContain('<image');
});

test.describe('Chinese locale and dark mode', () => {
  test.use({ locale: 'zh-CN', colorScheme: 'dark' });

  test('shows translated controls and responds to the system color scheme', async ({ extension }) => {
    const popup = await openPopup(extension);
    await expect(popup.locator('html')).toHaveAttribute('lang', /^zh-/);
    await expect(popup.getByRole('textbox', { name: '内容', exact: true })).toBeVisible();
    await expect(popup.getByRole('button', { name: '搜索工具', exact: true })).toBeVisible();
    await expect(popup.getByRole('navigation', { name: '快捷切换栏', exact: true })).toBeVisible();
    const background = () => popup.locator('body').evaluate((body) => getComputedStyle(body).backgroundColor);
    const darkBackground = await background();
    await popup.emulateMedia({ colorScheme: 'light' });
    await expect.poll(background).not.toBe(darkBackground);
    await popup.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(background).toBe(darkBackground);
  });
});

test('preserves minimal permissions and strict offline CSP in production manifest', async () => {
  const manifest = JSON.parse(await readFile(join(extensionDir, 'manifest.json'), 'utf8'));
  expect(manifest.permissions).toEqual(['activeTab', 'storage', 'contextMenus']);
  expect(manifest.host_permissions).toBeUndefined();
  expect(manifest.content_security_policy?.extension_pages).toContain("connect-src 'none'");
});

test('shows pinned quick bar by default, supports corner search, and customizes pins in All tools view', async ({ extension }) => {
  const popup = await openPopup(extension);
  await popup.setViewportSize({ width: 400, height: 600 });

  // Quick bar is visible by default on one non-overflowing row with all 4 tools pinned.
  const quickNav = popup.getByRole('navigation', { name: 'Quick tool bar', exact: true });
  await expect(quickNav).toBeVisible();
  await expect(quickNav.getByRole('button', { name: 'QR', exact: true })).toBeVisible();
  await expect(quickNav.getByRole('button', { name: 'Link', exact: true })).toBeVisible();
  await expect(quickNav.getByRole('button', { name: 'Text', exact: true })).toBeVisible();
  await expect(quickNav.getByRole('button', { name: 'Color', exact: true })).toBeVisible();
  await expect.poll(() => popup.evaluate(() => document.body.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  // Top-right corner Search expands in-place on Row 1 without shifting header height.
  const header = popup.locator('header');
  const headerHeightBefore = await header.evaluate((element) => Math.round(element.getBoundingClientRect().height));
  await popup.getByRole('button', { name: 'Search tools', exact: true }).click();
  const searchInput = popup.getByRole('searchbox', { name: 'Search tools', exact: true });
  await expect(searchInput).toBeFocused();
  await expect(popup.locator('#tool-search-results')).toHaveCount(0);
  const headerHeightInline = await header.evaluate((element) => Math.round(element.getBoundingClientRect().height));
  expect(headerHeightInline).toBe(headerHeightBefore);

  // Escape closes inline search and restores focus to the top-right Search trigger.
  await searchInput.press('Escape');
  await expect(popup.getByRole('button', { name: 'Search tools', exact: true })).toBeFocused();

  // Typing renders floating results without changing header height, and Enter jumps to the top match.
  await popup.getByRole('button', { name: 'Search tools', exact: true }).click();
  await searchInput.fill('utm');
  await expect(popup.locator('#tool-search-results ul li')).toHaveCount(1);
  const headerHeightOverlay = await header.evaluate((element) => Math.round(element.getBoundingClientRect().height));
  expect(headerHeightOverlay).toBe(headerHeightBefore);
  await searchInput.press('Enter');
  await expect(popup.getByRole('heading', { name: 'Link cleaner', exact: true })).toBeVisible();
  await expect(popup.locator('#tool-search')).toHaveCount(0);

  // Clicking outside the header dismisses inline search.
  await popup.getByRole('button', { name: 'Search tools', exact: true }).click();
  await expect(searchInput).toBeFocused();
  await popup.locator('main h1').click();
  await expect(popup.locator('#tool-search')).toHaveCount(0);

  // Open dedicated All tools view from quick bar right corner, unpin Link, and reorder Text first.
  await quickNav.getByRole('button', { name: 'All tools', exact: true }).click();
  await expect(popup.getByRole('heading', { name: 'All tools', exact: true })).toBeVisible();
  const linkCard = popup.locator('main li', { hasText: 'Link cleaner' });
  await linkCard.getByRole('button', { name: 'Pinned', exact: true }).click();
  await expect(quickNav.getByRole('button', { name: 'Link', exact: true })).toHaveCount(0);

  await popup.getByRole('button', { name: 'Text Move earlier', exact: true }).click();
  const reopened = await openPopup(extension);
  const reopenedNav = reopened.getByRole('navigation', { name: 'Quick tool bar', exact: true });
  await expect(reopenedNav.locator('div button')).toHaveText(['Text', 'QR', 'Color']);

  // Hiding the quick bar persists, while inline Search keeps a compact All tools button in Row 1.
  await reopenedNav.getByRole('button', { name: 'All tools', exact: true }).click();
  await reopened.getByRole('checkbox', { name: 'Show quick bar', exact: true }).uncheck();
  await expect(reopened.getByRole('navigation', { name: 'Quick tool bar', exact: true })).toHaveCount(0);
  await reopened.getByRole('button', { name: 'Back', exact: true }).click();
  await reopened.getByRole('button', { name: 'Search tools', exact: true }).click();
  await reopened.locator('#tool-search').getByRole('button', { name: 'All tools', exact: true }).click();
  await expect(reopened.getByRole('heading', { name: 'All tools', exact: true })).toBeVisible();
});

test('decodes QR images offline, allows safe links only, and rejects non-QR images', async ({ extension }) => {
  const popup = await openPopup(extension);
  await popup.setViewportSize({ width: 400, height: 600 });

  // Generate a real HTTPS QR PNG and a javascript: QR PNG using the extension itself.
  await content(popup).fill(qrText);
  await expect.poll(async () => decodePng(await canvasBytes(preview(popup)))).toBe(qrText);
  const safeQrPng = await canvasBytes(preview(popup));

  await content(popup).fill('javascript:alert(1)');
  await expect.poll(async () => decodePng(await canvasBytes(preview(popup)))).toBe('javascript:alert(1)');
  const unsafeQrPng = await canvasBytes(preview(popup));

  await popup.getByRole('button', { name: 'Decode', exact: true }).click();
  const fileInput = popup.getByLabel('Choose image', { exact: true });

  // Safe https:// QR shows Open link and can switch back to Generate.
  await fileInput.setInputFiles({ name: 'safe.png', mimeType: 'image/png', buffer: safeQrPng });
  const decodedOutput = popup.getByRole('textbox', { name: 'Decoded content', exact: true });
  await expect(decodedOutput).toHaveValue(qrText);
  const openLink = popup.getByRole('link', { name: 'Open link', exact: true });
  await expect(openLink).toHaveAttribute('href', qrText);
  await expect(openLink).toHaveAttribute('rel', /\bnoopener\b/);

  // Unsafe javascript: QR decodes as text but never renders an Open link anchor.
  await fileInput.setInputFiles({ name: 'unsafe.png', mimeType: 'image/png', buffer: unsafeQrPng });
  await expect(decodedOutput).toHaveValue('javascript:alert(1)');
  await expect(popup.getByRole('link', { name: 'Open link', exact: true })).toHaveCount(0);

  // Non-QR image shows clear not-found error.
  const blank = new PNG({ width: 64, height: 64 });
  blank.data.fill(Buffer.from([255, 255, 255, 255]));
  await fileInput.setInputFiles({ name: 'blank.png', mimeType: 'image/png', buffer: PNG.sync.write(blank) });
  await expect(popup.getByRole('alert')).toHaveText('No QR code found in this image.');

  // Decode safe again and hand back to Generate mode.
  await fileInput.setInputFiles({ name: 'safe.png', mimeType: 'image/png', buffer: safeQrPng });
  await expect(decodedOutput).toHaveValue(qrText);
  await popup.getByRole('button', { name: 'Generate QR', exact: true }).click();
  await expect(content(popup)).toHaveValue(qrText);
});

test('cleans tracking parameters, supports restoring a parameter, and hands off to QR generator', async ({ extension }) => {
  const popup = await openPopup(extension);
  await popup.setViewportSize({ width: 400, height: 600 });

  await popup.getByRole('navigation', { name: 'Quick tool bar', exact: true })
    .getByRole('button', { name: 'Link', exact: true })
    .click();
  await expect(popup.getByRole('heading', { name: 'Link cleaner', exact: true })).toBeVisible();

  const linkField = popup.getByRole('textbox', { name: 'Link', exact: true });
  await linkField.fill('https://example.com/post?id=42&utm_source=newsletter&fbclid=abc');

  const cleanedOutput = popup.getByRole('textbox', { name: 'Cleaned link', exact: true });
  await expect(cleanedOutput).toHaveValue('https://example.com/post?id=42');

  // Restore utm_source by clicking its chip, then toggle it back off.
  await popup.getByRole('button', { name: 'utm_source', exact: true }).click();
  await expect(cleanedOutput).toHaveValue('https://example.com/post?id=42&utm_source=newsletter');
  await popup.getByRole('button', { name: 'utm_source', exact: true }).click();
  await expect(cleanedOutput).toHaveValue('https://example.com/post?id=42');

  // Hand off cleaned URL to QR generator.
  await popup.getByRole('button', { name: 'Make QR', exact: true }).click();
  await expect(popup.getByRole('heading', { name: 'QR code generator', exact: true })).toBeVisible();
  await expect(content(popup)).toHaveValue('https://example.com/post?id=42');
});

test('routes queued text-cleaner launches directly and avoids prefilling active tab URL on manual switch', async ({ extension }) => {
  const tab = await extension.context.newPage();
  await tab.goto(fixtureUrl);

  // Manual switch to Text cleaner must NOT inject the active tab URL.
  await extension.worker.evaluate(async () => {
    await chrome.storage.local.set({ lastToolId: 'text-cleaner' });
  });
  await withBrowserAction(extension, tab, async (evaluate) => {
    await expect.poll(() => evaluate(() => ({
      heading: document.querySelector('h1')?.textContent,
      text: document.querySelector('textarea')?.value,
    }))).toEqual({ heading: 'Text cleaner', text: '' });
  });

  // Queued context-menu launch routes directly to Text cleaner with selected text.
  const messy = '  Hello   world  \n\n\nSecond   line  ';
  await extension.worker.evaluate(async (text) => {
    await chrome.storage.session.set({ pendingToolLaunch: { toolId: 'text-cleaner', text } });
  }, messy);

  const popup = await openPopup(extension);
  await popup.setViewportSize({ width: 400, height: 600 });
  await expect(popup.getByRole('heading', { name: 'Text cleaner', exact: true })).toBeVisible();
  const textArea = popup.getByRole('textbox', { name: 'Text', exact: true });
  await expect(textArea).toHaveValue(messy);

  await popup.getByRole('button', { name: 'Remove blank lines', exact: true }).click();
  await expect(textArea).toHaveValue('  Hello   world  \nSecond   line  ');
  await popup.getByRole('button', { name: 'Clean spaces', exact: true }).click();
  await expect(textArea).toHaveValue('Hello world\nSecond line');

  await popup.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(textArea).toHaveValue('  Hello   world  \nSecond   line  ');
  await popup.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(textArea).toHaveValue(messy);

  // Manual typing from an empty field should snapshot the full pre-transform text, not the first character.
  await extension.worker.evaluate(async () => {
    await chrome.storage.local.set({ lastToolId: 'text-cleaner' });
  });
  const manualPopup = await openPopup(extension);
  const manualArea = manualPopup.getByRole('textbox', { name: 'Text', exact: true });
  const resetBtn = manualPopup.getByRole('button', { name: 'Reset', exact: true });
  await manualArea.pressSequentially('foo   bar');
  await expect(resetBtn).toBeDisabled();
  await manualPopup.getByRole('button', { name: 'Clean spaces', exact: true }).click();
  await expect(manualArea).toHaveValue('foo bar');
  await manualPopup.getByText('English letter case', { exact: true }).click();
  await manualPopup.getByRole('button', { name: 'UPPERCASE', exact: true }).click();
  await expect(manualArea).toHaveValue('FOO BAR');
  await expect(resetBtn).toBeEnabled();
  await resetBtn.click();
  await expect(manualArea).toHaveValue('foo   bar');
});

test('expands into a full tab with draft handoff, clean wide layout, and session cleanup', async ({ extension }) => {
  const popup = await openPopup(extension);
  await popup.setViewportSize({ width: 400, height: 600 });

  await popup.getByRole('navigation', { name: 'Quick tool bar', exact: true })
    .getByRole('button', { name: 'Text', exact: true })
    .click();
  await expect(popup.getByRole('heading', { name: 'Text cleaner', exact: true })).toBeVisible();

  const draft = 'Line one   with spaces\n\nLine two';
  await popup.getByRole('textbox', { name: 'Text', exact: true }).fill(draft);

  const [fullTab] = await Promise.all([
    extension.context.waitForEvent('page'),
    popup.getByRole('button', { name: 'Open in full tab', exact: true }).click(),
  ]);
  await fullTab.setViewportSize({ width: 1024, height: 720 });
  await fullTab.waitForLoadState('domcontentloaded');

  expect(fullTab.url()).toBe(`${extension.popupUrl}?view=tab`);
  await expect(fullTab.locator('html')).toHaveAttribute('data-view', 'tab');
  await expect(fullTab.getByRole('heading', { name: 'Text cleaner', exact: true })).toBeVisible();
  await expect(fullTab.getByRole('textbox', { name: 'Text', exact: true })).toHaveValue(draft);
  await expect(fullTab.getByRole('button', { name: 'Open in full tab', exact: true })).toHaveCount(0);
  await expect.poll(() => fullTab.evaluate(() => document.body.clientWidth)).toBeGreaterThan(600);
  expect(await extension.worker.evaluate(() => chrome.storage.session.get('pendingTabHandoff'))).toEqual({});
});

test('picks screen colors via EyeDropper, handles Esc cancel, checks WCAG contrast, and persists palettes locally', async ({ extension }) => {
  const popup = await extension.context.newPage();
  await popup.setViewportSize({ width: 400, height: 600 });
  await popup.addInitScript(() => {
    let pickAttempt = 0;
    class MockEyeDropper {
      async open() {
        pickAttempt += 1;
        if (pickAttempt === 1) return { sRGBHex: '#10b981' };
        throw new DOMException('The user canceled the selection.', 'AbortError');
      }
    }
    Object.defineProperty(window, 'EyeDropper', { value: MockEyeDropper, configurable: true });
    Object.defineProperty(navigator.clipboard, 'writeText', {
      value: async (text: string) => {
        document.documentElement.dataset.copiedColor = text;
      },
      configurable: true,
    });
  });
  await popup.goto(extension.popupUrl);

  await popup.getByRole('navigation', { name: 'Quick tool bar', exact: true })
    .getByRole('button', { name: 'Color', exact: true })
    .click();
  await expect(popup.getByRole('heading', { name: 'Color picker', exact: true })).toBeVisible();
  await expect.poll(() => popup.evaluate(() => document.body.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  // First screen pick succeeds, updates formats, copies HEX, and records Recent.
  await popup.getByRole('button', { name: 'Pick from screen', exact: true }).click();
  const colorInput = popup.getByRole('textbox', { name: 'Color value', exact: true });
  await expect(colorInput).toHaveValue('#10B981');
  await expect(popup.locator('html')).toHaveAttribute('data-copied-color', '#10B981');
  await expect(popup.getByText('rgb(16, 185, 129)', { exact: true })).toBeVisible();
  await expect(popup.getByText('hsl(160, 84%, 39%)', { exact: true })).toBeVisible();

  // Second screen pick rejects with AbortError (Esc cancel): preserves #10B981 with no error alert.
  await popup.getByRole('button', { name: 'Pick from screen', exact: true }).click();
  await expect(colorInput).toHaveValue('#10B981');
  await expect(popup.getByRole('alert')).toHaveCount(0);

  // Star #10B981 into Favorites and copy RGB format.
  await popup.getByRole('button', { name: 'Save to favorites', exact: true }).click();
  await popup.getByRole('button', { name: 'Copy RGB', exact: true }).click();
  await expect(popup.locator('html')).toHaveAttribute('data-copied-color', 'rgb(16, 185, 129)');

  // Manual input accepts shorthand hex and shows WCAG 21.00:1 contrast for black.
  await colorInput.fill('#000');
  await colorInput.press('Enter');
  await expect(colorInput).toHaveValue('#000000');
  await expect(popup.getByText('21.00:1', { exact: true })).toBeVisible();

  // Reopening popup restores most recent color and local Favorites/Recent lists.
  const reopened = await openPopup(extension);
  await reopened.setViewportSize({ width: 400, height: 600 });
  await expect(reopened.getByRole('heading', { name: 'Color picker', exact: true })).toBeVisible();
  await expect(reopened.getByRole('textbox', { name: 'Color value', exact: true })).toHaveValue('#000000');
  await expect(reopened.getByRole('button', { name: '#10B981', exact: true }).first()).toBeVisible();

  // Expanding to full tab hands off the currently active color cleanly.
  const [fullTab] = await Promise.all([
    extension.context.waitForEvent('page'),
    reopened.getByRole('button', { name: 'Open in full tab', exact: true }).click(),
  ]);
  await fullTab.setViewportSize({ width: 1024, height: 720 });
  await expect(fullTab.getByRole('heading', { name: 'Color picker', exact: true })).toBeVisible();
  await expect(fullTab.getByRole('textbox', { name: 'Color value', exact: true })).toHaveValue('#000000');
});
