const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../.sites-artifacts/release112-endgame/dist/client/game');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{await new Promise(r=>server.listen(8799,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8799/');await page.waitForFunction('runtimeAssetsReady',{},{timeout:120000});
 await page.evaluate(`startTitleGame(false);runCurrentTurn=()=>{};state.gameMode='hallBattles';state.party=['Glimmer','Torren','Verseborn'];state.activeParty=state.party;`);
 for(let stage=51;stage<=60;stage++){
  await page.evaluate(stage=>{const info=hallBattleInfo(stage);state.map=info.mapId;startBattle(info.name,hallEnemiesForStage(stage,info.waves[1],2),undefined,null,[],{hallBoss:true});battle.hallStage=stage;battle.phaseTotal=3;battle.waves=[];battle.resolving=true;updateBossMechanicDisplay();},stage);
  const result=await page.evaluate(()=>{const boss=battle.enemies.find(e=>e.endgameBoss),old=drawCombatRoleIcon,calls=[];drawCombatRoleIcon=(...args)=>calls.push(args);try{drawBossIndicatorStrip(boss,100,true);if(calls.length)throw Error('Role icon above sprite');drawBattleRoleRosters();return {roles:calls.length,units:battle.party.length+battle.enemies.length,title:document.querySelector('.boss-mechanic-panel strong').textContent,name:boss.name};}finally{drawCombatRoleIcon=old;}});
  assert.equal(result.roles,result.units);assert.equal(result.title,result.name);
 }
 for(const width of [1440,593,390]){
  await page.setViewportSize({width,height:1000});await page.waitForTimeout(150);
  const bounds=await page.evaluate(()=>{const panel=document.querySelector('.boss-mechanic-panel').getBoundingClientRect(),p=document.querySelector('.boss-mechanic-panel p').getBoundingClientRect();return {left:(p.left-panel.left)/panel.width,right:(panel.right-p.right)/panel.width,top:(p.top-panel.top)/panel.height};});
  assert.ok(bounds.left>=.119&&bounds.right>=.119&&bounds.top>=.44);await page.screenshot({path:path.resolve(__dirname,'../.sites-artifacts/boss-banner-'+width+'.png')});
 }
 assert.deepEqual(errors,[]);console.log('PASS 10 boss names, role icons only in HP rosters, banner text bounds at desktop/593px/mobile');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
