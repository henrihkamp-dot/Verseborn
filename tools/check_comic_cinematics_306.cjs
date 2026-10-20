const fs=require('fs'),assert=require('assert/strict'),{chromium}=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),p=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[],missing=[],seen=new Set();try{
 p.on('pageerror',e=>errors.push(e.stack));p.on('response',r=>{if(r.status()>=400&&!/favicon/.test(r.url()))missing.push(r.url());});
 await p.goto('http://127.0.0.1:4211/game/?qa=duelselect');await p.waitForFunction(()=>runtimeAssetsReady&&emberHallWorld.ready&&window.WelcomeComicPanels);await p.evaluate(()=>FlameguardWelcomes.ready);
 await p.evaluate(()=>{CutsceneAutoplay.set(false);mode='walk';el.menu.classList.add('hidden');state.party=Object.keys(baseJobs);});
 const casts={Mira:['Revus','Mira','Verseborn'],Torren:['Torren','Verseborn','Marli'],Seerin:['Seerin','Rava','Nyx','Jory','Verseborn'],Kael:['Kael','Verseborn'],Sparky:['Sparky','Verseborn','Mira','Seerin'],Glimmer:['Glimmer','Verseborn']};
 const snapshot=()=>JSON.stringify({party:state.party,activeParty:state.activeParty,map:state.map,hallPosition:state.hallPosition,vitals:Object.values(baseJobs).map(h=>[h.hp,h.mp]),cleared:hallBattleProgress().clearedStages,actors:emberHallWorld.actors.map(a=>a.id),history:loadRecruitSceneHistory()});
 for(const [id,cast]of Object.entries(casts)){
  const before=await p.evaluate(snapshot);await p.evaluate(id=>playRecruitScene(RECRUIT_SCENES.find(s=>s.recruit===id&&s.variant==='welcome'),{replay:true}),id);await p.waitForFunction(()=>FlameguardWelcomes.current);
  const n=await p.evaluate(()=>FlameguardWelcomes.current.length);assert.ok(n>=20,id+' full welcome');
  for(let i=0;i<n;i++){
   await p.evaluate(i=>FlameguardWelcomes.preview(i),i);const s=await p.evaluate(()=>FlameguardWelcomes.current);assert.deepEqual(s.cast,cast,id+' unexpected cameo');assert.equal(s.background,'ember-hall');
   if(s.beat.speaker&&!s.beat.offscreen)assert.ok(cast.includes(s.beat.speaker),id+' offstage speaker '+s.beat.speaker);
   if(s.comic.key&&!seen.has(s.comic.key)){seen.add(s.comic.key);await p.waitForTimeout(300);await p.screenshot({path:'../../outputs/comic-306-'+id.toLowerCase()+'-'+s.comic.key+'.png'});assert.equal(await p.locator('.welcome-caption').isVisible(),false);}
   if(id==='Glimmer'&&s.beat.event==='glimmer-bench'){const g=s.draws.find(a=>a.id==='Glimmer');assert.ok(Math.hypot(g.x-464,g.y-87)<6,'Glimmer must reach actual lab bench');await p.screenshot({path:'../../outputs/comic-306-glimmer-lab-sprites.png'});}
  }
  await p.evaluate(()=>FlameguardWelcomes.finish());assert.equal(await p.evaluate(snapshot),before,id+' replay mutated game');
 }
 // The same art must remain present across successive dialogue lines: no new entry transition.
 await p.evaluate(()=>FlameguardWelcomes.start('Sparky',{replay:true}));await p.evaluate(()=>FlameguardWelcomes.preview(1));await p.waitForTimeout(500);const a=await p.evaluate(()=>FlameguardWelcomes.current.comic);
 for(let i=0;i<2;i++){await p.evaluate(()=>FlameguardWelcomes.next(true));const b=await p.evaluate(()=>FlameguardWelcomes.current.comic);assert.equal(b.key,a.key);assert.equal(b.at,a.at,'same panel restarted');assert.equal(b.serial,a.serial,'same panel flashed');}
 await p.evaluate(()=>FlameguardWelcomes.finish());
 // Keep the genuine two-character short Sparky scene when the duo isn't recruited.
 await p.evaluate(()=>{state.party=['Verseborn','Sparky'];return FlameguardWelcomes.start('Sparky',{replay:true});});assert.equal(await p.evaluate(()=>FlameguardWelcomes.current.full),false);assert.deepEqual(await p.evaluate(()=>FlameguardWelcomes.current.cast),['Sparky','Verseborn']);await p.evaluate(()=>FlameguardWelcomes.finish());
 // Walk direction agrees with actual movement for Torren AND Marli.
 await p.evaluate(()=>{state.party=Object.keys(baseJobs);return FlameguardWelcomes.start('Torren',{replay:true});});
 for(const [id,event]of [['Torren','torren-enter'],['Marli','marli-enter']]){
  const index=await p.evaluate(event=>{for(let i=0;i<FlameguardWelcomes.current.length;i++){FlameguardWelcomes.preview(i);if(FlameguardWelcomes.current.beat.event===event)return i;}return-1;},event);assert.ok(index>0);await p.evaluate(i=>FlameguardWelcomes.preview(i-1),index);await p.evaluate(()=>FlameguardWelcomes.next(true));let previous=null,left=0;
  for(let i=0;i<30;i++){await p.waitForTimeout(70);const d=await p.evaluate(id=>FlameguardWelcomes.current.draws.find(a=>a.id===id),id);if(previous&&d.walking){const dx=d.x-previous.x;if(dx<-.1){assert.equal(d.row,3,id+' moonwalking left');left++;}if(dx>.1)assert.equal(d.row,2,id+' moonwalking right');}previous=d;}assert.ok(left>=3,id+' did not walk left');
 }
 await p.evaluate(()=>FlameguardWelcomes.finish());assert.equal(errors.length,0,errors.join('\n'));assert.equal(missing.length,0,missing.join('\n'));assert.equal(seen.size,13,'all comic inserts exercised');
 fs.writeFileSync('../../outputs/comic-306-test-report.json',JSON.stringify({pass:true,scenes:Object.keys(casts),panels:[...seen],stablePanels:true,walkDirections:['Torren','Marli'],errors,missing},null,2));console.log('PASS six welcomes, 13 framed inserts, stable panel transitions, essential casts, Glimmer lab/replay and Torren/Marli walking directions.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
