const assert=require('assert/strict'),{chromium}=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4205/game/?qa=duelselect');await page.waitForFunction(()=>runtimeAssetsReady&&window.BattleCommandUI&&window.emberHallWorld?.ready);await page.evaluate(()=>EmberRift.ready);
async function frame(name){await page.waitForTimeout(200);const data=await page.evaluate(()=>{const r=document.querySelector('.game').getBoundingClientRect(),c=canvas.getBoundingClientRect();return{ratio:r.width/r.height,scroll:document.documentElement.scrollHeight>innerHeight+2||document.documentElement.scrollWidth>innerWidth+2,canvasRatio:c.width/c.height,mode};});assert(Math.abs(data.ratio-16/9)<.005,name+JSON.stringify(data));assert(!data.scroll,name);await page.screenshot({path:'../../outputs/battle-265/desktop-'+name+'.png'});return data;}
await page.evaluate(()=>{mode='walk';state.map='emberHallBattles';el.battle.classList.add('hidden');el.menu.classList.add('hidden');syncResponsiveMode();syncCanvasResolution();});const results={hall:await frame('hall')};
for(const tab of ['status','gear','skills','system']){await page.evaluate(tab=>{mode='walk';menuTab=tab;toggleMenu();syncResponsiveMode();syncCanvasResolution();},tab);results[tab]=await frame(tab);}
await page.evaluate(()=>{mode='walk';EmberRift.progress().unlocked=true;EmberRift.enterRoom();syncResponsiveMode();syncCanvasResolution();});results.rift=await frame('rift');
await page.evaluate(()=>{mode='walk';HallHub.openService('Torren');syncResponsiveMode();syncCanvasResolution();});results.shop=await frame('shop');
await page.evaluate(()=>{mode='title';el.menu.classList.add('hidden');el.battle.classList.add('hidden');syncResponsiveMode();syncCanvasResolution();});results.title=await frame('title');
assert.deepEqual(errors,[]);await browser.close();console.log('PASS: consistent 16:9 frames, no page overflow across hall, Rift, title, gear/status/skills/system and shop.',results);
})().catch(e=>{console.error(e);process.exit(1)});
