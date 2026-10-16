const {chromium}=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.argv[2]||'http://127.0.0.1:4187/';
const out=path.resolve(__dirname,'../.analysis-idle-217'); fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.goto(base+'?qa=flame1',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.FlameguardIdle && battle && battleAnimationSheets.Verseborn,{},{timeout:60000});
 await page.evaluate(()=>FlameguardIdle.ready);
 const result=await page.evaluate(()=>{
  const ids=['Verseborn','Mira','Seerin','Kael','Torren','Glimmer','Sparky','Tinus'];
  const calls=[],original=ctx.drawImage;ctx.drawImage=(...args)=>calls.push(args);
  const originalNow=performance.now.bind(performance);let now=1000;performance.now=()=>now;
  const rows=[];
  for(const id of ids){
   const config=FlameguardIdle.manifest[id];if(!config)throw Error(id+' missing');
   const actor={id,hp:100,anim:'idle'};battle={party:[actor],enemies:[]};
   drawBattlePartySprite(actor,100,150);let elapsed=0;
   for(let i=0;i<config.order.length;i++){
    now=1000+elapsed+config.durations[i]/2;calls.length=0;drawBattlePartySprite(actor,100,150);
    const call=calls[0];if(!call||call[1]!==config.order[i]*320)throw Error(id+' schedule '+i);
    if(call[5]!==Math.round(100-160*battleSpriteHeights[id]*BATTLE_COMPOSITION_SCALE/config.referenceHeight))throw Error(id+' anchor moved');
    if(call.slice(1).some(n=>!Number.isFinite(n)))throw Error(id+' invalid coordinate');
    elapsed+=config.durations[i];
   }
   if(FlameguardIdle.frameAt(config,config.cycleMs)!==config.order[0])throw Error(id+' wrap');
   rows.push({id,cycleMs:elapsed,poses:config.order.length});now=1000;
  }
  // Non-idle and transformed forms must render their existing sheets.
  for(const [id,form,anim] of [['Verseborn',null,'melee'],['Tinus',null,'magic'],['Glimmer','mech','idle'],['Kael','shadowpriest','idle']]){
   calls.length=0;drawBattlePartySprite({id,form,anim,hp:100},100,150);
   if(!calls.length)throw Error(id+' native pose missing');
   if(calls[0][0].src.includes('flameguard-idle/'))throw Error(id+' action/form overridden');
  }
  ctx.drawImage=original;performance.now=originalNow;
  return rows;
 });
 // Capture each real battle against the arena, including Tinus after native modules load.
 for(const id of result.map(r=>r.id)){
  await page.evaluate(id=>{mode='walk';addParty(id);progressFor(id).level=40;state.activeParty=[id];startBattle(id+' Idle Preview',[enemy('Training Construct',99999,1,'Shadow','#655',1)],null);},id);
  await page.waitForTimeout(100);
  await page.locator('.game').screenshot({path:path.join(out,id.toLowerCase()+'.png')});
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({result,errors},null,2));
 await browser.close();console.log(JSON.stringify({heroes:result.length,schedules:'passed',anchors:'fixed',actionsAndForms:'native',errors},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
