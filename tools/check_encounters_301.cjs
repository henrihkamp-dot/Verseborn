const fs=require('fs'),cp=require('child_process'),assert=require('assert/strict'),{chromium}=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const before=cp.execFileSync('git',['show','HEAD:public/game/game.js'],{encoding:'utf8'}).replace(/\r\n/g,'\n');
function block(s,name){const a=s.indexOf('function '+name+'('),b=s.indexOf('\nfunction ',a+1);assert.ok(a>=0,name);return s.slice(a,b<0?undefined:b).trim();}
const now=fs.readFileSync('public/game/game.js','utf8').replace(/\r\n/g,'\n');
for(const name of ['enemyDamageRoll','defendReduction','useDefend','totals','healingAmount','developerScale','enemyBalanceValue','enemyActionMpCost','addBreakProgress','brokenPhysicalDamageMultiplier','useSkill','chooseEnemyTarget','weightedFormationTarget','rank0Protector','endgameBossBroken','prepareEnemyForBattle','endgameEnemyAction','stageBossRhythmAction','receptionEnemyAction','sanctuaryEnemyAction'])assert.equal(block(now,name),block(before,name),name);
for(const file of ['enemy-tempo.js','status-system.js','formation-ui.js','hall-tactics.js','finisher-flow.js'])assert.equal(fs.readFileSync('public/game/'+file,'utf8').replace(/\r\n/g,'\n'),cp.execFileSync('git',['show','HEAD:public/game/'+file],{encoding:'utf8'}).replace(/\r\n/g,'\n'),file);
(async()=>{
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),p=await b.newPage({viewport:{width:1920,height:1080}}),errors=[];
try{
p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:4211/game/?qa=duelselect');await p.waitForFunction(()=>runtimeAssetsReady&&window.HallEncounters&&state.gameMode==='hallBattles');await p.evaluate(()=>Promise.all([TinusWhirlpool.ready,EmberRift.ready]));
await p.evaluate(old=>{window.oldHallEnemies=eval('('+old+')');window.freezeEnemy=true;const nativeResolve=resolveEnemyTurn;resolveEnemyTurn=(...args)=>freezeEnemy?undefined:nativeResolve(...args);state.party=Object.keys(baseJobs);state.activeParty=['Verseborn','Torren','Mira'];hallBattleProgress().unlockedStage=60;window.readyEncounterQA=()=>{mode='battle';battle.resolving=false;battle.turnQueue=[{side:'party',id:battle.party[0].id,name:battle.party[0].name}];battle.turnIndex=0;renderBattle('QA');};window.startEncounterQA=n=>{state.gameMode='hallBattles';mode='walk';startHallBattleStage(n);HallHub.beginStage();readyEncounterQA();return battle;};},block(before,'hallEnemiesForStage'));
const results=await p.evaluate(()=>{
 const r={},counts={1:[1],5:[2],10:[2],20:[2,2],21:[1,2],22:[3],24:[2],25:[2,2],26:[1],28:[2],29:[3],31:[3],33:[3],34:[3],35:[1,3],36:[3],40:[3,3],41:[2,3],42:[2,2],43:[2,2],44:[2,2,3],50:[1,1,1,1]};
 r.compositions=Object.entries(counts).every(([n,c])=>JSON.stringify([hallBattleInfo(+n).enemies,...hallBattleInfo(+n).waves].map(x=>x.length))===JSON.stringify(c));
 r.allKeys=HALL_BATTLE_BLUEPRINTS.length===60&&HALL_BATTLE_BLUEPRINTS.every(info=>[info.enemies,...info.waves].every(w=>w.length>0&&w.length<=3&&w.every(k=>HALL_ENEMY_LIBRARY[k])));
 const fields=u=>JSON.stringify({hp:u.hp,baseMax:u.baseMax,atk:u.atk,stats:u.stats,resistanceTier:u.resistanceTier,potency:u.combatPotency,breakThreshold:u.breakThreshold,endgameBoss:u.endgameBoss});
 r.finaleFrozen=[50,51,52,53,54,55,56,57,58,59,60].every(n=>[hallBattleInfo(n).enemies,...hallBattleInfo(n).waves].every((w,i)=>hallEnemiesForStage(n,w,i).every((u,j)=>fields(u)===fields(oldHallEnemies(n,w,i)[j]))));
 const hp=n=>hallEnemiesForStage(n,['ledger'])[0].baseMax,atk=n=>hallEnemiesForStage(n,['ledger'])[0].atk;
 r.smooth41=hp(41)/hp(40)<1.04&&atk(41)/atk(40)<1.05;r.smoothRamp=Array.from({length:9},(_,i)=>42+i).every(n=>hp(n)>=hp(n-1));
 r.phases=true;r.bespoke=true;
 for(const n of [10,20,21,35,40,41,44,50,51,55,58,60]){
  startEncounterQA(n);const groups=[hallBattleInfo(n).enemies,...hallBattleInfo(n).waves];
  for(let phase=1;phase<groups.length;phase++){
   battle.enemies.forEach(e=>e.hp=0);winBattle('QA formation defeated');
   if(!battle.phaseTransition){r.phases=false;break;}
   battle.phaseTransition.advance();readyEncounterQA();
   if(JSON.stringify(battle.enemies.map(u=>u.hallEnemyKey))!==JSON.stringify(groups[phase]))r.phases=false;
  }
  if(n>50&&!battle.enemies.some(e=>e.endgameBoss))r.bespoke=false;
  retreatBattle();
 }
 startEncounterQA(26);let boss=battle.enemies[0];boss.hp=Math.round(boss.max*.6);const scaleBefore=HallEncounters.soloScale(boss),plan=chooseEnemyAction(boss);r.summonChosen=plan.endgameEffect==='encounterSummon';endgameResolveEnemyEffect(boss,plan,boss);
 const add=battle.enemies[1];r.summonQueue=battle.enemies.length===2&&battle.turnQueue.some(t=>t.side==='enemy'&&battle.enemies[t.index]===add)&&add.max<boss.max*.2;
 r.supportRole=chooseEnemyAction(add).kind==='buff'&&chooseEnemyAction(add).target===boss;
 applyStatus(add,'silence',battle.party[0],{force:true,duration:2});r.addSilence=chooseEnemyAction(add).kind==='melee';
 r.returnsToFormation=scaleBefore>1.3&&HallEncounters.soloScale(boss)===1;
 boss.hp=boss.max;boss.hp=1;r.oneShot=HallEncounters.summon(boss,HallEncounters.summons.shadow).length===0;
 add.hp=0;renderBattle('QA add down');r.addDeathKeepsBoss=boss.hp>0&&battle.enemies.some(e=>e.hp>0);r.soloReturns=HallEncounters.soloScale(boss)>1.3;
 boss.hp=0;r.deadCannotSummon=HallEncounters.summon(boss,HallEncounters.summons.shadow).length===0;
 startEncounterQA(26);boss=battle.enemies[0];HallEncounters.summon(boss,HallEncounters.summons.shadow);const minion=battle.enemies[1];boss.hp=0;renderBattle('QA boss down');r.dismissOnBossDeath=minion.hp===0&&minion.dismissed;
 // A summoned minion is not recorded as XP/loot, and cannot survive a new phase.
 battle.waves=[{name:'QA next phase',enemies:hallEnemiesForStage(27,['grumm']) .map(u=>prepareEnemyForBattle(u))}];battle.phaseTotal=2;winBattle('QA summon boss down');r.noSummonRewards=battle.defeated.every(e=>!e.summonedBy);battle.phaseTransition.advance();readyEncounterQA();r.noSummonCarry=battle.enemies.length===1&&!battle.enemies[0].summonedBy;retreatBattle();
 // Story archetypes use actual map encounter sources.
 state.gameMode='story';state.map='reverieArchive';mode='walk';const spawn=maps.reverieArchive.spawns.find(s=>s.id==='archive-custodian');startBattle(spawn.name,spawn.enemies,undefined,spawn);readyEncounterQA();boss=battle.enemies[0];boss.actionsTaken=1;r.archiveWaits=chooseEnemyAction(boss).endgameEffect!=='encounterSummon';boss.actionsTaken=2;const recall=chooseEnemyAction(boss);endgameResolveEnemyEffect(boss,recall,boss);r.archiveTwoAdds=battle.enemies.length===3&&battle.enemies.slice(1).every(e=>chooseEnemyAction(e).target===boss);r.cap=HallEncounters.summon(boss,HallEncounters.summons.archive).length===0;
 boss.hp=0;renderBattle('QA owner dead');r.archiveDismiss=battle.enemies.slice(1).every(e=>e.hp===0);readyEncounterQA();retreatBattle();
 startEncounterQA(5);const normalSupport=battle.enemies[1];battle.enemies[0].hp=0;renderBattle('QA normal boss down');r.normalSupportRemains=normalSupport.hp>0&&!normalSupport.dismissed;retreatBattle();
 r.foremanSupport=maps.ashDock.spawns.find(s=>s.id==='dock-foreman').enemies.map(e=>e.name).join('|')==='Dock Foreman|Brokk';
 return r;
});
for(const[k,v]of Object.entries(results))assert.equal(v,true,k);
// Resolve a real summon through the asynchronous action engine, with no pressure hit.
await p.evaluate(()=>startEncounterQA(26));await p.waitForTimeout(800);
await p.evaluate(()=>{const boss=battle.enemies[0];boss.hp=1;window.preSummonHP=battle.party.map(u=>u.hp);battle.turnQueue=[{side:'enemy',index:0,name:boss.name}];battle.turnIndex=0;battle.resolving=true;window.realSummonLog=null;window.finishTurn=log=>{window.realSummonLog=completeBattleAction(log);battle.resolving=false;};freezeEnemy=false;resolveEnemyTurn(currentTurn(),'');freezeEnemy=true;});
await p.waitForFunction(()=>window.realSummonLog!==null);assert.equal(await p.evaluate(()=>battle.enemies.length===2&&battle.party.every((u,i)=>u.hp===preSummonHP[i])),true,'actual summon must not hit party');
// Capture real rendering and verify cards and sprite hit bounds stay on the field.
for(const [stage,label]of [[1,'beginner'],[35,'king'],[50,'wyrm']]){
 await p.evaluate(n=>startEncounterQA(n),stage);await p.waitForTimeout(500);
 const bounds=await p.evaluate(()=>({width:LOGICAL_WIDTH,height:BATTLE_ARENA_HEIGHT,unit:BattleCommandUI.spriteBounds.find(x=>x.name===battle.enemies[0].name),pos:enemyBattlePosition(0)}));assert.ok(bounds.unit&&bounds.unit.height>0,label);assert.ok(bounds.pos[1]+bounds.unit.dy-bounds.unit.height>=15,label+' clips timeline');
 await p.screenshot({path:'../../outputs/encounter-301-'+label+'.png'});
}
await p.evaluate(()=>{startEncounterQA(26);const boss=battle.enemies[0];boss.hp=Math.floor(boss.max*.6);endgameResolveEnemyEffect(boss,chooseEnemyAction(boss),boss);readyEncounterQA();});await p.waitForTimeout(1000);await p.screenshot({path:'../../outputs/encounter-301-summon.png'});
// Click targeting uses the enlarged rendered silhouette, not the previous formation slot.
await p.evaluate(()=>{startEncounterQA(35);Math.random=()=>.5;window.kingHP=battle.enemies[0].hp;});await p.waitForTimeout(400);
await p.locator('.bc-action').filter({hasText:'Attack'}).first().click();
const hit=await p.evaluate(()=>{const u=battle.enemies[0],b=BattleCommandUI.boundsFor(u),[x,y]=enemyBattlePosition(0),r=canvas.getBoundingClientRect();return {x:r.left+(x+b.dx)/LOGICAL_WIDTH*r.width,y:r.top+(y+b.dy-b.height*.5)/LOGICAL_HEIGHT*r.height};});await p.mouse.dblclick(hit.x,hit.y);await p.waitForFunction(()=>battle.enemies[0].hp<kingHP,null,{timeout:8000});
assert.deepEqual(errors,[]);fs.writeFileSync('../../outputs/encounter-301-tests.json',JSON.stringify(results,null,2));console.log('PASS encounter compositions, phase transitions, unchanged mechanics/finale, summon lifecycle and solo rendering',results);
}finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
