const fs=require('node:fs');
const assert=require('node:assert/strict');
const prefix=fs.readFileSync(__dirname+'/test_combat.cjs','utf8').split("run('runQaChecks()');")[0].replace('sandbox.window = sandbox;','sandbox.fetch=async()=>({ok:false});sandbox.window=sandbox;');
const {run}=new Function('require','__dirname',prefix+';return {run};')(require,__dirname);
function check(name,code){assert.ok(run(code),name);console.log('PASS',name);}
run(`function pressureSetup(stage,phase){state.gameMode='hallBattles';state.developerTuning={};const info=hallBattleInfo(stage);const keys=phase===0?info.enemies:info.waves[phase-1];battle={hallStage:stage,party:['Seerin','Kael','Sparky'].map(battleUnit),enemies:hallEnemiesForStage(stage,keys,phase).map(e=>prepareEnemyForBattle(e,'emberHallBattles')),enemyResonance:0};initializeEndgameFormation();return battle;}`);
check('All thirty formations have distinct stage pressure using existing statuses',`(()=>{
 const names=new Set();for(let stage=51;stage<=60;stage++){names.add(ENDGAME_STAGE_PRESSURE[stage].name);
 for(let phase=0;phase<3;phase++){pressureSetup(stage,phase);const u=battle.enemies[0];u.actionsTaken=1;const a=endgameFormationPressure(u);
 if(!a.allTargets||a.healing||a.coefficient>=1||!STATUS_DEFS[a.status.type]||a.status.duration!==2||!battle.mechanicAnnouncement.text.includes(ENDGAME_STAGE_PRESSURE[stage].name))return false;
 if(enemyTargetsForAction(u,a,battle.party[0]).length!==3)return false;
 u.actionsTaken=2;if(endgameFormationPressure(u))return false;
 }}return names.size===10;
})()`);
check('Physical Judgment survives Silence and Break; Broken Oath still opens',`(()=>{
 pressureSetup(58,2);const boss=battle.enemies.find(u=>u.endgameBoss);boss.actionsTaken=1;
 boss.statuses.push({type:'silence',remaining:3});endgameBossTurnStart(boss);
 const prep=chooseEnemyAction(boss);if(prep.endgameEffect!=='stagePrepare')return false;
 battle.party[0].holdTheLine=true;endgameResolveEnemyEffect(boss,prep,battle.party[2]);
 if(boss.encounterMechanic.stagePending.target!==battle.party[0])return false;
 endgameBossTurnStart(boss);if(chooseEnemyAction(boss).name!=='Chained Judgment')return false;
 boss.encounterMechanic.stageRecovery=false;endgameResolveEnemyEffect(boss,prep,battle.party[0]);endgameBossBroken(boss);
 return Boolean(boss.encounterMechanic.stagePending)&&statusOf(boss,'brokenOath');
})()`);
check('Magical preparations remain interruptible with Silence',`(()=>{
 pressureSetup(55,2);const boss=battle.enemies.find(u=>u.endgameBoss);boss.actionsTaken=1;
 endgameResolveEnemyEffect(boss,chooseEnemyAction(boss),battle.party[0]);boss.statuses.push({type:'silence',remaining:2});
 chooseEnemyAction(boss);return !boss.encounterMechanic.stagePending;
})()`);
check('Silence suppresses oath magic without suppressing physical actions',`(()=>{
 pressureSetup(58,2);const boss=battle.enemies.find(u=>u.endgameBoss);boss.actionsTaken=4;
 boss.statuses.push({type:'silence',remaining:3});boss.encounterMechanic.window=2;
 const action=endgameEnemyAction(boss);return action.kind==='melee'&&!action.allTargets;
})()`);
check('Renewal grants a dispellable blessing but retains interruption and recovery',`(()=>{
 pressureSetup(52,2);const boss=battle.enemies.find(u=>u.endgameBoss);boss.hp=Math.floor(boss.max/2);
 const prep=sanctuaryEnemyAction(boss);endgameResolveEnemyEffect(boss,prep,battle.party[0]);const heal=sanctuaryEnemyAction(boss);
 return heal.healing&&heal.buffs[0].type==='magicUp'&&heal.buffs[0].duration===2&&!sanctuaryEnemyAction(boss).healing;
})()`);
check('Guest empowerment is temporary and Archive replay pressure exceeds recording',`(()=>{
 pressureSetup(51,2);const host=battle.enemies.find(u=>u.endgameBoss);const guest=battle.enemies.find(u=>u!==host&&statusOf(u,'protectedGuest'));
 if(!guest||statusValue(guest,'damageUp')!==.2)return false;
 pressureSetup(60,2);const boss=battle.enemies.find(u=>u.endgameBoss);boss.actionsTaken=0;const record=endgameEnemyAction(boss);endgameResolveEnemyEffect(boss,record,battle.party[0]);
 const replay=endgameEnemyAction(boss);return replay.endgameEffect==='reproduce'&&replay.pressureCoefficient>record.pressureCoefficient;
})()`);
check('Real group-pressure resolution reaches all heroes despite Taunt',`(()=>{
 const choose=chooseEnemyAction,random=Math.random;Math.random=()=>.5;
 try {for(let stage=51;stage<=60;stage++){
 pressureSetup(stage,2);const u=battle.enemies.find(e=>!e.endgameBoss);u.actionsTaken=1;const action=endgameFormationPressure(u);
 battle.party[0].holdTheLine=true;const hp=battle.party.map(h=>h.hp);
 battle.turnQueue=[{side:'enemy',index:battle.enemies.indexOf(u),name:u.name}];battle.turnIndex=0;battle.round=1;battle.actionHistory=[];battle.meterEvents=[];battle.turnStartMessage='';mode='battle';
 chooseEnemyAction=()=>action;resolveEnemyTurn(battle.turnQueue[0],'');__impact();
 if(!battle.party.every((h,i)=>h.hp<hp[i]))return false;
 }return true;
 }finally{chooseEnemyAction=choose;Math.random=random;}
})()`);
