const fs = require('node:fs');
const assert = require('node:assert/strict');
const prefix = fs.readFileSync(__dirname + '/test_combat.cjs', 'utf8').split("run('runQaChecks()');")[0]
  .replace('sandbox.window = sandbox;', 'sandbox.fetch=async()=>({ok:false});sandbox.window = sandbox;');
const { run } = new Function('require', '__dirname', prefix + ';return {run};')(require, __dirname);
function check(name, code) { assert.ok(run(code), name); console.log('PASS', name); }
run(`function rhythmSetup(stage,phase){state.gameMode='hallBattles';state.developerTuning={};const info=hallBattleInfo(stage);const keys=phase===0?info.enemies:info.waves[phase-1];battle={hallStage:stage,enemies:hallEnemiesForStage(stage,keys,phase).map(e=>prepareEnemyForBattle(e,'emberHallBattles')),party:[battleUnit('Torren'),battleUnit('Sparky')],enemyResonance:0};initializeEndgameFormation();return battle;}`);
for (let stage=53;stage<=60;stage++) {
  for(let phase=0;phase<2;phase++) {
    check(`Stage ${stage} phase ${phase+1}: preparation, support, impact, recovery`, `(()=>{
      rhythmSetup(${stage},${phase});const rhythm=stageFormationRhythm();const leader=battle.enemies.find(e=>e.name===HALL_ENEMY_LIBRARY[rhythm.leader].name);
      const setup=chooseEnemyAction(leader);if(setup.endgameEffect!=='stagePrepare')return false;
      endgameResolveEnemyEffect(leader,setup,battle.party[0]);
      const support=battle.enemies.find(e=>e!==leader);if(!chooseEnemyAction(support))return false;
      const hit=chooseEnemyAction(leader);const recovery=chooseEnemyAction(leader);
      return hit.name===rhythm.title&&hit.target?.id&&!hit.allTargets&&hit.coefficient>1&&!recovery.endgameEffect&&Boolean(battle.mechanicAnnouncement.text);
    })()`);
    check(`Stage ${stage} phase ${phase+1}: cleansing avoids impact; Break cancels preparation`, `(()=>{
      rhythmSetup(${stage},${phase});const rhythm=stageFormationRhythm();const leader=battle.enemies.find(e=>e.name===HALL_ENEMY_LIBRARY[rhythm.leader].name);
      endgameResolveEnemyEffect(leader,chooseEnemyAction(leader),battle.party[0]);const target=leader.encounterMechanic.stagePending.target;target.statuses=[];
      if(chooseEnemyAction(leader).name===rhythm.title)return false;
      leader.encounterMechanic.stageRecovery=false;endgameResolveEnemyEffect(leader,chooseEnemyAction(leader),target);
      endgameStatus(leader,'broken',battle.party[0],{duration:2});processTurnStart(leader);
      return !leader.encounterMechanic.stagePending&&statusValue(leader,'magicVulnerability')===.2;
    })()`);
  }
  check(`Stage ${stage} boss and surviving companions resolve valid actions`, `(()=>{
    rhythmSetup(${stage},2);const boss=battle.enemies.find(e=>e.endgameBoss);
    for(let turn=0;turn<9;turn++){
      boss.actionsTaken=turn;const a=chooseEnemyAction(boss);if(!a||!a.kind)return false;
      if(a.endgameEffect)endgameResolveEnemyEffect(boss,a,a.target||battle.party[0]);
      for(const ally of battle.enemies.filter(e=>e!==boss))if(!chooseEnemyAction(ally))return false;
    }
    battle.enemies.filter(e=>e!==boss).forEach(e=>e.hp=0);
    return Boolean(chooseEnemyAction(boss));
  })()`);
}
check('Ilyss loses recorded replay on interruption', `(()=>{rhythmSetup(60,2);const boss=battle.enemies.find(e=>e.endgameBoss);endgameResolveEnemyEffect(boss,{endgameEffect:'record'},battle.party[0]);if(!boss.encounterMechanic.record)return false;endgameBossBroken(boss);return !boss.encounterMechanic.record&&!statusOf(boss,'livingArchive');})()`);
check('Silencing Cantor supports reduces active harmonic rings', `(()=>{rhythmSetup(59,2);const boss=battle.enemies.find(e=>e.endgameBoss);endgameResolveEnemyEffect(boss,{endgameEffect:'rings'},battle.party[0]);battle.enemies.filter(e=>e!==boss).forEach(e=>endgameStatus(e,'silence',boss,{duration:2}));endgameBossTurnStart(boss);return boss.encounterMechanic.rings===0;})()`);
for (const [stage,turn,title] of [[53,2,'Final Notice'],[55,1,'Root Eruption'],[57,2,'Dream Collapse'],[58,1,'Chained Judgment']]) {
  check(`Stage ${stage}: boss impact is announced, interrupted and weakened by support loss`, `(()=>{
    rhythmSetup(${stage},2);const boss=battle.enemies.find(e=>e.endgameBoss);boss.actionsTaken=${turn};
    if(${stage}===53)endgameResolveEnemyEffect(boss,{endgameEffect:'order'},battle.party[0]);
    const setup=chooseEnemyAction(boss);if(setup.endgameEffect!=='stagePrepare')return false;
    endgameResolveEnemyEffect(boss,setup,battle.party[0]);endgameBossBroken(boss);
    if(boss.encounterMechanic.stagePending)return false;
    boss.encounterMechanic.stageRecovery=false;boss.encounterMechanic.window=0;
    endgameResolveEnemyEffect(boss,setup,battle.party[0]);const full=chooseEnemyAction(boss);
    boss.encounterMechanic.stageRecovery=false;boss.encounterMechanic.window=0;
    battle.enemies.filter(e=>e!==boss).forEach(e=>e.hp=0);
    endgameResolveEnemyEffect(boss,setup,battle.party[0]);const weak=chooseEnemyAction(boss);
    return full.name==='${title}'&&weak.coefficient<full.coefficient;
  })()`);
}
check('Cleansing occult mark prevents Malkhius delayed echo', `(()=>{
 rhythmSetup(56,2);const boss=battle.enemies.find(e=>e.endgameBoss);const target=battle.party[0];
 endgameResolveEnemyEffect(boss,{endgameEffect:'occult'},target);target.statuses=[];
 return chooseEnemyAction(boss).name!=='Delayed Occult Echo'&&!boss.encounterMechanic.pending;
})()`);
