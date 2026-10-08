const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const prefix=fs.readFileSync(path.join(__dirname,'test_combat.cjs'),'utf8').split("run('runQaChecks()');")[0].replace('sandbox.window = sandbox;','sandbox.fetch=async()=>({ok:false}); sandbox.window=sandbox;');
const {run}=new Function('require','__dirname',prefix+'\nreturn {run};')(require,__dirname);
assert.ok(run(`(()=>{
 state.gameMode='hallBattles';state.developerTuning={};
 const stats=totals('Sparky');const skill=baseJobs.Sparky.skills.find(s=>s.name==='Memory Flare');const cost=skillMpCost('Sparky',skill);
 const original=prepareEnemyForBattle(hallEnemiesForStage(1)[0]);
 if(developerScale('party','damage',99)!==99)return false;
 state.developerTuning={party:{hp:100,mp:-100,damage:-100,cost:100},enemy:{hp:100,mp:100,cost:-100}};
 const boosted=prepareEnemyForBattle(hallEnemiesForStage(1)[0]);
 if(totals('Sparky').max!==stats.max*2||totals('Sparky').mp!==0||skillMpCost('Sparky',skill)!==cost*2)return false;
 if(boosted.max!==original.max*2||boosted.maxmp!==original.maxmp*2||enemyActionMpCost(boosted,{mpCost:20})!==0)return false;
 if(developerScale('party','damage',99)!==0)return false;
 state.gameMode='story';return totals('Sparky').max===stats.max&&skillMpCost('Sparky',skill)===cost;
})()`));
console.log('PASS Zero baseline, +/-100%, separate party/enemy settings, Story unchanged');
