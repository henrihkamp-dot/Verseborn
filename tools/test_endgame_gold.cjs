const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const prefix=fs.readFileSync(path.join(__dirname,'test_combat.cjs'),'utf8').split("run('runQaChecks()');")[0].replace('sandbox.window = sandbox;','sandbox.fetch=async()=>({ok:false}); sandbox.window=sandbox;');
const {run}=new Function('require','__dirname',prefix+'\nreturn {run};')(require,__dirname);
assert.ok(run(`(()=>{
 state.gameMode='hallBattles';state.party=['Verseborn'];state.activeParty=state.party;state.hallBattles={};
 rollBattleLoot=()=>{state.gold+=100;return {gold:100,drops:[],gearDrops:[]};};guaranteeHallBattleGearReward=()=>{};updatePanels=()=>{};awardPartyXp=()=>{};
 let shown;showBattleResult=(type,entries)=>{shown=entries;};
 for(const stage of [1,50,51,52,53,54,55,56,57,58,59,60]){
  state.gold=0;const enemy={name:'Test',hp:0,level:1,xp:20};battle={party:[battleUnit('Verseborn')],enemies:[enemy],defeated:[enemy],hallStage:stage,hallBoss:true,waves:[],usedOnce:{}};mode='battle';
  winBattle('Test');const expected=(100+12+stage*4+40+stage*2)*(stage>=51?3:1);
  if(state.gold!==expected||shown.find(e=>e.kind==='gold').value!=='+'+expected)return false;
 }
 return true;
})()`));console.log('PASS actual victory: Stage 1/50 unchanged, all Stages 51-60 gold x3, wallet and displayed rewards agree');
