const fs=require('node:fs'),assert=require('node:assert/strict');
const prefix=fs.readFileSync(__dirname+'/test_endgame_pressure.cjs','utf8').split("check('All thirty formations")[0];
const {run}=new Function('require','__dirname',prefix+';return {run};')(require,__dirname);
function check(name,code){assert.ok(run(code),name);console.log('PASS',name);}
check('Real stage launch uses Hall scaling for every phase and initializes opening mechanics',`(()=>{
 state.gameMode='hallBattles';state.developerTuning={};state.activeParty=['Torren','Glimmer','Verseborn'];hallBattleProgress().unlockedStage=60;
 const current=runCurrentTurn;runCurrentTurn=()=>{};
 try {for(let stage=51;stage<=60;stage++){startHallBattleStage(stage);const info=hallBattleInfo(stage);
 if(battle.hallStage!==stage||!battle.mechanicAnnouncement)return false;
 for(let phase=0;phase<3;phase++){const actual=phase===0?battle.enemies:battle.waves[phase-1].enemies;
 const expected=hallEnemiesForStage(stage,phase===0?info.enemies:info.waves[phase-1],phase).map(e=>prepareEnemyForBattle(e,'emberHallBattles'));
 if(actual.some((e,i)=>e.max!==expected[i].max||e.stats.mag!==expected[i].stats.mag||e.stats.agi!==expected[i].stats.agi))return false;
 }if(stage===51)console.log('Stage 51 HP:',battle.enemies[0].max,'boss:',battle.waves[1].enemies[0].max);
 }return true;}finally{runCurrentTurn=current;}
})()`);
check('Last Courtesy actually damages its target after Break and a turn-start',`(()=>{
 pressureSetup(51,2);battle.round=1;const boss=battle.enemies.find(e=>e.endgameBoss),hero=battle.party[0];boss.actionsTaken=0;
 const prep=receptionEnemyAction(boss);endgameResolveEnemyEffect(boss,prep,hero);const target=boss.encounterMechanic.receptionTarget;
 addBreakProgress(hero,boss,BREAK_THRESHOLD);applyStatus(boss,'broken',hero,{force:true});boss.actionsTaken=1;processTurnStart(boss);
 const action=chooseEnemyAction(boss);if(action.name!=='Last Courtesy'||action.target!==target)return false;
 const choose=chooseEnemyAction,random=Math.random;chooseEnemyAction=()=>action;Math.random=()=>.9;
 try {const hp=target.hp;resolveEnemyTurn({side:'enemy',index:battle.enemies.indexOf(boss),name:boss.name},'');__impact();return target.hp<hp;}
 finally{chooseEnemyAction=choose;Math.random=random;}
})()`);
