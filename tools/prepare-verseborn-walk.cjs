const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sharp = require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const preview = path.join(root, 'previews/sw-walk');
const generated = 'C:/Users/Henri/.codex/generated_images/01a02711-5de6-7db1-b961-2cab4019c81f';
const asset = path.resolve(__dirname, '../public/game/assets/hall/verseborn-walk-v2.webp');
const cellSize = 128, ground = 116, bodyHeight = 104;
const sheets = [
  { direction: 'down', file: 'exec-093fc664-9dbe-4593-b26a-42acf54529a1.png', columns: 4, rows: 2 },
  { direction: 'up', file: 'exec-278e3ffa-e2ce-4df9-9891-3c4de88bb723.png', columns: 4, rows: 2 },
  { direction: 'left', file: 'exec-fd5ef9f4-6df6-45e5-a4e5-1c1d65479e70.png', columns: 4, rows: 2 },
  { direction: 'southwest', file: 'verseborn-sw-8.webp', prepared: true },
  { direction: 'northwest', file: 'exec-82f6a1ae-a096-4423-b9dd-929a34a6bce3.png', columns: 4, rows: 2 }
];
const idleFile = path.join(generated, 'exec-bf4e3973-57f0-4661-9fb2-688dd83ca9b1.png');
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

async function split(file, columns, rows) {
  const meta = await sharp(file).metadata(), cells = [];
  for (let i = 0; i < columns * rows; i++) {
    const left = Math.floor(i % columns * meta.width / columns);
    const top = Math.floor(Math.floor(i / columns) * meta.height / rows);
    const width = Math.floor((i % columns + 1) * meta.width / columns) - left;
    const height = Math.floor((Math.floor(i / columns) + 1) * meta.height / rows) - top;
    const png = await sharp(file).extract({ left, top, width, height }).png().toBuffer();
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let x0 = width, y0 = height, x1 = -1, y1 = -1;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] <= 16) continue;
      assert.ok(x && y && x < width - 1 && y < height - 1, `${typeof file === 'string' ? path.basename(file) : 'cropped idle'} frame ${i + 1} clipped`);
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    assert.ok(x1 >= x0, 'Empty source cell');
    let total = 0, headX = 0;
    for (let y = y0; y < y0 + (y1 - y0) * .22; y++) for (let x = x0; x <= x1; x++) {
      const alpha = data[(y * info.width + x) * 4 + 3];
      if (alpha > 128) { total += alpha; headX += x * alpha; }
    }
    cells.push({ png, box: { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }, headX: headX / total });
  }
  return cells;
}

async function padded(source, scale, originX, baseline) {
  const width = Math.round(source.box.width * scale), height = Math.round(source.box.height * scale);
  const left = Math.round(cellSize / 2 + (source.box.left - originX) * scale);
  const top = Math.round(ground + (source.box.top - baseline) * scale);
  assert.ok(left >= 2 && top >= 2 && left + width <= cellSize - 2 && top + height <= cellSize - 2, 'Insufficient cell padding');
  const png = await sharp(source.png).extract(source.box).resize(width, height).png().toBuffer();
  return sharp({ create: { width: cellSize, height: cellSize, channels: 4, background: '#00000000' } })
    .composite([{ input: png, left, top }]).png().toBuffer();
}

