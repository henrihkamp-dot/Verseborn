const fs = require('node:fs');
const assert = require('node:assert/strict');
const prefix = fs.readFileSync(__dirname + '/test_combat.cjs', 'utf8').split("run('runQaChecks()');")[0]
  .replace('sandbox.window = sandbox;', 'sandbox.fetch=async()=>({ok:false});sandbox.window=sandbox;');
const { run } = new Function('require', '__dirname', prefix + ';return {run};')(require, __dirname);
function check(name, code) { assert.ok(run(code), name); console.log('PASS', name); }
run(`function controlSetup(stage=51){state.gameMode='hallBattles';state.developerTuning={};const info=hallBattleInfo(stage);
 battle={round:1,hallStage:stage,party:['Torren','Glimmer','Verseborn'].map(battleUnit),enemies:hallEnemiesForStage(stage,info.waves[1],2).map(e=>prepareEnemyForBattle(e,'emberHallBattles')),enemyResonance:0};
 initializeEndgameFormation();return battle.enemies.find(e=>e.endgameBoss);}`);
check('Boss Stun and Sleep share immunity through two subsequent own turns', `(()=>{
 const boss=controlSetup(),hero=battle.party[0];
 if(!applyStatus(boss,'stun',hero,{force:true,duration:9}).applied||statusOf(boss,'stun').remaining!==1)return false;
 if(applyStatus(boss,'sleep',hero,{force:true}).applied)return false;
 if(!processTurnStart(boss).skip)return false;processTurnEnd(boss);
 if(statusOf(boss,'stun')||boss.controlRecovery!==2)return false;
 for(let i=0;i<2;i++){if(applyStatus(boss,'stun',hero,{force:true}).applied||applyStatus(boss,'sleep',hero,{force:true}).applied||processTurnStart(boss).skip)return false;processTurnEnd(boss);}
 return applyStatus(boss,'sleep',hero,{force:true,duration:5}).applied&&statusOf(boss,'sleep').remaining===1;
})()`);
check('Ordinary enemies, heroes, Silence and Break remain independent', `(()=>{
 const boss=controlSetup(),hero=battle.party[0],escort=battle.enemies.find(e=>!e.endgameBoss);
 applyStatus(boss,'stun',hero,{force:true});
 if(!applyStatus(boss,'silence',hero,{force:true}).applied||!applyStatus(boss,'broken',hero,{force:true}).applied)return false;
 applyStatus(escort,'sleep',hero,{force:true,duration:4});applyStatus(hero,'stun',boss,{force:true,duration:3});
 return statusOf(escort,'sleep').remaining===4&&!escort.controlRecovery&&statusOf(hero,'stun').remaining===1&&!hero.controlRecovery;
})()`);
check('Resisted CC does not consume the window; earlier bosses use the same recovery', `(()=>{
 const boss=controlSetup(),hero=battle.party[0],random=Math.random;Math.random=()=>1;
 try {if(applyStatus(boss,'sleep',hero,{chance:0}).applied||boss.controlRecovery)return false;
 delete boss.endgameBoss;boss.resistanceTier='boss';battle.hallStage=30;
 return applyStatus(boss,'sleep',hero,{force:true,duration:4}).applied&&statusOf(boss,'sleep').remaining===1&&boss.controlRecovery===3;
 }finally{Math.random=random;}
})()`);
check('All ten bosses open first, gain 10% initiative, and lead every third round', `(()=>{
 for(let stage=51;stage<=60;stage++){const boss=controlSetup(stage);buildTurnOrder();if(battle.turnQueue[0].name!==boss.name)return false;
 boss.actionsTaken=1;battle.round=2;if(Math.abs(battleInitiative(boss,boss.stats.agi)-effectiveAgility(boss,boss.stats.agi)*1.1)>.0001)return false;
 battle.round=4;buildTurnOrder();if(battle.turnQueue[0].name!==boss.name)return false;
 battle.turnIndex=-1;reorderRemainingTurns();if(battle.turnQueue[0].name!==boss.name)return false;
 }return true;
})()`);
check('Endgame boss damage rises 12%; escorts and earlier battles remain unchanged', `(()=>{
 const boss=controlSetup(),target=battle.party[0],random=Math.random;Math.random=()=>.9;
 try {const action={kind:'melee',element:'Physical',coefficient:1};const boosted=enemyDamageRoll(boss,action,target).damage;
 const mechanic=boss.endgameBoss;delete boss.endgameBoss;const normal=enemyDamageRoll(boss,action,target).damage;
 boss.endgameBoss=mechanic;battle.hallStage=30;const earlier=enemyDamageRoll(boss,action,target).damage;
 const escort=battle.enemies.find(e=>!e.endgameBoss),before=enemyDamageRoll(escort,action,target).damage;battle.hallStage=51;
 console.log('Damage comparison',normal,boosted);return Math.abs(boosted-normal*1.12)<=1&&earlier===normal&&enemyDamageRoll(escort,action,target).damage===before;
 }finally{Math.random=random;}
})()`);
check('Silence does not cancel the physical Judgment at actual turn start', `(()=>{
 const boss=controlSetup(58);boss.actionsTaken=1;const prep=chooseEnemyAction(boss);endgameResolveEnemyEffect(boss,prep,battle.party[0]);
 applyStatus(boss,'silence',battle.party[0],{force:true});processTurnStart(boss);
 return chooseEnemyAction(boss).name==='Chained Judgment';
})()`);
