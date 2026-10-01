const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const previous = path.join(root, '.sites-artifacts/release101-fixed-menu-context');
const target = path.join(root, '.sites-artifacts/gear-art-preview');
if (!fs.existsSync(target)) fs.cpSync(previous, target, { recursive: true });
const game = path.join(target, 'dist/client/game');
fs.writeFileSync(path.join(game, 'game.js'), fs.readFileSync(path.join(root, 'public/game/game.js'), 'utf8').replace(/\.png/g, '.webp'));
fs.copyFileSync(path.join(root, 'public/game/styles.css'), path.join(game, 'styles.css'));
fs.copyFileSync(path.join(root, 'public/game/index.html'), path.join(game, 'index.html'));
fs.cpSync(path.join(root, 'public/game/assets/ui/gear-visuals'), path.join(game, 'assets/ui/gear-visuals'), { recursive: true });
for (const slot of ['weapons', 'armour', 'rings', 'necklaces', 'helmets']) {
  const obsolete = path.join(game, `assets/ui/gear-${slot}-catalog.webp`);
  if (fs.existsSync(obsolete)) fs.unlinkSync(obsolete);
}
if (process.argv.includes('--prepare-only')) process.exit(0);
const archive = path.join(root, '.sites-artifacts/gear-art-preview.tar.gz');
execFileSync('tar.exe', ['-czf', archive, '-C', target, 'dist'], { windowsHide: true });
const bytes = fs.statSync(archive).size;
const prior = fs.statSync(path.join(root, '.sites-artifacts/release-101-fixed-menu-context.tar.gz')).size;
if (bytes >= 256 * 1024 * 1024) throw new Error('Package cap exceeded');
console.log(JSON.stringify({ bytes, mib: bytes / 1024 / 1024, packageDeltaBytes: bytes - prior }));
