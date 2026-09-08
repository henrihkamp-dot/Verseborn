const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const gameSource = fs.readFileSync(path.join(root, "public/game/game.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "public/game/assets/sprites/enemies-battle/manifest.json"), "utf8"));
const expected = [
  "Inkbound Auditor", "King Maeric", "Grumm", "Kaeldrin", "Marla", "Lyrsa", "Nyx", "Rava", "Shade", "Tja",
  "Archive Custodian", "Ash Wyrm", "Cracked Pillar", "Seal Bearer", "Dock Foreman", "Dawn Gate Sentinel", "Jory"
];

assert.deepEqual(Object.keys(manifest), expected);
for (const [name, config] of Object.entries(manifest)) {
  assert.equal(config.battleOnly, true, `${name} must remain battle-only`);
  assert.ok(fs.existsSync(path.join(root, "public/game/assets/sprites/enemies-battle", config.file)), `${name} image is missing`);
  for (const animation of ["idle", "melee", "magic", "death"]) {
    assert.ok(Number.isInteger(config.rowMap[animation]), `${name} is missing ${animation}`);
    assert.equal(config.frameSequences[animation].length, 5, `${name} ${animation} must have five stable beats`);
    assert.ok(config.frameSequences[animation].every(column => column >= 0 && column < config.columns), `${name} ${animation} points outside its atlas`);
  }
}

assert.match(gameSource, /animatedSheet && !animatedSheet\.battleOnly/, "World rendering must reject battle-only atlases");
assert.match(gameSource, /profile\.pattern\[\(unit\.patternStep \|\| 0\) % profile\.pattern\.length\]/, "Boss patterns must advance deterministically");
assert.match(gameSource, /Crown and Winter/, "The King Maeric and Tja Echo Hunt must be registered");

console.log(`Enemy battle checks: ${expected.length}/${expected.length}`);
