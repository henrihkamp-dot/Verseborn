const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const prefix = fs.readFileSync(path.join(__dirname, 'test_combat.cjs'), 'utf8')
  .split("run('runQaChecks()');")[0]
  .replace('sandbox.window = sandbox;', 'sandbox.fetch=async()=>({ok:false}); sandbox.window = sandbox;');
const { run } = new Function('require', '__dirname', `${prefix}\nreturn {run};`)(require, __dirname);
const roles = ['dps', 'tank', 'heal', 'utility'];
const rarities = ['Rare', 'Epic', 'Legendary', 'Mythic', 'Artifact'];
const slots = ['weapon', 'armour', 'helmet', 'necklace', 'ring'];
for (const role of roles) for (const rarity of rarities) for (const slot of slots) {
  const html = run(`gearIconHtml(${JSON.stringify({ name: 'Visual probe', visualRole: role, rarity, slot })}, 'Verseborn', 0)`);
  const filename = `${role}-${rarity.toLowerCase()}-${slot}.webp`;
  assert.ok(html.includes(filename));
  assert.ok(fs.existsSync(path.join(root, 'public/game/assets/ui/gear-visuals', filename)));
}
assert.equal(run('gearVisualRole({stats:{stam:30,str:10}})'), 'tank');
assert.equal(run('gearVisualRole({stats:{echo:30,mag:10}})'), 'utility');
assert.equal(run('gearVisualRole({stats:{str:30,echo:10}})'), 'dps');
assert.equal(run('gearVisualRole({effect:{type:"healPower"},stats:{mag:30}})'), 'heal');
const before = run('JSON.stringify(state)');
run(`Object.values(gearDb).flat().forEach(gear => gearIconHtml(gear, 'Verseborn', 0))`);
assert.equal(run('JSON.stringify(state)'), before);
const out = path.join(root, '.sites-artifacts/gear-visuals-qa');
const shell = (view, content) => `<!doctype html><html><head><meta charset="utf-8"><base href="/public/game/"><link rel="stylesheet" href="styles.css"></head><body><section class="menu" data-menu-view="${view}"><div class="menu-body">${content}</div></section></body></html>`;
run(`state.party = Object.keys(baseJobs); selectedMenuTab = 'gear'; renderMenu()`);
fs.writeFileSync(path.join(out, 'gear.html'), shell('gear', run('el.menuBody.innerHTML')));
run(`activeVendor='workshop'; vendorTab='buy'; renderVendor()`);
fs.writeFileSync(path.join(out, 'shop.html'), shell('glimmer-shop', run('el.menuBody.innerHTML')));
const ref = run('baseJobs.Verseborn.gear.weapon');
fs.writeFileSync(path.join(out, 'popup.html'), shell('gear', `<div class="gear-hover-tooltip">${run(`gearHoverPopupHtml({heroId:'Verseborn',ref:${JSON.stringify(ref)}})`)}</div>`));
console.log('PASS: 100 role/rarity/slot combinations, fallback identities, asset references, unchanged game state; Gear/Shop/popup fixtures rendered.');
