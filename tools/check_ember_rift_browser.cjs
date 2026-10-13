const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],missing=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()===404&&!r.url().includes('favicon'))missing.push(r.url());});
await page.goto('http://127.0.0.1:8749/');await page.waitForFunction(()=>window.EmberRift?.assetsReady&&window.emberHallWorld?.ready,{},{timeout:120000});
await page.evaluate(()=>{startTitleGame(false);state.gameMode='hallBattles';state.party=['Verseborn','Mira','Seerin'];state.activeParty=[...state.party];state.party.forEach(id=>progressFor(id).level=40);state.hallBattles={clearedStages:Array.from({length:60},(_,i)=>i+1)};state.map='emberHallBattles';mode='walk';el.dialogue.classList.add('hidden');emberHallWorld.resetNavigation({x:315,y:56,facing:1});});
await page.evaluate(()=>{state.hallBattles={clearedStages:Array.from({length:59},(_,i)=>i+1)};});await page.keyboard.press('e');assert.equal(await page.evaluate(()=>state.map==='emberHallBattles'&&!EmberRift.progress().unlocked),true);await page.screenshot({path:path.resolve(__dirname,'../../../rift-door-sealed-qa.png')});await page.evaluate(()=>recordHallBattleClear(60));await page.waitForTimeout(2000);await page.screenshot({path:path.resolve(__dirname,'../../../rift-door-qa.png')});
assert.equal(await page.evaluate(()=>EmberRift.progress().doorSeen),true);
await page.keyboard.press('e');assert.equal(await page.evaluate(()=>state.map),'emberRiftVault');
await page.waitForTimeout(300);await page.screenshot({path:path.resolve(__dirname,'../../../rift-room-qa.png')});
assert.equal(await page.evaluate(()=>EmberRift.navigate(EmberRift.portal.approach.x,EmberRift.portal.approach.y,EmberRift.portal)),true);
await page.waitForFunction(()=>mode==='hallMap',{},{timeout:10000});assert.equal(await page.locator('[data-rift-select]').count(),10);
await page.screenshot({path:path.resolve(__dirname,'../../../rift-selection-qa.png')});
await page.locator('[data-rift-start]').click();assert.equal(await page.evaluate(()=>battle.riftEncounter),1);
await page.waitForTimeout(400);await page.screenshot({path:path.resolve(__dirname,'../../../rift-battle-qa.png')});
await page.evaluate(()=>{runCurrentTurn=()=>{};battle.enemies.forEach(e=>e.hp=0);winBattle('Rift test clear');});
assert.equal(await page.evaluate(()=>battle.enemies[0].riftKey),'brute');
await page.evaluate(()=>{battle.enemies.forEach(e=>e.hp=0);winBattle('Rift test clear');});
assert.equal(await page.evaluate(()=>EmberRift.progress().cleared.includes(1)),true);
await page.locator('#battleResultContinue').click();assert.equal(await page.evaluate(()=>state.map),'emberRiftVault');
await page.evaluate(()=>{saveGame(hallSaveKey());state.hallBattles={};loadGame(hallSaveKey());});await page.waitForTimeout(200);
assert.equal(await page.evaluate(()=>state.map==='emberRiftVault'&&EmberRift.available(2)&&EmberRift.progress().unlocked),true);
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>EmberRift.openSelection());await page.screenshot({path:path.resolve(__dirname,'../../../rift-mobile-qa.png')});
assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log(JSON.stringify({door:true,room:true,walkingToPortal:true,tenCards:true,phases:true,reward:true,saveReload:true,mobile:true,errors,missing}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});



