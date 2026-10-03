const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../.sites-artifacts/release112-endgame/dist/client/game');
const server=http.createServer((req,res)=>{const name=decodeURIComponent(req.url.split('?')[0]);const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{await new Promise(r=>server.listen(8799,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()===404&&!r.url().includes('favicon'))missing.push(r.url());});
 await page.goto('http://127.0.0.1:8799/');await page.waitForFunction('runtimeAssetsReady',{},{timeout:120000});
 const loaded=await page.evaluate(`Object.keys(enemyAnimationFiles).map(name=>({name,ready:Boolean(enemyAnimationSheets[enemyAnimationFiles[name]])}))`);assert.ok(loaded.every(e=>e.ready),JSON.stringify({failed:loaded.filter(e=>!e.ready),missing,errors}));
 const compatibility=await page.evaluate(`(()=>{startTitleGame(false);state.gameMode='hallBattles';state.party=['Verseborn','Torren','Glimmer'];state.activeParty=state.party;state.gold=8765;state.hallBattles={clearedStages:Array.from({length:50},(_,i)=>i+1),unlockedStage:50,shopStage:50,shopOffers:{}};const before=JSON.stringify({party:state.party,gear:state.gear,inventory:state.inventory,gold:state.gold});saveGame(hallSaveKey());loadGame(hallSaveKey());return hallBattleProgress().unlockedStage===51&&before===JSON.stringify({party:state.party,gear:state.gear,inventory:state.inventory,gold:state.gold});})()`);assert.ok(compatibility);
 for(let stage=1;stage<=60;stage++){
  const ready=await page.evaluate(s=>{const info=hallBattleInfo(s);return [info.enemies,...info.waves].every((keys,i)=>hallEnemiesForStage(s,keys,i).every(e=>Boolean(enemyAnimationSheetFor(e))));},stage);assert.ok(ready,'Stage '+stage);
 }
 for(let stage=51;stage<=60;stage++){
  await page.evaluate(s=>{const info=hallBattleInfo(s);state.map=info.mapId;startBattle('Hall '+s+'/60 - '+info.name+' - Phase 3/3',hallEnemiesForStage(s,info.waves[1],2),undefined,null,[],{hallBoss:true,roundCap:60});battle.hallStage=s;battle.phaseTotal=3;battle.resolving=true;battle.enemies.forEach(e=>{if(e.endgameBoss)endgameMechanicState(e);});updatePanels();},stage);
  await page.waitForTimeout(160);await page.screenshot({path:path.resolve(__dirname,'../.sites-artifacts/battle-'+stage+'.png')});
 }
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.screenshot({path:path.resolve(__dirname,'../.sites-artifacts/endgame-narrow.png')});
 const hud=await page.locator('#bossMechanicHud').boundingBox(),canvas=await page.locator('canvas').first().boundingBox();assert.ok(hud&&canvas&&hud.y+hud.height<=canvas.y+2,'HUD overlaps battlefield');
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log(JSON.stringify({loaded:loaded.length,stages:60,stage50Save:compatibility,errors,missing}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
