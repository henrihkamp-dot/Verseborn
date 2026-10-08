const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const previous = path.join(root, '.sites-artifacts/release111-potency');
const target = path.join(root, '.sites-artifacts/release112-endgame');
if (!fs.existsSync(target)) fs.cpSync(previous, target, { recursive: true });
const game = path.join(target, 'dist/client/game');
fs.writeFileSync(path.join(game, 'game.js'), fs.readFileSync(path.join(root, 'public/game/game.js'), 'utf8').replace(/\.png/g, '.webp'));
for (const file of ['index.html', 'styles.css']) fs.copyFileSync(path.join(root, 'public/game', file), path.join(game, file));
const sprites = 'assets/sprites/enemies-battle';
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/game', sprites, 'manifest.json')));
fs.copyFileSync(path.join(root, 'public/game', sprites, 'manifest.json'), path.join(game, sprites, 'manifest.json'));
for (const entry of Object.values(manifest)) {
  fs.copyFileSync(path.join(root, 'public/game', sprites, entry.file), path.join(game, sprites, entry.file));
}
for (const file of ['lyrsa.webp', 'nyx.webp', 'jory.webp']) fs.rmSync(path.join(game, sprites, file), { force: true });
fs.cpSync(path.join(root, 'public/game/assets/ui/boss-mechanics'), path.join(game, 'assets/ui/boss-mechanics'), { recursive: true });
fs.cpSync(path.join(root, 'public/game/assets/effects/endgame-bosses'), path.join(game, 'assets/effects/endgame-bosses'), { recursive: true });
const code = fs.readFileSync(path.join(game, 'game.js'), 'utf8');
for (const match of code.matchAll(/["'`](assets\/[^"'`$\n]+\.webp)["'`]/g)) {
  if (!fs.existsSync(path.join(game, match[1]))) throw Error('Missing runtime asset: ' + match[1]);
}
console.log(JSON.stringify({ target, enemies: Object.keys(manifest).length, integrity: 'passed' }));
