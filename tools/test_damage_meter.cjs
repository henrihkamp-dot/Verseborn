const fs = require('node:fs');
const assert = require('node:assert/strict');
const prefix = fs.readFileSync(__dirname + '/test_combat.cjs', 'utf8').split("run('runQaChecks()');")[0].replace('sandbox.window = sandbox;', 'sandbox.fetch=async()=>({ok:false});sandbox.window = sandbox;');
const { run } = new Function('require', '__dirname', prefix + ';return {run};')(require, __dirname);
assert.ok(run(`(() => {
  battle = { name: 'Test phase', meterName: 'Test battle', meterStarted: 'now', meterTuning: {}, round: 1, party: [{name:'Torren',hp:100,mp:20}], enemies:[{name:'Boss',hp:500,mp:30}], actionHistory:[], meterEvents:[], turnQueue:[{name:'Torren',side:'party'}], turnIndex:0 };
  recordDamageMeterAction('Torren attacks.');
  if (battle.actionHistory.length !== 1 || battle.actionHistory[0].actor !== 'Torren') return false;
  for (let i=0;i<12;i++) { battle.meterArchived=false; battle.meterName='Battle '+i; archiveDamageMeter('victory'); }
  if (recentDamageMeters().length !== 10 || recentDamageMeters()[0].name !== 'Battle 2' || recentDamageMeters()[0].actions[0].message !== 'Torren attacks.') return false;
  archiveDamageMeter('victory');
  return recentDamageMeters().length === 10;
})()`));
console.log('PASS action capture, archive persistence, ten-battle limit and duplicate protection');
assert.ok(run(`(() => {
  state.gameMode='hallBattles';
  state.developerTuning={party:{healing:100,burn:100,poison:-100,bleed:50},enemy:{healing:-100,burn:-50}};
  const hero={id:'Torren',statuses:[]}; const foe={statuses:[]};
  if(healingReceived(hero,50)!==100 || healingReceived(foe,50)!==0) return false;
  if(developerScale('party','burn',100)!==200 || developerScale('party','poison',100)!==0 || developerScale('party','bleed',100)!==150 || developerScale('enemy','burn',100)!==50) return false;
  state.developerTuning={};
  return healingReceived(hero,50)===50 && developerScale('party','burn',100)===100;
})()`));
console.log('PASS healing and separate DOT tuning, zero baseline and -100%');
