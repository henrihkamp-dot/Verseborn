const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const output=path.resolve(__dirname,'../../../previews/emberhall-integrated-qa');fs.mkdirSync(output,{recursive:true});
const {chromium}=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.HALL_TEST_URL||'http://127.0.0.1:8744/');await page.waitForFunction(()=>runtimeAssetsReady&&emberHallWorld.ready);
 assert.equal(await page.evaluate(()=>mode),'title');assert.equal(await page.evaluate(()=>localStorage.length),0);
  await page.screenshot({path:path.join(output,'hall-world-title.png')});
 for(const key of ['ArrowDown','Enter','Enter','Enter'])await page.keyboard.press(key);
 assert.equal(await page.evaluate(()=>mode),'hallMap');assert.ok(await page.locator('[data-confirm-hall-start]').isVisible());
 await page.locator('[data-hall-start-recruit="Torren"]').click();await page.locator('[data-hall-start-recruit="Glimmer"]').click();await page.locator('[data-confirm-hall-start]').click();
 assert.equal(await page.evaluate(()=>activeRecruitScene.id),'ember-hall-start-verseborn');
 await page.waitForTimeout(300);await page.screenshot({path:path.join(output,'hall-world-opening.png')});
 await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>activeRecruitScene.id),'ember-hall-start-Torren');
 for(let i=0;i<12&&await page.evaluate(()=>mode!=='battle');i++)await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>mode),'battle');assert.equal(await page.evaluate(()=>battle.hallStage),1);
 await page.screenshot({path:path.join(output,'hall-world-battle.png')});
 await page.waitForTimeout(800);
 const fixtures=await page.evaluate(()=>{
  battle=null;activeRecruitScene=null;mode='walk';returnToHallAfterBattle();
  hallBattleProgress().startingWelcomeComplete=true;state.gold=111;hallBattleProgress().unlockedStage=31;saveGame(hallSaveKey(1));
  const a=JSON.parse(localStorage.getItem(hallSaveKey(1)));delete a.state.hallPosition;localStorage.setItem(hallSaveKey(1),JSON.stringify(a));
  const b=structuredClone(a);b.state.gold=222;b.state.hallBattles.unlockedStage=42;b.state.party=['Verseborn','Mira','Kael'];b.state.activeParty=[...b.state.party];
  localStorage.setItem(hallSaveKey(2),JSON.stringify(b));return {key1:hallSaveKey(1),value1:JSON.stringify(a)};
 });
 await page.reload();await page.waitForFunction(()=>runtimeAssetsReady&&emberHallWorld.ready);assert.equal(await page.evaluate(()=>mode),'title');
 assert.equal(await page.evaluate(k=>localStorage.getItem(k),fixtures.key1),fixtures.value1);
 for(const key of ['ArrowDown','Enter','ArrowDown','Enter','Enter'])await page.keyboard.press(key);
 assert.equal(await page.evaluate(()=>activeSaveSlot),2);assert.equal(await page.evaluate(()=>state.gold),222);assert.equal(await page.evaluate(()=>hallBattleProgress().unlockedStage),42);
 assert.equal(await page.evaluate(()=>mode),'walk');
 assert.deepEqual(await page.evaluate(()=>emberHallWorld.residents().map(a=>a.id).sort()),['Glimmer','Kael','Marla','Mira']);
 const initial=await page.evaluate(()=>({x:emberHallWorld.player.x,gridX:state.x,gridY:state.y}));
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(250);await page.keyboard.up('ArrowRight');await page.waitForTimeout(650);
 assert.ok(await page.evaluate(x=>emberHallWorld.player.x>x,initial.x));
 assert.deepEqual(await page.evaluate(()=>({gridX:state.x,gridY:state.y})),{gridX:initial.gridX,gridY:initial.gridY});
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem(hallSaveKey())).state.hallPosition);assert.ok(saved.x>initial.x);
 await page.reload();await page.waitForFunction(()=>runtimeAssetsReady&&emberHallWorld.ready);
 for(const key of ['ArrowDown','Enter','ArrowDown','Enter','Enter'])await page.keyboard.press(key);
 assert.ok(await page.evaluate(p=>Math.abs(emberHallWorld.player.x-p.x)<1,saved));
 await page.evaluate(()=>{emberHallWorld.trigger(emberHallWorld.actors.find(a=>a.id==='Marla'));finishTalk();});assert.equal(await page.evaluate(()=>mode),'shop');await page.evaluate(()=>closeVendor());
 const sceneIds=await page.evaluate(()=>RECRUIT_SCENES.map(s=>s.id));
 for(const id of sceneIds){
  const ok=await page.evaluate(id=>{state.party=['Verseborn',...HALL_RECRUITS];mode='walk';return playRecruitScene(RECRUIT_SCENES.find(s=>s.id===id),{replay:true});},id);assert.ok(ok);
  await page.waitForTimeout(250);await page.screenshot({path:path.join(output,'staging-'+id+'.png')});
  let line=0;
  while(await page.evaluate(()=>Boolean(activeRecruitScene)&&talkQueue.length>0)){
   await page.keyboard.press('Enter');await page.waitForTimeout(180);
   await page.screenshot({path:path.join(output,'staging-'+id+'-line-'+(++line)+'.png')});
   assert.ok(line<20,'Scene dialogue must terminate');
  }
  await page.evaluate(()=>{talkAfter=null;talkQueue=[];finishTalk();activeRecruitScene=null;mode='walk';});
 }
 await page.evaluate(()=>{state.gameMode='story';state.map='lantern';mode='walk';});await page.waitForTimeout(200);await page.screenshot({path:path.join(output,'hall-world-story.png')});
 assert.deepEqual(errors,[]);
 console.log('PASS title, opening, first battle, legacy save slots, movement, shops, every line of all 19 Hall scenes, story rendering; no browser errors.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
