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
assert.ok(run(`(()=>{
  progressFor('Sparky').talents = ['Ember Bite'];
  const original = applyStatus;
  const calls = [];
  applyStatus = (target, type, source, options) => { calls.push({type, options}); return true; };
  try {
    for (const name of ['Ember Nip', 'Memory Flare']) {
      const sk = battleSkills('Sparky').find(entry => entry.name === name);
      applySkillStatuses({id:'Sparky'}, {}, sk);
    }
    return calls.length === 2 && calls.every(call => call.type === 'burn' && call.options.chance === 1 && call.options.duration === 4);
  } finally { applyStatus = original; }
})()`));
assert.ok(run(`(()=>{
  const source = {id:'Sparky', mag:100, str:100};
  progressFor('Sparky').talents = [];
  const normal = dotValueFor('burn', {}, source, {scaling:'mag'});
  progressFor('Sparky').talents = ['Living Wildfire'];
  return dotValueFor('burn', {}, source, {scaling:'mag'}) === normal * 2 && !typedTalentValue('Sparky','deathBurnTransfer');
})()`));
console.log('PASS Ember Bite grants both skills 100% Burn for 4 actions; Living Wildfire doubles ticks');
