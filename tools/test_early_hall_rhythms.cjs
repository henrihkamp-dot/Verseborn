const fs = require('node:fs');
const assert = require('node:assert/strict');
const prefix = fs.readFileSync(__dirname + '/test_combat.cjs', 'utf8').split("run('runQaChecks()');")[0]
  .replace('sandbox.window = sandbox;', 'sandbox.fetch=async()=>({ok:false});sandbox.window = sandbox;');
const { run } = new Function('require', '__dirname', prefix + ';return {run};')(require, __dirname);
for (let stage = 5; stage <= 40; stage++) {
  assert.ok(run(`(()=>{
    state.gameMode='hallBattles';state.developerTuning={};
    const info=hallBattleInfo(${stage});
    for(const keys of [info.enemies,...info.waves]) {
      battle={hallStage:${stage},party:[battleUnit('Torren'),battleUnit('Verseborn')],enemies:hallEnemiesForStage(${stage},keys).map(e=>prepareEnemyForBattle(e)),enemyResonance:0};
      const leader=battle.enemies[0];leader.actionsTaken=1;
      const setup=chooseEnemyAction(leader);
      if(setup.endgameEffect!=='stagePrepare')return false;
      endgameResolveEnemyEffect(leader,setup,battle.party[0]);
      const impact=chooseEnemyAction(leader);
      if(impact.name!==setup.rhythm.title||!impact.target||impact.allTargets)return false;
      if(chooseEnemyAction(leader).name!=='Recovering from the assault')return false;
      leader.actionsTaken=1;
      endgameResolveEnemyEffect(leader,chooseEnemyAction(leader),battle.party[0]);
      leader.encounterMechanic.stagePending.target.statuses=[];
      if(chooseEnemyAction(leader).name===setup.rhythm.title)return false;
      leader.encounterMechanic.stageRecovery=false;
      endgameResolveEnemyEffect(leader,chooseEnemyAction(leader),battle.party[0]);
      endgameStatus(leader,'broken',battle.party[0],{duration:2});processTurnStart(leader);
      if(leader.encounterMechanic.stagePending)return false;
    }
    return true;
  })()`), `Stage ${stage}: all phases, impact, recovery, cleanse and Break`);
}
console.log('PASS stages 5-40: all formations and counterplay');
