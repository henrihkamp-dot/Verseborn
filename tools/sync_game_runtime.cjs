const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'public', 'game');
const runtime = path.join(root, 'dist', 'client', 'game');
if (!fs.existsSync(path.join(runtime, 'assets', 'maps', 'runtime', 'title-screen.webp'))) {
  throw new Error('The compact game asset bundle must be prepared before syncing runtime code.');
}
// The source uses PNG originals; the release bundle contains the compact WebP equivalents.
for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
  if (!entry.isFile() || !/\.(js|css|html)$/.test(entry.name)) continue;
  const text = fs.readFileSync(path.join(source, entry.name), 'utf8').replace(/\.png/g, '.webp');
  fs.writeFileSync(path.join(runtime, entry.name), text);
}
fs.cpSync(path.join(source, 'assets', 'equipment'), path.join(runtime, 'assets', 'equipment'), { recursive: true });
console.log('Runtime code synced with compact WebP asset references.');
