const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const runtime = path.join(root, 'dist/client/game');
assert.ok(fs.existsSync(path.join(root, 'dist/server/index.js')), 'Existing Worker required');
const source = fs.readFileSync(path.join(root, 'public/game/game.js'), 'utf8').replace(/\.png/g, '.webp');
for (const match of source.matchAll(/["'`](assets\/[^"'`$\n]+\.webp)["'`]/g)) {
  assert.ok(fs.existsSync(path.join(runtime, match[1])), `Missing runtime asset: ${match[1]}`);
}
fs.writeFileSync(path.join(runtime, 'game.js'), source);
for (const file of ['index.html', 'styles.css']) fs.copyFileSync(path.join(root, 'public/game', file), path.join(runtime, file));
assert.ok(fs.readFileSync(path.join(runtime, 'index.html'), 'utf8').includes('hall-release-124'));
const stage = path.join(root, '.sites-artifacts/release124-balance-package');
const destination = path.join(stage, 'dist');
const helper = 'C:/Users/Henri/.codex/plugins/cache/openai-curated-remote/sites/0.1.75/skills/sites-hosting/scripts/prepare-site-build.cjs';
assert.equal(execFileSync(process.execPath, [helper, root, destination], { encoding: 'utf8' }).trim(), 'worker');
fs.mkdirSync(path.join(destination, '.openai'), { recursive: true });
fs.copyFileSync(path.join(root, '.openai/hosting.json'), path.join(destination, '.openai/hosting.json'));
const archive = path.join(root, '.sites-artifacts/release-124-runtime.tar.gz');
execFileSync('C:/Windows/System32/tar.exe', ['-C', stage, '-czf', archive, 'dist']);
const entries = execFileSync('C:/Windows/System32/tar.exe', ['-tzf', archive], { encoding: 'utf8' });
assert.ok(entries.includes('dist/.openai/hosting.json'));
assert.ok(entries.includes('dist/server/index.js'));
assert.ok(fs.statSync(archive).size < 500 * 1024 * 1024, 'Archive exceeds upload limit');
console.log(JSON.stringify({ archive, bytes: fs.statSync(archive).size, assetReferences: 'verified', cache: 124 }));
