const fs=require('node:fs'),assert=require('node:assert/strict');
const prefix=fs.readFileSync(__dirname+'/test_combat.cjs','utf8').split("run('runQaChecks()');")[0].replace('sandbox.window = sandbox;','sandbox.fetch=async()=>({ok:false});sandbox.window=sandbox;');
const {run}=new Function('require','__dirname',prefix+';return {run};')(require,__dirname);
assert.ok(run(`(()=>{
 state.party=['Verseborn'];state.activeParty=state.party;state.hallBattles={};
 rollBattleLoot=()=>({gold:12,drops:[],gearDrops:[]});guaranteeHallBattleGearReward=()=>{};updatePanels=()=>{};awardPartyXp=()=>{};
 let entries;showBattleResult=(kind,rewards)=>{entries=rewards;};
 for(const stage of [0,1,50,51,60])for(const resonance of [0,42,95,100]){
  state.gameMode=stage?'hallBattles':'story';state.resonance=resonance;
  const target={name:'Defeated test enemy',hp:0,level:1,xp:20};
  battle={party:[battleUnit('Verseborn')],enemies:[target],defeated:[target],hallStage:stage,hallBoss:!!stage,waves:[],usedOnce:{}};mode='battle';
  winBattle('Victory test');
  if(state.resonance!==resonance||entries.some(e=>e.kind==='resonance'||e.label==='Resonance')||!entries.some(e=>e.kind==='gold')||!entries.some(e=>e.kind==='xp'))return false;
 }
 return true;
})()`));
console.log('PASS 20 real victory paths: no Resonance bonus or reward row; gold and EXP retained');
