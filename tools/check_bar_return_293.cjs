const fs=require('fs'),assert=require('assert/strict'),{chromium}=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),p=await b.newPage({viewport:{width:1920,height:1080}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:4211/game/?qa=duelselect');await p.waitForFunction(()=>runtimeAssetsReady&&window.BattleCommandUI&&state.gameMode==='hallBattles');await p.evaluate(()=>Promise.all([TinusCharacter.ready,FlameguardIdle.ready,HallEnemyIdle.ready,EmberRift.ready,TinusWhirlpool.ready]));await p.evaluate(()=>{hallBattleProgress().unlockedStage=60;state.party=Object.keys(baseJobs);state.activeParty=['Verseborn','Torren','Tinus'];state.party.forEach(id=>{progressFor(id).level=40;const t=totals(id);baseJobs[id].hp=t.max;baseJobs[id].mp=t.mp;});window.freezeBattle=()=>{battle={...battle,resolving:false};battle.turnQueue=[...battle.party.map(u=>({side:'party',id:u.id,name:u.name,agi:50})),...battle.enemies.map((u,index)=>({side:'enemy',index,name:u.name,agi:10}))];battle.turnIndex=0;effect=null;mode='battle';el.menu.classList.add('hidden');el.battle.classList.remove('hidden');syncResponsiveMode();renderBattle('');};});
await p.evaluate(async()=>{await HallBarSeating.ready;mode='walk';state.map='emberHallBattles';el.battle.classList.add('hidden');el.menu.classList.add('hidden');el.dialogue.classList.add('hidden');hallBattleProgress().openingComplete=true;state.party=state.party.filter(id=>id!=='Tinus');TinusRecruitment.progress().recruited=false;Object.assign(emberHallWorld.player,{x:451,y:185,walking:false});syncResponsiveMode();});await p.waitForTimeout(300);
for(const tinus of [false,true]){
 await p.evaluate(value=>{TinusRecruitment.progress().recruited=value;Object.assign(emberHallWorld.player,{x:451,y:185,walking:false});},tinus);
 assert.equal(await p.evaluate(()=>HallBarSeating.sit()),true);
 await p.waitForFunction(()=>mode==='talk'&&HallBarSeating.pose.frame===2,null,{timeout:8000});
 assert.equal(await p.evaluate(()=>el.speaker.textContent),tinus?'Tinus':'Marla');
 await p.evaluate(()=>skipTalk());
 assert.equal(await p.evaluate(()=>HallBarSeating.active),true,'Must animate departure');
 await p.waitForTimeout(1500);
 const pos=await p.evaluate(()=>({active:HallBarSeating.active,x:emberHallWorld.player.x,y:emberHallWorld.player.y}));
 assert.equal(pos.active,true);assert.ok(pos.x>451&&pos.x<489);assert.ok(pos.y>=185&&pos.y<=197);
 await p.waitForFunction(()=>!HallBarSeating.active,null,{timeout:6000});
 assert.deepEqual(await p.evaluate(()=>({x:emberHallWorld.player.x,y:emberHallWorld.player.y})),{x:451,y:185});
}
assert.deepEqual(errors,[]);await b.close();console.log('PASS seated Marla/Tinus conversations and animated departure, no browser errors');})().catch(e=>{console.error(e);process.exit(1)});