const fs=require('fs'),assert=require('assert/strict'),{chromium}=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[],missing=[];
 try{
  page.on('pageerror',e=>errors.push(e.stack));page.on('response',r=>{if(r.status()>=400&&!/favicon/.test(r.url()))missing.push(r.url());});
  await page.goto('http://127.0.0.1:4211/game/?qa=duelselect');await page.waitForFunction(()=>runtimeAssetsReady&&window.FlameguardWelcomes&&emberHallWorld.ready);await page.evaluate(()=>FlameguardWelcomes.ready);
  await page.evaluate(()=>{CutsceneAutoplay.set(false);mode='walk';el.menu.classList.add('hidden');state.party=Object.keys(baseJobs);});
  const shots={Mira:[10,21,28],Torren:[3,17,26],Seerin:[1,13,29],Kael:[12,21,27],Sparky:[7,12,24]};
  for(const id of Object.keys(shots)){
   const snapshot=()=>JSON.stringify({party:state.party,activeParty:state.activeParty,map:state.map,x:state.x,y:state.y,hallPosition:state.hallPosition,vitals:Object.values(baseJobs).map(h=>[h.hp,h.mp]),cleared:hallBattleProgress().clearedStages,actors:emberHallWorld.actors.map(a=>a.id),history:loadRecruitSceneHistory()});
   const saved=await page.evaluate(snapshot);
   await page.evaluate(id=>playRecruitScene(RECRUIT_SCENES.find(s=>s.recruit===id&&s.variant==='welcome'),{replay:true}),id);await page.waitForFunction(()=>FlameguardWelcomes.current);
   const length=await page.evaluate(()=>FlameguardWelcomes.current.length);assert.ok(length>=28,id+' full script');
   for(let index=0;index<length;index++){
    await page.evaluate(i=>FlameguardWelcomes.preview(i),index);
    assert.equal(await page.evaluate(()=>document.querySelector('.welcome-film').hidden),false);
    if(shots[id].includes(index)){await page.waitForTimeout(150);await page.screenshot({path:'../../outputs/welcome-303-'+id.toLowerCase()+'-'+index+'.png'});}
   }
   await page.evaluate(()=>FlameguardWelcomes.finish());assert.equal(await page.evaluate(()=>mode),'walk');
   assert.equal(await page.evaluate(snapshot),saved,id+' replay changed persistent state');
  }
  await page.evaluate(()=>{state.party=['Verseborn','Sparky'];mode='walk';});
  await page.evaluate(()=>FlameguardWelcomes.start('Sparky',{replay:true}));assert.equal(await page.evaluate(()=>FlameguardWelcomes.current.full),false);
  const short=await page.evaluate(()=>FlameguardWelcomes.current);assert.ok(short.length<12);assert.deepEqual(short.cast,['Sparky','Verseborn']);await page.evaluate(()=>FlameguardWelcomes.finish());
  // Optional lines never bring an unrecruited member into the room.
  for(const id of ['Mira','Torren','Seerin','Kael']){
   await page.evaluate(id=>{state.party=['Verseborn',id];mode='walk';return FlameguardWelcomes.start(id,{replay:true});},id);
   const result=await page.evaluate(()=>{let cast=new Set();const count=FlameguardWelcomes.current.length;for(let i=0;i<count;i++){FlameguardWelcomes.preview(i);FlameguardWelcomes.current.cast.forEach(id=>cast.add(id));}return[...cast];});
   for(const member of ['Mira','Torren','Seerin','Kael','Glimmer','Sparky'])if(member!==id)assert.ok(!result.includes(member),id+' summoned unavailable '+member);
   await page.evaluate(()=>FlameguardWelcomes.finish());
  }
  // Manual mode waits, confirmation advances, skip restores the menu and callback.
  await page.evaluate(()=>{state.party=['Verseborn','Mira'];mode='menu';menuTab='system';renderMenu();el.menu.classList.remove('hidden');window.qaAfter=0;return FlameguardWelcomes.start('Mira',{replay:true,after:()=>qaAfter++});});
  await page.evaluate(()=>FlameguardWelcomes.preview(2));const index=await page.evaluate(()=>FlameguardWelcomes.current.index);await page.waitForTimeout(3500);assert.equal(await page.evaluate(()=>FlameguardWelcomes.current.index),index);
  await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>FlameguardWelcomes.current.index),index+1);
  await page.locator('.welcome-skip').click();assert.equal(await page.evaluate(()=>mode),'menu');assert.equal(await page.evaluate(()=>qaAfter),1);assert.equal(await page.locator('#menu').isVisible(),true);
  // New/starting recruitment records its matching welcome, never a guest recruitment.
  await page.evaluate(()=>{mode='walk';state.party=['Verseborn','Torren'];return playRecruitScene(hallStartingWelcomeScenes(['Torren','Mira']).find(s=>s.recruit==='Torren'),{replay:true});});await page.waitForFunction(()=>FlameguardWelcomes.current);await page.evaluate(()=>FlameguardWelcomes.finish());
  assert.equal(await page.evaluate(()=>loadRecruitSceneHistory().seen.includes('torren-welcome')),true);
  await page.evaluate(()=>{state.party=['Verseborn','Mira','Seerin','Sparky'];hallBattleProgress().sparkyDuoWelcome=false;mode='walk';return FlameguardWelcomes.start('Seerin');});await page.evaluate(()=>FlameguardWelcomes.finish());await page.waitForFunction(()=>FlameguardWelcomes.current?.id==='Sparky');assert.equal(await page.evaluate(()=>FlameguardWelcomes.current.full),true);await page.evaluate(()=>FlameguardWelcomes.finish());assert.equal(await page.evaluate(()=>hallBattleProgress().sparkyDuoWelcome),true);
  // Regular dialogue uses the corrected display name, preserving legacy IDs.
  await page.evaluate(()=>showTalk([['Marla','Hello.']],{portraits:['Marla']}));assert.equal(await page.locator('#speaker').innerText(),'Marli');await page.evaluate(()=>finishTalk());
  // Exercise real menu callbacks, not just the cinematic API.
  await page.evaluate(()=>{saveRecruitSceneHistory(emptyRecruitSceneHistory());state.party=['Verseborn'];state.activeParty=['Verseborn'];hallBattleProgress().pendingRecruit=5;openHallRecruitment();});
  await page.locator('[data-hall-recruit="Mira"]').click();await page.waitForFunction(()=>FlameguardWelcomes.current?.id==='Mira');await page.locator('.welcome-skip').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>mode),'walk');assert.equal(await page.locator('#menu').isVisible(),false);assert.equal(await page.evaluate(()=>state.party.includes('Mira')),true);
  await page.evaluate(()=>{state.party=['Verseborn'];state.activeParty=['Verseborn'];hallBattleProgress().openingComplete=true;confirmHallStartingParty(['Mira','Torren']);});
  await page.waitForFunction(()=>FlameguardWelcomes.current?.id==='Mira');await page.evaluate(()=>FlameguardWelcomes.finish());await page.waitForFunction(()=>FlameguardWelcomes.current?.id==='Torren');await page.evaluate(()=>FlameguardWelcomes.finish());assert.equal(await page.evaluate(()=>hallBattleProgress().startingWelcomeComplete),true);assert.equal(await page.evaluate(()=>FlameguardWelcomes.active),false);
  await page.evaluate(()=>{mode='walk';state.party=['Verseborn','Sparky'];el.menu.classList.add('hidden');CutsceneAutoplay.set(true);return FlameguardWelcomes.start('Sparky',{replay:true});});
  await page.waitForFunction(()=>FlameguardWelcomes.current.index>=2,null,{timeout:14000});await page.locator('.welcome-auto').click();assert.equal(await page.evaluate(()=>CutsceneAutoplay.enabled),false);const stopped=await page.evaluate(()=>FlameguardWelcomes.current.index);await page.waitForTimeout(3600);assert.equal(await page.evaluate(()=>FlameguardWelcomes.current.index),stopped);await page.evaluate(()=>FlameguardWelcomes.finish());
  assert.deepEqual(missing,[]);assert.deepEqual(errors,[]);fs.writeFileSync('../../outputs/welcome-303-tests.json',JSON.stringify({fullScenes:5,replayStatePreserved:true,optionalRosters:true,shortSparky:true,deferredDuo:true,keyboardAndSkip:true,startingWelcome:true,Marli:true,missing,errors},null,2));console.log('PASS welcome cinematics, all beats, optional rosters, persistent state, deferred Sparky, skip and Marli');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
