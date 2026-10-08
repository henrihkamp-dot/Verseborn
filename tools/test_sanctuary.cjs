const fs = require('node:fs');
const assert = require('node:assert/strict');
const prefix = fs.readFileSync(__dirname + '/test_combat.cjs', 'utf8').split("run('runQaChecks()');")[0]
  .replace('sandbox.window = sandbox;', 'sandbox.fetch=async()=>({ok:false});sandbox.window = sandbox;');
const { run } = new Function('require', '__dirname', prefix + ';return {run};')(require, __dirname);
function check(name, code) { assert.ok(run(code), name); console.log('PASS', name); }
check('Every phase announces healing, then resolves and recovers', `(() => {
 state.gameMode='hallBattles';state.developerTuning={};
 return [0,1,2].every(phase=>{
 const info=hallBattleInfo(52);const keys=phase===0?info.enemies:info.waves[phase-1];
 const enemies=hallEnemiesForStage(52,keys,phase).map(e=>prepareEnemyForBattle(e,'emberHallBattles'));
 battle={hallStage:52,enemies,party:[battleUnit('Torren')],enemyResonance:0};
 const leader=enemies.find(e=>e.endgameBoss==='sanctuary')||enemies.find(e=>e.name==='Lysra')||enemies.find(e=>e.name==='Corrupt Clergy');
 leader.hp=Math.round(leader.max*.5);
 const setup=chooseEnemyAction(leader);if(setup.endgameEffect!=='sanctuaryPrepare')return false;
 endgameResolveEnemyEffect(leader,setup,battle.party[0]);
 const heal=chooseEnemyAction(leader);const recovery=chooseEnemyAction(leader);
 return heal.healing&&heal.target===leader&&heal.cleanse&&Boolean(heal.allAllies)===(phase===2)&&!recovery.healing&&!recovery.endgameEffect;
 });
})()`);
check('Interrupting Maelin collapses wards and cancels the ritual', `(() => {
 const boss=battle.enemies.find(e=>e.endgameBoss==='sanctuary');
 endgameResolveEnemyEffect(boss,{endgameEffect:'sanctuaryPrepare'},battle.party[0]);
 if(!statusOf(boss,'barrier'))return false;
 endgameBossBroken(boss);
 return !boss.encounterMechanic.sanctuaryPending&&battle.enemies.every(e=>!statusOf(e,'sanctuary'))&&statusValue(boss,'magicVulnerability')===.25&&!chooseEnemyAction(boss).healing;
})()`);
check('Defeated or Silenced supports weaken healing and remove cleanse', `(() => {
 const boss=battle.enemies.find(e=>e.endgameBoss==='sanctuary');const data=endgameMechanicState(boss);data.sanctuaryRecovery=false;
 data.sanctuaryPending=true;const full=chooseEnemyAction(boss);
 battle.enemies.filter(e=>e!==boss).forEach(e=>endgameStatus(e,'silence',boss,{duration:2}));
 data.sanctuaryRecovery=false;data.sanctuaryPending=true;const weakened=chooseEnemyAction(boss);
 return weakened.healCoefficient<full.healCoefficient&&!weakened.cleanse;
})()`);
check('Full-health and depleted healers cannot loop useless rituals', `(() => {
 const boss=battle.enemies.find(e=>e.endgameBoss==='sanctuary');boss.encounterMechanic={};
 battle.enemies.forEach(e=>e.hp=e.max);if(chooseEnemyAction(boss).endgameEffect)return false;
 boss.hp=1;boss.mp=0;return chooseEnemyAction(boss).endgameEffect!=='sanctuaryPrepare';
})()`);
