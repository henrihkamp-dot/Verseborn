const path = require('node:path');
const sharp = require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
(async () => {
  const input = process.argv[2];
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rows = new Uint32Array(info.height), columns = new Uint32Array(info.width);
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 16) { rows[y]++; columns[x]++; }
  function cuts(histogram, count) {
    const boundaries = [0];
    for (let i = 1; i < count; i++) {
      const ideal = Math.round(i * histogram.length / count), radius = Math.floor(histogram.length / count * .15);
      const gaps = [];
      for (let p = ideal - radius; p <= ideal + radius; p++) if (!histogram[p]) gaps.push(p);
      if (!gaps.length) throw Error('No transparent gutter at boundary ' + i);
      boundaries.push(gaps.sort((a, b) => Math.abs(a - ideal) - Math.abs(b - ideal))[0]);
    }
    return [...boundaries, histogram.length];
  }
  const xs = cuts(columns, 8), ys = cuts(rows, 4);
  const cells = [];
  for (let i = 0; i < 32; i++) {
    const l = xs[i % 8], t = ys[Math.floor(i / 8)];
    const r = xs[i % 8 + 1], b = ys[Math.floor(i / 8) + 1];
    let x0 = r, y0 = b, x1 = l, y1 = t;
    for (let y = t; y < b; y++) for (let x = l; x < r; x++) if (data[(y * info.width + x) * 4 + 3] > 16) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    if (x0 === 0 || x1 === info.width - 1 || y0 === 0 || y1 === info.height - 1 || x0 > x1) throw Error('Clipped or empty frame: ' + i);
    cells.push({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 });
  }
  const scale = 82 / Math.max(...cells.map(c => c.height)), layers = [];
  for (let i = 0; i < 32; i++) {
    const c = cells[i], width = Math.round(c.width * scale), height = Math.round(c.height * scale);
    layers.push({ input: await sharp(input).extract(c).resize(width, height, { kernel: 'nearest' }).png().toBuffer(), left: i % 8 * 100 + Math.round((100 - width) / 2), top: Math.floor(i / 8) * 100 + 94 - height });
  }
  const output = path.resolve('public/game/assets/hall/verseborn-diagonal-v1.webp');
  await sharp({ create: { width: 800, height: 400, channels: 4, background: '#00000000' } }).composite(layers).webp({ lossless: true, effort: 6 }).toFile(output);
  console.log('Prepared 32 padded diagonal frames: ' + require('node:fs').statSync(output).size + ' bytes');
})().catch(e => { console.error(e); process.exitCode = 1; });
