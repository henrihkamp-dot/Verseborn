const fs=require('node:fs'),assert=require('node:assert/strict');
const prefix=fs.readFileSync(__dirname+'/test_endgame_pressure.cjs','utf8').split("check('All thirty formations")[0];
const {run}=new Function('require','__dirname',prefix+';return {run};')(require,__dirname);
function check(name,code){assert.ok(run(code),name);console.log('PASS',name);}
check('Ten bosses reject forced Stun/Sleep; Break preserves every pending mechanic',`(()=>{
 for(let stage=51;stage<=60;stage++){pressureSetup(stage,2);const boss=battle.enemies.find(e=>e.endgameBoss),hero=battle.party[0];
 if(applyStatus(boss,'stun',hero,{force:true}).applied||applyStatus(boss,'sleep',hero,{force:true}).applied)return false;
 const data=endgameMechanicState(boss);Object.assign(data,{stagePending:{target:hero,title:'Test',kind:'magic'},sanctuaryPending:true,receptionPending:true,pending:hero,rings:3,charging:true});
 const result=addBreakProgress(hero,boss,boss.breakThreshold||BREAK_THRESHOLD);applyStatus(boss,'broken',hero,{force:true});
 if(!result.breaks||!result.bonusDamage||!statusOf(boss,'broken')||!data.stagePending||!data.sanctuaryPending||!data.receptionPending||data.pending!==hero||data.rings!==3||!data.charging)return false;
 }return true;
})()`);
check('Boss Renewal survives Broken; Silence still interrupts it',`(()=>{
 pressureSetup(52,2);const boss=battle.enemies.find(e=>e.endgameBoss);boss.hp=Math.floor(boss.max*.5);
 const prep=sanctuaryEnemyAction(boss);endgameResolveEnemyEffect(boss,prep,battle.party[0]);applyStatus(boss,'broken',battle.party[0],{force:true});processTurnStart(boss);
 if(!sanctuaryEnemyAction(boss).healing)return false;
 boss.encounterMechanic.sanctuaryRecovery=false;endgameResolveEnemyEffect(boss,prep,battle.party[0]);applyStatus(boss,'silence',battle.party[0],{force:true});processTurnStart(boss);
 return !boss.encounterMechanic.sanctuaryPending;
})()`);
check('All thirty formations gain 10% HP and direct damage; Stage 50 stays unchanged',`(()=>{
 const original=prepareEnemyForBattle;const prior=eval('('+original.toString().replace('1.1 * (source.levelHint >= 51 && source.levelHint <= 60 ? 1.1 : 1)','1.1')+')');
 const random=Math.random;Math.random=()=>.9;
 try {for(let stage=50;stage<=60;stage++){const info=hallBattleInfo(stage);for(let phase=0;phase<3;phase++){
 const keys=phase===0?info.enemies:info.waves[phase-1];pressureSetup(stage,phase);
 for(const source of hallEnemiesForStage(stage,keys,phase)){const now=original(source,'emberHallBattles'),old=prior(source,'emberHallBattles');
 if(Math.abs(now.max-old.max*(stage>=51?1.1:1))>1)return false;
 const action={kind:'magic',element:'Arcane',coefficient:1},hero=battle.party[0];battle.hallStage=stage;
 const damage=enemyDamageRoll(now,action,hero).damage;state.gameMode='story';const baseline=enemyDamageRoll(now,action,hero).damage;state.gameMode='hallBattles';
 if(Math.abs(damage-baseline*(stage>=51?1.1:1))>2)return false;
 if(!now.endgameBoss&&!applyStatus(now,'sleep',hero,{force:true}).applied)return false;
 }}}return true;}finally{Math.random=random;}
})()`);
