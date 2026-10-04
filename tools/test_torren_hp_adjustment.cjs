const fs=require('node:fs');
const assert=require('node:assert/strict');
const prefix=fs.readFileSync(__dirname+'/test_combat.cjs','utf8').split("run('runQaChecks()');")[0].replace('sandbox.window = sandbox;','sandbox.fetch=async()=>({ok:false});sandbox.window=sandbox;');
const {run}=new Function('require','__dirname',prefix+';return {run};')(require,__dirname);
function check(name,code){assert.ok(run(code),name);console.log('PASS',name);}
check('All Torren damage skills use STR + 10% STAM', `(()=>{
 const stats={str:100,stam:200,agi:999,mag:50,echo:0};
 return battleSkills('Torren').filter(sk=>skillTargetsEnemies(sk)&&skillScaling(sk)==='str').every(sk=>skillOffensiveStat('Torren',sk,{id:'Torren'},stats)===120&&skillScalingLabel('Torren',sk)==='STR + 0.1 STAM');
})()`);
check('Seerin hybrid scaling stays unchanged', `(()=>{const sk=battleSkills('Seerin').find(s=>s.basicAttack);return skillOffensiveStat('Seerin',sk,{id:'Seerin'},{str:100,mag:200,stam:999,agi:0})===200;})()`);
check('Hall HP bonus starts at 30, includes every phase, and leaves other stats unchanged', `(()=>{
 state.developerTuning={};state.ngPlus=0;
 return [29,30,40,50,51,60].every(stage=>{
 const info=hallBattleInfo(stage);
 return [info.enemies,...info.waves].every((keys,phase)=>hallEnemiesForStage(stage,keys,phase).every(source=>{
 const actual=prepareEnemyForBattle(source,'emberHallBattles');
 const level=Math.min(40,stage);const late=Math.max(0,stage-40);
 const expected=Math.round(Math.max(source.baseMax||source.max,late*80)*(1+(level-1)*.012)*(source.endgameBoss?1+late*.0075:1)*(stage>=30?1.1:1));
 return actual.max===expected&&actual.hp===actual.max;
 }));
 });
})()`);
check('Story HP ignores the Hall bonus even at level hint 40', `(()=>{
 const source=hallEnemiesForStage(40)[0];const actual=prepareEnemyForBattle(source,'ashLane');
 return actual.max===Math.round((source.baseMax||source.max)*(1+39*.012));
})()`);
