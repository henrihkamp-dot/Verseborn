const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const prefix = fs.readFileSync(path.join(__dirname, 'test_combat.cjs'), 'utf8').split("run('runQaChecks()');")[0]
  .replace('sandbox.window = sandbox;', 'sandbox.fetch=async()=>({ok:false});sandbox.window = sandbox;');
const { run } = new Function('require', '__dirname', prefix + ';return {run};')(require, __dirname);
function check(name, code) { assert.ok(run(code), name); console.log('PASS', name); }
check('Built-in QA', `runQaChecks(); JSON.parse(document.body.getAttribute('data-qa-result')).passed===70`);
check('Early MP costs preserved; late AoE grows without gear dependence', `(() => {
 state.gameMode='hallBattles'; state.developerTuning={}; progressFor('Sparky').level=16;
 const sk=battleSkills('Sparky').find(s=>s.name==='Memory Flare'); const early=skillMpCost('Sparky',sk);
 progressFor('Sparky').level=40; const late=skillMpCost('Sparky',sk);
 const old=baseJobs.Sparky.stats.mag; baseJobs.Sparky.stats.mag+=100;
 const unchanged=skillMpCost('Sparky',sk)===late; baseJobs.Sparky.stats.mag=old;
 return early===7 && late===22 && unchanged;
})()`);
check('Siphoning cannot refund more than 30% and Ultimates refund no MP', `(() => {
 const before=combatSustainRate; combatSustainRate=()=>.15;
 try {const u={id:'Sparky',hp:1,max:100,mp:0,maxmp:100};
 const a=resolveActionSustain(u,{name:'Test'},999,20,3);
 const b=resolveActionSustain(u,{anim:'ultimate'},999,0,3);
 return a.mp===6 && a.hp===8 && b.mp===0;
 } finally {combatSustainRate=before;}
})()`);
check('AoE Leech uses average damage rather than the sum', `(() => {
 const before=combatSustainRate; combatSustainRate=()=>.1;
 try {const u={id:'Torren',hp:1,max:1000,mp:0,maxmp:100};
 return resolveActionSustain(u,{},150,0,3).hp===5;
 } finally {combatSustainRate=before;}
})()`);
check('All 60 encounters and phase rosters have finite combat stats', `Array.from({length:60},(_,i)=>i+1).every(stage=>[hallBattleInfo(stage).enemies,...hallBattleInfo(stage).waves].every((keys,phase)=>hallEnemiesForStage(stage,keys,phase).every(e=>{const u=prepareEnemyForBattle(e,'emberHallBattles'); return u.max>0 && Object.values(u.stats).every(n=>Number.isFinite(n)&&n>0);})))`);
check('Late supports gain MAG, speed and HP while early stats stay unchanged', `(() => {
 const late=prepareEnemyForBattle(hallEnemiesForStage(60)[1],'emberHallBattles');
 const early=prepareEnemyForBattle(hallEnemiesForStage(18)[0],'emberHallBattles');
 return late.stats.mag>=100 && late.stats.agi>=80 && late.max>=2000 && early.stats.mag<50;
})()`);
check('Maelin prioritizes injured formation and Silence stops healing', `(() => {
 const e=prepareEnemyForBattle(hallEnemiesForStage(52,hallBattleInfo(52).waves[1],2)[0],'emberHallBattles');
 const u=battleUnit('Sparky'); battle={party:[u],enemies:[e],enemyResonance:0}; e.hp=e.max/2;
 const heal=endgameEnemyAction(e); e.statuses=[{type:'silence',remaining:2}]; const controlled=endgameEnemyAction(e);
 return heal.healing && !controlled.healing;
})()`);
check('Existing Stage 50 progress unlocks 51 without losing clear history', `(() => {
 const p=normalizeHallBattleProgress({unlockedStage:50,clearedStages:Array.from({length:50},(_,i)=>i+1)});
 return p.unlockedStage===51 && p.clearedStages.length===50 && p.artifactShopUnlocks.length===0;
})()`);
check('Actual AoE resolution caps Resonance and Ultimate cannot refill it', `(() => {
 const oldRandom=Math.random; Math.random=()=>.5;
 try {const u=battleUnit('Sparky'); u.mp=999; const enemies=Array.from({length:3},()=>prepareEnemyForBattle(enemy('Test',99999,1,'Ancient Fire','#555',1)));
 battle={party:[u],enemies,round:1,turnIndex:0,turnQueue:[{side:'party',id:u.id}],usedOnce:{},extraTurns:0,resolving:false}; mode='battle'; state.resonance=0;
 useSkill(u,battleSkills(u.id,u).find(s=>s.name==='Memory Flare'),enemies[0]); __impact(); const capped=state.resonance===18;
 state.resonance=100; battle.resolving=false;
 useSkill(u,battleSkills(u.id,u).find(s=>s.anim==='ultimate'),enemies[0]); __impact();
 return capped && state.resonance===0;
 } finally {Math.random=oldRandom;}
})()`);
check('Opening protection and shields exist before the first player action', `(() => {
 const u=battleUnit('Sparky');
 for(const stage of [51,58]) {const enemies=hallEnemiesForStage(stage,hallBattleInfo(stage).waves[1],2).map(e=>prepareEnemyForBattle(e,'emberHallBattles')); battle={party:[u],enemies,enemyResonance:0}; initializeEndgameFormation(); if(!enemies.some(e=>statusOf(e,stage===51?'protectedGuest':'oathguard'))) return false;}
 return true;
})()`);
check('Boss Poison cap includes its critical multiplier', `(() => {
 const oldRandom=Math.random; Math.random=()=>.5;
 try {battle={party:[],enemies:[]};const u={name:'Test',hp:1000,max:1000,resistanceTier:'boss',statuses:[{type:'poison',value:25,remaining:3,critChance:1,critMultiplier:2,source:{name:'Test'}}]}; processTurnStart(u);return u.hp===970;
 } finally {Math.random=oldRandom;}
})()`);
