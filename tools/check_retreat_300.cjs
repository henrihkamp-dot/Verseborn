const assert=require('assert/strict'),{chromium}=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
 try{
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4211/game/?qa=duelselect');
 await page.waitForFunction(()=>runtimeAssetsReady&&window.TinusWhirlpool&&state.gameMode==='hallBattles');
 await page.evaluate(()=>Promise.all([TinusWhirlpool.ready,EmberRift.ready]));
 await page.evaluate(()=>{
   state.party=Object.keys(baseJobs);state.activeParty=['Verseborn','Torren','Mira'];hallBattleProgress().unlockedStage=60;
   window.readyRetreat=()=>{mode='battle';battle.resolving=false;battle.turnQueue=[{side:'party',id:battle.party[0].id,name:battle.party[0].name}];battle.turnIndex=0;renderBattle('QA');};
   window.protectedState=()=>JSON.stringify({gold:state.gold,gear:state.ownedGear,hall:hallBattleProgress(),rift:EmberRift.progress(),whirlpool:TinusWhirlpool.progress(),xp:state.progression});
   window.expectExit=before=>({ended:battle===null,hidden:el.battle.classList.contains('hidden'),rewardUnchanged:protectedState()===before,result:recentDamageMeters().at(-1)?.result});
   mode='walk';startHallBattleStage(1);HallHub.beginStage();readyRetreat();
 });
 assert.equal(await page.locator('.bc-retreat-button').isVisible(),true);
 assert.equal(await page.evaluate(()=>{battle.resolving=true;renderBattle('');return retreatBattle()===false&&!!battle&&document.querySelector('.bc-retreat-button').disabled;}),true);
 await page.evaluate(()=>{battle.resolving=false;window.beforeRetreat=protectedState();renderBattle('');});
 await page.screenshot({path:'../../outputs/retreat-300.png'});
 await page.locator('.bc-retreat-button').click();
 let result=await page.evaluate(()=>expectExit(beforeRetreat));assert.deepEqual(result,{ended:true,hidden:true,rewardUnchanged:true,result:'retreat'});
 const modes=await page.evaluate(()=>{
   const results={};
   mode='hallMap';HallHub.startSparring(state.activeParty,'Verseborn');readyRetreat();let before=protectedState(),food=JSON.stringify(state.inventory);state.inventory['QA meal']=7;retreatBattle();results.shadow={...expectExit(before),restored:JSON.stringify(state.inventory)===food};
   mode='walk';state.map='emberHallBattles';TinusWhirlpool.start(1);readyRetreat();before=protectedState();food=JSON.stringify(state.inventory);state.inventory['QA meal']=9;retreatBattle();results.whirlpool={...expectExit(before),restored:JSON.stringify(state.inventory)===food};
   EmberRift.progress().unlocked=true;state.map='emberRiftRoom';mode='walk';
   // Use the mode's own map constant through entering its room.
   EmberRift.enterRoom();mode='walk';EmberRift.startEncounter(1);readyRetreat();before=protectedState();retreatBattle();results.rift=expectExit(before);
   // Story fights retain spent resources and remain retryable, without firing victory events.
   mode='walk';state.gameMode='story';startBattle('Retreat QA',[enemy('Rat',50,5,'Earth','#fff',1)],undefined,null,[],{});readyRetreat();battle.party[0].hp=12;battle.party[0].mp=3;battle.retryEvent='qa-retreat';state.flags['qa-retreat']=true;before=protectedState();const id=battle.party[0].id;retreatBattle();results.story={...expectExit(before),vitals:baseJobs[id].hp===12&&baseJobs[id].mp===3,retry:!state.flags['qa-retreat']};
   return results;
 });
 for(const [name,r]of Object.entries(modes)){assert.equal(r.ended,true,name);assert.equal(r.hidden,true,name);assert.equal(r.rewardUnchanged,true,name);assert.equal(r.result,'retreat',name);if('restored'in r)assert.equal(r.restored,true,name);if('vitals'in r){assert.equal(r.vitals,true);assert.equal(r.retry,true);}}
 assert.deepEqual(errors,[]);console.log('PASS retreat UI, resolution guard, no rewards, Shadow/Whirlpool restoration, Rift return and story retry',modes);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
