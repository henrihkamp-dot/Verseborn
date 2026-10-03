const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../.sites-artifacts/release112-endgame/dist/client/game');
const server=http.createServer((req,res)=>{const name=decodeURIComponent(req.url.split('?')[0]),file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{await new Promise(r=>server.listen(8799,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8799/');await page.waitForFunction('runtimeAssetsReady',{},{timeout:120000});
 assert.ok(await page.evaluate(`(()=>{startTitleGame(false);state.gameMode='hallBattles';state.party=['Verseborn','Torren','Glimmer'];state.activeParty=state.party;state.gold=250000;state.hallBattles={clearedStages:Array.from({length:50},(_,i)=>i+1),unlockedStage:50};saveGame(hallSaveKey());loadGame(hallSaveKey());return hallBattleProgress().unlockedStage===51&&glimmerArtifactWares().length===0;})()`));
 await page.evaluate(`for(let stage=51;stage<=60;stage++)recordHallBattleClear(stage);activeVendor='workshop';mode='shop';vendorTab='buy';el.menu.classList.remove('hidden');renderVendor();`);
 assert.equal(await page.locator('.shop-offer-section').first().locator('[data-buy]').count(),10);
 await page.screenshot({path:path.resolve(__dirname,'../.sites-artifacts/artifact-shop-desktop.png')});
 await page.locator('.shop-offer-section').first().locator('[data-buy]').first().click();
 assert.ok(await page.evaluate(`(()=>{const ref=ownedGearRefs().find(r=>gearByName(r)?.name==='Courtesy Engine'),stats=JSON.stringify(gearInstance(ref).stats),gold=state.gold;saveGame(hallSaveKey());loadGame(hallSaveKey());return hallBattleProgress().artifactShopUnlocks.length===10&&glimmerArtifactWares().length===10&&JSON.stringify(gearInstance(ref).stats)===stats&&state.gold===gold&&gold===232000;})()`));
 await page.evaluate(`activeVendor='workshop';mode='shop';vendorTab='buy';el.menu.classList.remove('hidden');renderVendor();`);
 await page.setViewportSize({width:390,height:844});await page.mouse.move(0,0);await page.evaluate('hideGearHoverTooltip()');await page.screenshot({path:path.resolve(__dirname,'../.sites-artifacts/artifact-shop-mobile.png')});
 assert.ok(await page.evaluate(`[...document.querySelectorAll('.shop-row')].every(row=>row.scrollWidth<=row.clientWidth+2)`),'Shop row overflow');
 assert.deepEqual(errors,[]);console.log('PASS desktop/mobile shop, purchase, Stage-50 save and actual Artifact save/reload');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
