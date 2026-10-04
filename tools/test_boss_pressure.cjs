const fs=require('node:fs');
const assert=require('node:assert/strict');
const prefix=fs.readFileSync(__dirname+'/test_combat.cjs','utf8').split("run('runQaChecks()');")[0].replace('sandbox.window = sandbox;','sandbox.fetch=async()=>({ok:false});sandbox.window=sandbox;');
const {run}=new Function('require','__dirname',prefix+';return {run};')(require,__dirname);
assert.ok(run(`(() => {
 state.gameMode='hallBattles';
 const hero=battleUnit('Torren');
 const boss=prepareEnemyForBattle(hallEnemiesForStage(60,hallBattleInfo(60).waves[1],2)[0],'emberHallBattles');
 battle={hallStage:60,party:[hero],enemies:[boss],enemyResonance:0};
 boss.statuses=[{type:'broken',remaining:2}];
 const action=chooseEnemyAction(boss);
 if(action.endgameEffect!=='record') return false;
 endgameResolveEnemyEffect(boss,action,hero);
 endgameBossTurnStart(boss);
 if(!endgameMechanicState(boss).record) return false;
 if(chooseEnemyAction(boss).endgameEffect!=='reproduce') return false;
 endgameBossBroken(boss);
 return !endgameMechanicState(boss).record;
})()`));
assert.ok(run(`(() => {
 const target=battleUnit('Torren'); target.hp=100;
 const saved=Math.random; Math.random=()=>.999999;
 try { return enemyApplyActionStatuses({name:'Wyrm'},target,{status:{type:'scorched',chance:1}}).includes('SCORCHED RESISTED'); }
 finally { Math.random=saved; }
})()`));
console.log('PASS Broken permits boss records without helpers; fresh Break cancels replay; resisted utility feedback');
