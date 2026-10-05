const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const release = process.argv[2] || '124';
assert.match(release, /^\d+$/);
const runtime = path.join(root, 'dist/client/game');
fs.copyFileSync(path.join(root, 'public/game/assets/sprites/enemies-battle/manifest.json'), path.join(runtime, 'assets/sprites/enemies-battle/manifest.json'));
execFileSync(process.execPath, [path.join(root, 'tools/build_classic_ash_wyrm.cjs')]);
// UI sheets are displayed at 34-52px per cell; ship only that resolution.
execFileSync(process.execPath, ['-e', `
const sharp = require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const path = require('node:path');
(async () => {
  for (const name of ['item-icons', 'loot-icons']) {
    await sharp(path.join(process.argv[1], 'public/game/assets/ui', name + '.png'))
      .resize(320, 64, { fit: 'fill', kernel: 'nearest' }).webp({ lossless: true })
      .toFile(path.join(process.argv[1], 'dist/client/game/assets/ui', name + '.webp'));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
`, root]);
assert.ok(fs.existsSync(path.join(root, 'dist/server/index.js')), 'Existing Worker required');
const source = fs.readFileSync(path.join(root, 'public/game/game.js'), 'utf8').replace(/\.png/g, '.webp');
for (const match of source.matchAll(/["'`](assets\/[^"'`$\n]+\.webp)["'`]/g)) {
  assert.ok(fs.existsSync(path.join(runtime, match[1])), `Missing runtime asset: ${match[1]}`);
}
fs.writeFileSync(path.join(runtime, 'game.js'), source);
for (const file of ['index.html', 'styles.css']) fs.copyFileSync(path.join(root, 'public/game', file), path.join(runtime, file));
const css = fs.readFileSync(path.join(root, 'public/game/styles.css'), 'utf8')
  .replace(/(url\(["']?assets\/[^)"']+)\.png/g, '$1.webp');
for (const match of css.matchAll(/url\(["']?(assets\/[^)"']+)["']?\)/g)) {
  assert.ok(fs.existsSync(path.join(runtime, match[1])), `Missing runtime CSS asset: ${match[1]}`);
}
fs.writeFileSync(path.join(runtime, 'styles.css'), css);
assert.ok(fs.readFileSync(path.join(runtime, 'index.html'), 'utf8').includes(`hall-release-${release}`));
const stage = path.join(root, `.sites-artifacts/release${release}-balance-package`);
const destination = path.join(stage, 'dist');
const helper = 'C:/Users/Henri/.codex/plugins/cache/openai-curated-remote/sites/0.1.75/skills/sites-hosting/scripts/prepare-site-build.cjs';
assert.equal(execFileSync(process.execPath, [helper, root, destination], { encoding: 'utf8' }).trim(), 'worker');
fs.mkdirSync(path.join(destination, '.openai'), { recursive: true });
fs.copyFileSync(path.join(root, '.openai/hosting.json'), path.join(destination, '.openai/hosting.json'));
const archive = path.join(root, `.sites-artifacts/release-${release}-runtime.tar.gz`);
execFileSync('C:/Windows/System32/tar.exe', ['-C', stage, '-czf', archive, 'dist']);
const entries = execFileSync('C:/Windows/System32/tar.exe', ['-tzf', archive], { encoding: 'utf8' });
assert.ok(entries.includes('dist/.openai/hosting.json'));
assert.ok(entries.includes('dist/server/index.js'));
assert.ok(fs.statSync(archive).size < 500 * 1024 * 1024, 'Archive exceeds upload limit');
console.log(JSON.stringify({ archive, bytes: fs.statSync(archive).size, assetReferences: 'verified', cache: Number(release) }));
