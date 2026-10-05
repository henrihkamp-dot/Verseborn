const fs = require('node:fs');
const path = require('node:path');
const sharp = require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '..');
(async () => {
  const source = path.join(root, 'public/game/assets/sprites/enemies-animation/ash-wyrm.png');
  const { width, height } = await sharp(source).metadata();
  const frames = [];
  for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) {
    const left = Math.floor(col * width / 5), top = Math.floor(row * height / 5);
    const w = Math.floor((col + 1) * width / 5) - left;
    const h = Math.floor((row + 1) * height / 5) - top;
    // Keep the existing grid anchors; do not recenter each pose independently.
    const input = await sharp(source).extract({ left, top, width: w, height: h })
      .resize(250, 250, { kernel: 'nearest', fit: 'fill' }).png().toBuffer();
    frames.push({ input, left: col * 352 + 51, top: row * 304 + 36 });
  }
  const file = 'ash-wyrm-classic.webp';
  const output = path.join(root, 'public/game/assets/sprites/enemies-battle', file);
  await sharp({ create: { width: 1760, height: 1520, channels: 4, background: '#00000000' } })
    .composite(frames).webp({ lossless: true }).toFile(output);
  fs.copyFileSync(output, path.join(root, 'dist/client/game/assets/sprites/enemies-battle', file));
  console.log('Classic Ash Wyrm sheet prepared, original frame anchors retained');
})().catch(error => { console.error(error); process.exitCode = 1; });
