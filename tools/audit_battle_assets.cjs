const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const sprites = path.join(root, 'public/game/assets/sprites');
const runtime = path.join(root, '.sites-artifacts/release111-potency/dist/client/game/assets/sprites');
const manifestPath = path.join(sprites, 'enemies-battle/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath));
const game = fs.readFileSync(path.join(root, 'public/game/game.js'), 'utf8');
const retiredAliases = ['Lyrsa', 'Nyx', 'Jory'];
const removed = [], migrated = [];
function checked(file) {
  const full = path.resolve(sprites, file);
  assert.ok(full.startsWith(sprites + path.sep), 'Asset escaped workspace');
  return full;
}
function remove(file, reason) {
  const full = checked(file);
  if (!fs.existsSync(full)) return;
  removed.push({ file, bytes: fs.statSync(full).size, reason });
  fs.unlinkSync(full);
}
for (const name of retiredAliases) {
  const old = manifest[name];
  if (!old) continue;
  const canonical = { Lyrsa: 'Lysra', Nyx: 'Nyx Vael', Jory: 'Jory Bellwick' }[name];
  assert.ok(manifest[canonical]);
  assert.ok(game.includes(`${name}: "${canonical}"`));
  assert.ok(game.includes('enemyAnimationSheets[enemyAnimationFiles[name] || name]'));
  delete manifest[name];
  if (!Object.values(manifest).some(config => config.file === old.file)) remove('enemies-battle/' + old.file, 'Replaced canonical enemy / preview; obsolete preload removed');
}
for (const config of Object.values(manifest)) {
  if (!config.file.endsWith('.png')) continue;
  const source = 'enemies-battle/' + config.file;
  const compact = source.replace(/\.png$/, '.webp');
  const existing = path.join(runtime, compact);
  assert.ok(fs.existsSync(existing), 'No verified compact equivalent for ' + source);
  fs.copyFileSync(existing, checked(compact));
  migrated.push({ source, compact, pngBytes: fs.statSync(checked(source)).size, webpBytes: fs.statSync(existing).size });
  config.file = config.file.replace(/\.png$/, '.webp');
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
for (const entry of migrated) remove(entry.source, 'Active atlas retained byte-for-byte as verified release-111 WebP');
const heroes = ['verseborn', 'mira', 'seerin', 'kael', 'torren', 'glimmer', 'sparky'];
for (const id of heroes) for (const suffix of ['-anim.png', '-sheet.png']) {
  const file = id + suffix;
  assert.ok(!game.includes(file));
  remove(file, 'Obsolete source; current battle-v2 and world animation sheets remain active');
}
for (const file of ['enemies-sheet.png', 'enemies-attack-sheet.png', 'npcs-sheet.png', 'animation/lysra.png']) {
  assert.ok(!game.includes(file));
  remove(file, 'No active runtime, world, encounter, preview or fallback reference');
}
const oldRuntimeAliases = retiredAliases.map(name => ({ file: 'enemies-battle/' + { Lyrsa: 'lyrsa', Nyx: 'nyx', Jory: 'jory' }[name] + '.webp', bytes: 0 }));
for (const entry of oldRuntimeAliases) {
  const file = path.join(runtime, entry.file);
  entry.bytes = fs.existsSync(file) ? fs.statSync(file).size : 0;
}
const report = { removed, migrated, retiredPreloadEntries: retiredAliases, runtimeRemoved: oldRuntimeAliases,
  sourceBytesSaved: removed.reduce((sum, entry) => sum + entry.bytes, 0) - migrated.reduce((sum, entry) => sum + entry.webpBytes, 0),
  runtimeBytesSaved: oldRuntimeAliases.reduce((sum, entry) => sum + entry.bytes, 0),
  retained: ['Active Stage 1-60 canonical atlases', 'All hero battle-v2 atlases', 'World character/NPC animations', 'Marla battle fallback', 'Compact generic enemy and NPC fallback atlases', 'Codex character-sheet previews'] };
fs.writeFileSync(path.join(root, '.sites-artifacts/battle-asset-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ removed: removed.length, migrated: migrated.length, sourceBytesSaved: report.sourceBytesSaved, runtimeBytesSaved: report.runtimeBytesSaved }));
