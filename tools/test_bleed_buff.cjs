const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const prefix=fs.readFileSync(path.join(__dirname,'test_combat.cjs'),'utf8').split("run('runQaChecks()');")[0].replace('sandbox.window = sandbox;','sandbox.fetch=async()=>({ok:false});sandbox.window=sandbox;');
const {run}=new Function('require','__dirname',prefix+';return {run};')(require,__dirname);
assert.ok(run(`(()=>{
 state.gameMode='hallBattles';state.developerTuning={};
 const source={name:'Source',stats:{str:100,mag:999},crit:.75,statuses:[{type:'strengthUp',value:.5,remaining:3}]};
 const target={name:'Target',hp:1000,max:1000,statuses:[]};
 if(dotValueFor('bleed',target,source,{scaling:'mag'})!==60)return false;
 applyStatus(target,'bleed',source,{force:true,duration:3});
 const bleed=statusOf(target,'bleed');if(bleed.value!==60||bleed.critChance!==.75)return false;
 source.stats.str=10;applyStatus(target,'bleed',source,{force:true});if(bleed.value!==60)return false;
 bleed.critChance=1;const before=target.hp;const result=processTurnStart(target);
 return target.hp===before-120&&result.notes.some(note=>note.includes('CRIT BLEED'));
})()`));
console.log('PASS Bleed uses 40% STR, includes buffs, preserves stronger damage and crits');
