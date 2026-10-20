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
   if(s.comic.key&&!seen.has(s.comic.key)){seen.add(s.comic.key);await p.waitForTimeout(300);await p.screenshot({path:'../../outputs/comic-309-'+id.toLowerCase()+'-'+s.comic.key+'.png'});assert.equal(await p.locator('.welcome-caption').isVisible(),false);}
   if(id==='Glimmer'&&s.beat.event==='glimmer-bench'){const g=s.draws.find(a=>a.id==='Glimmer');assert.ok(Math.hypot(g.x-464,g.y-87)<6,'Glimmer must reach actual lab bench');await p.screenshot({path:'../../outputs/comic-309-glimmer-lab-sprites.png'});}
  }
  await p.evaluate(()=>FlameguardWelcomes.finish());assert.equal(await p.evaluate(snapshot),before,id+' replay mutated game');
 }
 // Panels clear on the next ordinary dialogue beat, rather than covering a conversation.
 await p.evaluate(()=>FlameguardWelcomes.start('Torren',{replay:true}));
 await p.evaluate(()=>{for(let i=0;i<FlameguardWelcomes.current.length;i++){FlameguardWelcomes.preview(i);if(FlameguardWelcomes.current.comic.key==='torren-rank')break;}});
 assert.equal(await p.evaluate(()=>FlameguardWelcomes.current.comic.key),'torren-rank');const panelStart=await p.evaluate(()=>FlameguardWelcomes.current.comic.at);await p.evaluate(()=>FlameguardWelcomes.next(true));assert.equal(await p.evaluate(()=>FlameguardWelcomes.current.comic.at),panelStart,'same shot should not flash again');await p.evaluate(()=>FlameguardWelcomes.next(true));assert.equal(await p.evaluate(()=>FlameguardWelcomes.current.comic.key),null);await p.evaluate(()=>FlameguardWelcomes.finish());
 // Verseborn faces left towards Seerin; the children animate without shifting their foot anchors.
 await p.evaluate(()=>FlameguardWelcomes.start('Seerin',{replay:true}));await p.evaluate(()=>FlameguardWelcomes.preview(6));await p.waitForTimeout(150);
 const childrenA=await p.evaluate(()=>FlameguardWelcomes.current.draws.filter(d=>['Nyx','Jory','Rava'].includes(d.id)));
 assert.equal(await p.evaluate(()=>FlameguardWelcomes.current.draws.find(d=>d.id==='Verseborn').facing),3);await p.waitForTimeout(700);
 const childrenB=await p.evaluate(()=>FlameguardWelcomes.current.draws.filter(d=>['Nyx','Jory','Rava'].includes(d.id)));
 childrenA.forEach((a,i)=>{assert.equal(a.x,childrenB[i].x);assert.equal(a.y,childrenB[i].y);assert.equal(a.gesture.whole,true);assert.equal(childrenB[i].gesture.whole,true);});await p.evaluate(()=>FlameguardWelcomes.finish());
 // Mira's atlas has left-facing frames in row 2, unlike Torren and Marli.
 await p.evaluate(()=>FlameguardWelcomes.start('Sparky',{replay:true}));await p.evaluate(()=>FlameguardWelcomes.preview(3));await p.evaluate(()=>FlameguardWelcomes.next(true));await p.waitForTimeout(450);assert.equal(await p.evaluate(()=>FlameguardWelcomes.current.draws.find(d=>d.id==='Mira').row),2);await p.evaluate(()=>FlameguardWelcomes.finish());
 // Glimmer talks normally, flies to a repair, then returns to the conversation.
 await p.evaluate(()=>FlameguardWelcomes.start('Glimmer',{replay:true}));
 await p.evaluate(()=>{for(let i=0;i<FlameguardWelcomes.current.length;i++){FlameguardWelcomes.preview(i);if(FlameguardWelcomes.current.beat.event==='glimmer-bench')break;}});
 assert.equal(await p.evaluate(()=>FlameguardWelcomes.current.draws.find(d=>d.id==='Glimmer').source),'hall/comic-307/glimmer-talk.webp');
 await p.evaluate(()=>FlameguardWelcomes.next(true));await p.waitForTimeout(500);assert.equal(await p.evaluate(()=>FlameguardWelcomes.current.draws.find(d=>d.id==='Glimmer').flying),true);await p.screenshot({path:'../../outputs/comic-309-glimmer-boost.png'});await p.evaluate(()=>FlameguardWelcomes.finish());
 // Keep the genuine two-character short Sparky scene when the duo isn't recruited.
 await p.evaluate(()=>{state.party=['Verseborn','Sparky'];return FlameguardWelcomes.start('Sparky',{replay:true});});assert.equal(await p.evaluate(()=>FlameguardWelcomes.current.full),false);assert.deepEqual(await p.evaluate(()=>FlameguardWelcomes.current.cast),['Sparky','Verseborn']);await p.evaluate(()=>FlameguardWelcomes.finish());
 // Walk direction agrees with actual movement for Torren AND Marli.
 await p.evaluate(()=>{state.party=Object.keys(baseJobs);return FlameguardWelcomes.start('Torren',{replay:true});});
 for(const [id,event]of [['Torren','torren-enter'],['Marli','marli-enter']]){
  const index=await p.evaluate(event=>{for(let i=0;i<FlameguardWelcomes.current.length;i++){FlameguardWelcomes.preview(i);if(FlameguardWelcomes.current.beat.event===event)return i;}return-1;},event);assert.ok(index>0);await p.evaluate(i=>FlameguardWelcomes.preview(i-1),index);await p.evaluate(()=>FlameguardWelcomes.next(true));let previous=null,left=0;
  for(let i=0;i<30;i++){await p.waitForTimeout(70);const d=await p.evaluate(id=>FlameguardWelcomes.current.draws.find(a=>a.id===id),id);if(previous&&d.walking){const dx=d.x-previous.x;if(dx<-.1){assert.equal(d.row,3,id+' moonwalking left');left++;}if(dx>.1)assert.equal(d.row,2,id+' moonwalking right');}previous=d;}assert.ok(left>=3,id+' did not walk left');
 }
 await p.evaluate(()=>FlameguardWelcomes.finish());
 for(const viewport of [{width:1920,height:1080},{width:1280,height:720},{width:640,height:360}]){
  await p.setViewportSize(viewport);await p.evaluate(()=>{state.party=Object.keys(baseJobs);return FlameguardWelcomes.start('Seerin',{replay:true});});await p.evaluate(()=>FlameguardWelcomes.preview(6));await p.waitForTimeout(350);
  const boxes=await p.evaluate(()=>{const box=q=>{const r=document.querySelector(q).getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};return{portrait:box('.welcome-portrait-frame'),line:box('.welcome-line'),dialogue:box('.welcome-dialogue'),next:box('.welcome-next'),image:document.querySelector('.welcome-portrait').naturalWidth};});
  assert.ok(boxes.portrait.w>viewport.width*.10,'portrait too small');assert.ok(boxes.portrait.y>=0&&boxes.portrait.bottom<=viewport.height+2,'portrait clipped');assert.ok(boxes.line.x>boxes.portrait.right-10,'portrait overlaps dialogue');assert.ok(boxes.line.bottom<viewport.height,'dialogue clipped');assert.ok(boxes.image>0,'portrait missing');
  await p.screenshot({path:'../../outputs/comic-309-portrait-'+viewport.width+'.png'});await p.evaluate(()=>FlameguardWelcomes.finish());
 }
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(missing.length,0,missing.join('\n'));assert.ok(seen.size>=24,'all individual shots exercised: '+seen.size);
 fs.writeFileSync('../../outputs/comic-309-test-report.json',JSON.stringify({pass:true,scenes:Object.keys(casts),panels:[...seen],oneBeatPanels:true,walkDirections:['Torren','Marli'],errors,missing},null,2));console.log('PASS six welcomes, individual inserts, one-beat panels, smooth orphans and corrected facings, essential casts, Glimmer lab/replay and Torren/Marli walking directions.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});

