const fs = require('node:fs');
const path = require('node:path');
const sharp = require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');

(async () => {
  const input = process.argv[2];
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cells = [];
  for (let i = 0; i < 16; i++) {
    const left = Math.floor(i % 4 * info.width / 4), top = Math.floor(Math.floor(i / 4) * info.height / 4);
    const right = Math.floor((i % 4 + 1) * info.width / 4), bottom = Math.floor((Math.floor(i / 4) + 1) * info.height / 4);
    let x0 = right, y0 = bottom, x1 = left, y1 = top;
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 16) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
    if (x0 <= left + 2 || x1 >= right - 3 || y0 <= top + 2 || y1 >= bottom - 3) throw Error('Frame touches cell boundary: ' + i);
    cells.push({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 });
  }
  // One scale for the whole sheet; only translation aligns each foot baseline.
  const scale = 82 / Math.max(...cells.map(c => c.height));
  const layers = [];
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i], width = Math.round(cell.width * scale), height = Math.round(cell.height * scale);
    const buffer = await sharp(input).extract(cell).resize(width, height, { kernel: 'nearest' }).png().toBuffer();
    layers.push({ input: buffer, left: i % 4 * 100 + Math.round((100 - width) / 2), top: Math.floor(i / 4) * 100 + 94 - height });
  }
  const output = path.resolve('public/game/assets/hall/verseborn-lute-v1.webp');
  await sharp({ create: { width: 400, height: 400, channels: 4, background: '#00000000' } }).composite(layers).webp({ lossless: true, effort: 6 }).toFile(output);
  console.log('Prepared 16 padded, baseline-aligned frames: ' + fs.statSync(output).size + ' bytes');
})().catch(error => { console.error(error); process.exitCode = 1; });