(async () => {
  const idle = await split(idleFile, 2, 2), rows = [], manifest = [];
  // The generated nine-pose study has nonuniform row gutters; select only its intact idle.
  const northwestIdle = await sharp(path.join(generated, 'exec-47183bb6-b104-4bb3-81cd-7a603187a100.png'))
    .extract({ left: 854, top: 790, width: 428, height: 437 }).png().toBuffer();
  idle.push((await split(northwestIdle, 1, 1))[0]);
  for (const [row, sheet] of sheets.entries()) {
    const source = path.join(sheet.prepared ? preview : generated, sheet.file);
    const cells = await split(source, sheet.prepared ? 8 : sheet.columns, sheet.prepared ? 1 : sheet.rows);
    const phaseOffset = ['down', 'up'].includes(sheet.direction) ? 4 : 0;
    const walk = Array.from({ length: 8 }, (_, i) => cells[(i + phaseOffset) % 8]);
    const scale = sheet.prepared ? 1 : bodyHeight / median(walk.map(c => c.box.height));
    // A shared scale and head/ground anchor preserve the gait instead of recentering every coat pose.
    const originX = median(walk.map(c => c.headX)), baseline = median(walk.map(c => c.box.top + c.box.height - 1));
    const frames = [];
    for (const c of walk) frames.push(sheet.prepared ? c.png : await padded(c, scale, originX, baseline));
    const still = idle[row];
    frames.push(await padded(still, bodyHeight / still.box.height, still.headX, still.box.top + still.box.height - 1));
    rows.push(frames);
    manifest.push({ row, direction: sheet.direction, source: sheet.file, phaseOffset, scale, originX, baseline, boxes: walk.map(c => c.box) });
    const gifFrames = [];
    for (const frame of frames.slice(0, 8)) {
      const large = await sharp(frame).resize(256, 256, { kernel: 'nearest' }).png().toBuffer();
      gifFrames.push(await sharp({ create: { width: 300, height: 280, channels: 4, background: '#19171e' } })
        .composite([{ input: large, left: 22, top: 8 }]).raw().toBuffer());
    }
    await sharp(Buffer.concat(gifFrames), { raw: { width: 300, height: 280 * 8, channels: 4, pageHeight: 280 } })
      .gif({ loop: 0, delay: Array(8).fill(140), colours: 256, dither: .3 }).toFile(path.join(preview, `walk-${sheet.direction}.gif`));
  }
  const composites = rows.flatMap((frames, row) => frames.map((input, column) => ({ input, left: column * cellSize, top: row * cellSize })));
  const atlas = await sharp({ create: { width: cellSize * 9, height: cellSize * rows.length, channels: 4, background: '#00000000' } })
    .composite(composites).png().toBuffer();
  await sharp(atlas).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(asset);
  await sharp(atlas).flatten({ background: '#19171e' }).png().toFile(path.join(preview, 'walk-all-directions.png'));
  fs.writeFileSync(path.join(preview, 'walk-atlas.json'), JSON.stringify({ frameSize: cellSize, walkFrames: 8, idleFrame: 8, framesPerSecondAtSpeed65: 65 / 9, rightMirrorsLeft: true, rows: manifest }, null, 2));
  for (const [row, frames] of rows.entries()) {
    const signatures = new Set();
    for (const [column, frame] of frames.entries()) {
      const pixels = await sharp(frame).ensureAlpha().raw().toBuffer();
      for (let y = 0; y < cellSize; y++) for (let x = 0; x < cellSize; x++) {
        if (!x || !y || x === cellSize - 1 || y === cellSize - 1) assert.equal(pixels[(y * cellSize + x) * 4 + 3], 0, `Gutter ${row}:${column}`);
      }
      if (column < 8) signatures.add(crypto.createHash('sha256').update(pixels).digest('hex'));
    }
    assert.equal(signatures.size, 8, 'Duplicate animation frames');
  }
  const original = await sharp(atlas).ensureAlpha().raw().toBuffer();
  const encoded = await sharp(asset).ensureAlpha().raw().toBuffer();
  for (let i = 3; i < original.length; i += 4) assert.equal(encoded[i], original[i], 'Compression changed transparency');
  console.log(`Prepared 5 views, 8 unique walk frames and 1 idle each, transparent padding, fixed scale. WebP with lossless alpha: ${fs.statSync(asset).size} bytes.`);
  console.log('Pixel checks do not verify anatomy; inspect the animated previews and game.');
})().catch(error => { console.error(error); process.exitCode = 1; });
