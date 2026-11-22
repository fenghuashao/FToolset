import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = fileURLToPath(new URL('../assets/ftoolset.svg', import.meta.url));
const destination = new URL('../public/icon/', import.meta.url);
await mkdir(destination, { recursive: true });

await Promise.all([16, 32, 48, 128].map(async (size) => {
  const output = fileURLToPath(new URL(`${size}.png`, destination));
  const raster = sharp(source);
  if (size === 128) {
    // The Web Store uses 96px of artwork with 16px of transparent padding on each side.
    raster.extract({ left: 2, top: 2, width: 124, height: 124 }).resize(96, 96).extend({
      top: 16,
      bottom: 16,
      left: 16,
      right: 16,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
  } else {
    raster.resize(size, size);
  }
  await raster.png().toFile(output);
  const { format, width, height } = await sharp(output).metadata();
  assert.deepEqual({ format, width, height }, { format: 'png', width: size, height: size });
  console.log(`icon/${size}.png  ${width} × ${height}`);
}));
