const fs = require('node:fs');
const assert = require('node:assert/strict');
const prefix = fs.readFileSync(__dirname + '/test_combat.cjs', 'utf8').split("run('runQaChecks()');")[0]
  .replace('sandbox.window = sandbox;', 'sandbox.fetch=async()=>({ok:false});sandbox.window = sandbox;');
const { run } = new Function('require', '__dirname', prefix + ';return {run};')(require, __dirname);
assert.ok(run(`(() => {
  const snapshot = snapshotBattleLoadout([{id:'Torren',name:'Torren'}]);
  const before = JSON.stringify(snapshot);
  const saved = baseJobs.Torren.gear;
  baseJobs.Torren.gear = {};
  const text = damageMeterLoadoutLines({loadout:snapshot}).join('\\n');
  baseJobs.Torren.gear = saved;
  return before === JSON.stringify(snapshot) && snapshot[0].level > 0
    && snapshot[0].gear.length > 0 && text.includes('Torren | Level')
    && text.includes('Base stats:') && text.includes('Unique effect:')
    && damageMeterLoadoutLines({})[0].includes('older report');
})()`));
console.log('PASS battle equipment snapshot, readable export, immutable equipment and legacy reports');
