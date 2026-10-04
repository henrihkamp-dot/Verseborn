const fs = require('node:fs');
const assert = require('node:assert/strict');
const prefix = fs.readFileSync(__dirname + '/test_combat.cjs', 'utf8').split("run('runQaChecks()');")[0].replace('sandbox.window = sandbox;', 'sandbox.fetch=async()=>({ok:false});sandbox.window = sandbox;');
const { run } = new Function('require', '__dirname', prefix + ';return {run};')(require, __dirname);
assert.ok(run(`(() => {
  battle = { name: 'Test phase', meterName: 'Test battle', meterStarted: 'now', meterTuning: {}, round: 1, party: [{name:'Torren',hp:100,mp:20}], enemies:[{name:'Boss',hp:500,mp:30}], actionHistory:[], meterEvents:[], turnQueue:[{name:'Torren',side:'party'}], turnIndex:0 };
  recordDamageMeterAction('Torren attacks.');
  if (battle.actionHistory.length !== 1 || battle.actionHistory[0].actor !== 'Torren') return false;
  for (let i=0;i<4;i++) { battle.meterArchived=false; archiveDamageMeter('victory'); }
  if (recentDamageMeters().length !== 3 || recentDamageMeters()[0].actions[0].message !== 'Torren attacks.') return false;
  archiveDamageMeter('victory');
  return recentDamageMeters().length === 3;
})()`));
console.log('PASS action capture, archive persistence, three-battle limit and duplicate protection');
