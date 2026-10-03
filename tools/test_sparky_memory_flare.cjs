const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const prefix = fs.readFileSync(path.join(__dirname, 'test_combat.cjs'), 'utf8')
  .split("run('runQaChecks()');")[0]
  .replace('sandbox.window = sandbox;', 'sandbox.fetch=async()=>({ok:false}); sandbox.window=sandbox;');
const { run } = new Function('require', '__dirname', prefix + '\nreturn {run};')(require, __dirname);
assert.ok(run(`(()=>{
  progressFor('Sparky').talents = [];
  const flare = battleSkills('Sparky').find(sk => sk.name === 'Memory Flare');
  return flare && flare.allEnemies && flare.cost === 7 && skillHitsAll('Sparky', flare);
})()`));
console.log('PASS Memory Flare hits all enemies without talents and retains its MP cost');
