const fs = require('node:fs');
const assert = require('node:assert/strict');
const prefix = fs.readFileSync(__dirname+'/test_combat.cjs','utf8').split("run('runQaChecks()');")[0].replace('sandbox.window = sandbox;', 'sandbox.fetch=async()=>({ok:false});sandbox.window=sandbox;');
const {run} = new Function('require','__dirname',prefix+';return {run};')(require,__dirname);
function check(name, code) { assert.ok(run(code), name); console.log('PASS', name); }
check('Temporary buffs are additive, capped; Shadow Up is element-specific', `(() => {
 const u=battleUnit('Mira');u.statuses=[]; const clean=outgoingDamageMultiplier(u,'magic',null,'Shadow');
 u.statuses=[{type:'damageUp',value:.234},{type:'magicUp',value:.234},{type:'shadowUp',value:.3}];
 return Math.abs(outgoingDamageMultiplier(u,'magic',null,'Shadow')/clean-1.5)<1e-9 && Math.abs(outgoingDamageMultiplier(u,'magic',null,'Tech')/clean-1.468)<1e-9;
})()`);
check('Drone budgets ignore triggering crit, weakness, AoE and multi-hit magnitude', `(() => {
 const old=typedTalentValue;typedTalentValue=(id,type)=>({dronePower:.5,mechCarrier:.25,droneSwarm:.5,systemCrash:.3}[type]||0);
 try {const u=battleUnit('Torren');u.statuses=[{type:'combatDrone',value:.4,source:{id:'Glimmer'}}];
 const probe=(amount,count)=>{battle={party:[u],enemies:Array.from({length:3},()=>prepareEnemyForBattle(enemy('Test',99999,1,'Tech','#555',1))),actionHistory:[],meterEvents:[]};combatDroneFollowUp(u,amount,count);return battle.meterEvents.reduce((n,e)=>n+e.amount,0);};
 const a=probe(100,1),b=probe(999999,3);return a===b && a<=Math.floor(totals('Glimmer').mag*1.25) && probe(0,3)===0;
 } finally {typedTalentValue=old;}
})()`);
check('Holy follow-up keeps 10% with a source-MAG budget across AoE/multi-hit', `(() => {
 const oldRandom=Math.random;Math.random=()=>.5;
 try {const u=battleUnit('Sparky');u.mp=999;u.statuses=[{type:'holyFollowUp',value:.1,remaining:1,source:{id:'Seerin'}}];
 const enemies=Array.from({length:3},()=>prepareEnemyForBattle(enemy('Test',999999,1,'Ancient Fire','#555',1)));
 battle={party:[u],enemies,round:1,name:'Test phase',turnIndex:0,turnQueue:[{side:'party',id:u.id,name:u.name}],usedOnce:{},extraTurns:0,resolving:false,actionHistory:[],meterEvents:[]};mode='battle';
 const sk={...battleSkills(u.id,u).find(s=>s.name==='Memory Flare'),coefficient:100,multiHit:3};useSkill(u,sk,enemies[0]);__impact();
 const events=battle.actionHistory.flatMap(a=>a.events).filter(e=>e.type==='Holy Fire');
 return events.length===3 && events.reduce((n,e)=>n+e.amount,0)<=Math.floor(totals('Seerin').mag*.5) && !statusOf(u,'holyFollowUp');
 } finally {Math.random=oldRandom;}
})()`);
check('Leeching shares the Vampiric ceiling and preserves modest sustain', `(() => {
 const old=combatSustainRate;combatSustainRate=()=>.1;
 try {const u={id:'Torren',hp:1,max:1000,mp:0,maxmp:100,statuses:[]};
 const capped=resolveActionSustain(u,{},99999,0,3,110).hp;u.hp=1;
 return capped===10 && resolveActionSustain(u,{},150,0,3).hp===5;
 } finally {combatSustainRate=old;}
})()`);
check('Skipped turns do not repeat the previous attack and retain their own DoT events', `(() => {
 const old=processTurnStart,render=renderBattle;renderBattle=()=>{};
 try {const u=battleUnit('Torren');battle={name:'Phase 2',round:2,party:[u],enemies:[prepareEnemyForBattle(enemy('Test',99999,1,'None','#555',1))],turnQueue:[{side:'party',id:u.id,name:u.name}],turnIndex:0,actionHistory:[],meterEvents:[]};
 processTurnStart=unit=>{addBattleFloater(unit,12,{damageType:'Burn'});return {skip:true,notes:['Sleeping.']};};
 runCurrentTurn('Glimmer attacks for 9999.');const a=battle.actionHistory[0];
 return a.actor===u.name && a.phase==='Phase 2' && !a.message.includes('9999') && a.events.length===1;
 } finally {processTurnStart=old;renderBattle=render;}
})()`);
check('Turn-start lethal DoT is recorded before a phase transition', `(() => {
 const old=processTurnStart,render=renderBattle;renderBattle=()=>{};
 try {const u=battleUnit('Torren'),e=prepareEnemyForBattle(enemy('Test',10,1,'None','#555',1));battle={name:'Phase 3',round:2,party:[u],enemies:[e],turnQueue:[{side:'enemy',index:0,name:e.name}],turnIndex:0,actionHistory:[],meterEvents:[]};
 processTurnStart=unit=>{unit.hp=0;addBattleFloater(unit,10,{damageType:'Burn'});return {skip:true,notes:['Burn defeats Test.']};};runCurrentTurn('Old action');
 return battle.actionHistory.length===1 && battle.actionHistory[0].actor===e.name && battle.actionHistory[0].events.length===1;
 } finally {processTurnStart=old;renderBattle=render;}
})()`);
check('Post-action clinic events belong to the current actor, not the next one', `(() => {
 const old=finishMechTalentAction,next=runCurrentTurn;
 try {const u=battleUnit('Glimmer');battle={name:'Phase 1',round:1,party:[u],enemies:[],turnQueue:[{side:'party',id:u.id,name:u.name}],turnIndex:0,actionHistory:[],meterEvents:[]};
 recordDamageMeterAction('Glimmer attacks.');finishMechTalentAction=unit=>{addBattleFloater(unit,20,{kind:'heal'});return ' Clinic heals 20 HP.';};runCurrentTurn=()=>{};
 finishTurn('Glimmer attacks.');return battle.meterEvents.length===0 && battle.actionHistory.length===1 && battle.actionHistory[0].events[0].amount===20 && battle.actionHistory[0].message.includes('Clinic');
 } finally {finishMechTalentAction=old;runCurrentTurn=next;}
})()`);
