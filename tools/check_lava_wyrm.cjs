const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../dist/client/game');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{await new Promise(r=>server.listen(8817,'127.0.0.1',r));let browser;try{
browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8817/');await page.waitForFunction('runtimeAssetsReady',{},{timeout:120000});
assert.ok(await page.evaluate(`enemyAnimationSheets['Ash Wyrm'].columns===4 && endgameBossVfxSheets['Ash Wyrm'].image.complete`));
assert.ok(await page.evaluate(`(()=>{
  const image=enemyAnimationSheets['Ash Wyrm'].image,c=document.createElement('canvas');
  c.width=image.width;c.height=image.height;const context=c.getContext('2d');context.drawImage(image,0,0);
  const data=context.getImageData(0,0,c.width,c.height).data;
  let error=0,count=0;
  for(let col=1;col<4;col++)for(let y=130;y<240;y++)for(let x=40;x<155;x++) {
    const a=(y*c.width+x)*4,b=(y*c.width+x+col*256)*4;
    for(let channel=0;channel<4;channel++){error+=Math.abs(data[a+channel]-data[b+channel]);count++;}
  }
  return error/count>4 && error/count<55;
})()`),'Whole-body idle must vary naturally without a frozen torso or large displacement');
assert.ok(await page.evaluate(`(()=>{
  const sheet=enemyAnimationSheets['Ash Wyrm'];
  if(new Set(sheet.frameSequences.idle).size<3)return false;
  const calls=[],original=ctx.drawImage,oldTick=tick;
  ctx.drawImage=(...args)=>calls.push(args.slice(1));
  const unit={name:'Ash Wyrm',hp:100,anim:'idle'};
  for(let i=0;i<4;i++){tick=i*36;drawAnimatedEnemy(unit,300,150);}
  unit.anim='attack';unit.attackStyle='magic';
  for(let i=0;i<4;i++){unit.animTick=i*10;tick++;drawAnimatedEnemy(unit,300,150);}
  ctx.drawImage=original;tick=oldTick;
  return new Set(calls.slice(0,4).map(c=>c[0])).size===3
    && calls.every(c=>c.slice(4).join(',')===calls[0].slice(4).join(','))
    && new Set(calls.slice(4).map(c=>c[0])).size===4;
})()`));
await page.evaluate(`startTitleGame(false);state.gameMode='hallBattles';mode='walk';hallBattleProgress().unlockedStage=54;startHallBattleStage(54);drawBattleScene();`);
assert.ok(await page.evaluate(`(()=>{const wyrm=battle.enemies.find(e=>(e.sprite||e.name)==='Ash Wyrm');const fx=makeEnemyBattleEffect(wyrm,battle.party[0],{kind:'magic',name:'Lava',element:'Fire'});if(!fx.bossSheetVfx)return false;effect=fx;drawEffect();return true;})()`));
await page.screenshot({path:path.resolve(__dirname,'../.sites-artifacts/lava-ash-wyrm.png')});
assert.deepEqual(errors,[]);console.log('PASS Ash Wyrm sprite, projectile routing and battle rendering');
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
