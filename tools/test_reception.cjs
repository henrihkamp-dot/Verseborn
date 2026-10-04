const fs = require('node:fs');
const assert = require('node:assert/strict');
const prefix = fs.readFileSync(__dirname + '/test_combat.cjs', 'utf8').split("run('runQaChecks()');")[0]
  .replace('sandbox.window = sandbox;', 'sandbox.fetch=async()=>({ok:false});sandbox.window = sandbox;');
const { run } = new Function('require', '__dirname', prefix + ';return {run};')(require, __dirname);
function check(name, code) { assert.ok(run(code), name); console.log('PASS', name); }
check('All three phases telegraph and resolve; supports increase pressure', `(() => {
 state.gameMode='hallBattles';
 return [0,1,2].every(phase=>{
 const info=hallBattleInfo(51); const keys=phase===0?info.enemies:info.waves[phase-1];
 const enemies=hallEnemiesForStage(51,keys,phase).map(e=>prepareEnemyForBattle(e,'emberHallBattles'));
 battle={hallStage:51,enemies,party:[battleUnit('Torren')],enemyResonance:0};
 const leader=enemies.find(e=>e.endgameBoss==='guest')||enemies.find(e=>e.name==='High Administrator Thaddeus')||enemies.find(e=>e.name==='Dawn Gate Sentinel');
 let action=receptionEnemyAction(leader);
 if(action.endgameEffect==='guest'){endgameResolveEnemyEffect(leader,action,battle.party[0]);action=receptionEnemyAction(leader);}
 if(action.endgameEffect!=='receptionPrepare')return false;
 endgameResolveEnemyEffect(leader,action,battle.party[0]);
 const strike=receptionEnemyAction(leader);
 return !strike.allTargets && strike.target===battle.party[0] && strike.coefficient>=1.05 && battle.mechanicAnnouncement.text.length>0;
 });
})()`);
check('Break cancels Veyr preparation and opens a burst window', `(() => {
 const info=hallBattleInfo(51); const enemies=hallEnemiesForStage(51,info.waves[1],2).map(e=>prepareEnemyForBattle(e,'emberHallBattles'));
 battle={hallStage:51,enemies,party:[battleUnit('Torren')]};const boss=enemies.find(e=>e.endgameBoss==='guest');
 initializeEndgameFormation(); const data=endgameMechanicState(boss);data.receptionPending=true;
 endgameBossBroken(boss);
 return !data.receptionPending && data.receptionWindow===2 && !enemies.some(e=>statusOf(e,'protectedGuest'));
})()`);
check('Other stages do not receive reception AI', `(() => {
 battle.hallStage=52; const unit=battle.enemies.find(e=>e.name==='Dawn Gate Sentinel');
 return chooseEnemyAction(unit).endgameEffect!=='receptionPrepare';
})()`);
check('AoE does not retaliate and eliminating supports weakens Last Courtesy', `(() => {
 const info=hallBattleInfo(51);const enemies=hallEnemiesForStage(51,info.waves[1],2).map(e=>prepareEnemyForBattle(e,'emberHallBattles'));
 const actor=battleUnit('Sparky');battle={hallStage:51,enemies,party:[actor],attackDamage:[]};
 initializeEndgameFormation();const boss=enemies.find(e=>e.endgameBoss==='guest');const guest=enemies.find(e=>statusOf(e,'protectedGuest'));
 const sk=battleSkills('Sparky').find(s=>s.name==='Memory Flare');const hp=actor.hp;
 const multiplier=endgamePlayerDamageMultiplier(actor,sk,guest);
 if(actor.hp!==hp||multiplier>=1)return false;
 const data=endgameMechanicState(boss);data.receptionPending=true;
 const empowered=receptionEnemyAction(boss).coefficient;
 enemies.filter(e=>e!==boss).forEach(e=>e.hp=0);data.receptionPending=true;
 return receptionEnemyAction(boss).coefficient<empowered;
})()`);
