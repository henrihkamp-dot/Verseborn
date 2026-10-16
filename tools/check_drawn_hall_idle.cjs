const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const{chromium}=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output=path.resolve(__dirname,'../../../outputs/hall-enemy-idle-230'),root=path.resolve(__dirname,'../public/game/assets/sprites/hall-idle-230');
(async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'))),assetChecks=[];
 for(const[key,c]of Object.entries(manifest)){
  const{data,info}=await sharp(path.join(root,c.file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,c.cellWidth*8);assert.equal(info.height,c.cellHeight);
  const hashes=[],bottoms=[],centres=[];
  for(let col=0;col<8;col++){
   const cell=Buffer.alloc(c.cellWidth*c.cellHeight*4);let count=0,footMass=0,footSum=0,bottom=0,top=c.cellHeight;
   for(let y=0;y<c.cellHeight;y++)for(let x=0;x<c.cellWidth;x++){const p=(y*info.width+col*c.cellWidth+x)*4,to=(y*c.cellWidth+x)*4;data.copy(cell,to,p,p+4);if(data[p+3]>24){count++;bottom=Math.max(bottom,y);top=Math.min(top,y);assert(x>=5&&x<c.cellWidth-5&&y>=5&&y<c.cellHeight-5,key+' clipped '+col);if(y>=276&&y<=291){footMass+=data[p+3];footSum+=x*data[p+3];}}}
   assert(count>1000,key+' empty');bottoms.push(bottom);centres.push(footSum/footMass);hashes.push(crypto.createHash('sha256').update(cell).digest('hex'));
  }
  assert.equal(new Set(hashes).size,8,key+' duplicate drawings');assert.equal(c.cycleMs,c.durations.reduce((a,b)=>a+b,0));
  assetChecks.push({key,frames:8,bottomRange:Math.max(...bottoms)-Math.min(...bottoms),footMassRange:Math.max(...centres)-Math.min(...centres),bytes:fs.statSync(path.join(root,c.file)).size});
 }
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4197/?qa=hallstage&stage=5');await page.waitForFunction('runtimeAssetsReady',null,{timeout:120000});await page.evaluate(()=>Promise.all([HallEnemyIdle.ready,FlameguardIdle.ready]));
  const result=await page.evaluate(()=>{
   runCurrentTurn=()=>{};battle.resolving=true;
   const inventory=new Set();for(const stage of HALL_BATTLE_BLUEPRINTS)for(const keys of [stage.enemies,...stage.waves])for(const u of hallEnemiesForStage(stage.stage,keys,0))inventory.add(enemyAnimationKey(u));inventory.add('Solinar Enraged');
   for(const key of inventory){const c=HallEnemyIdle.manifest[key];if(!c)throw Error('Missing '+key);let elapsed=0;for(let i=0;i<8;i++){if(HallEnemyIdle.frameAt(c,elapsed)!==i)throw Error('Timeline '+key);elapsed+=c.durations[i];}if(HallEnemyIdle.frameAt(c,c.cycleMs)!==0)throw Error('Loop '+key);}
   const unit=battle.enemies.find(u=>enemyAnimationKey(u)==='Brokk'),draw=ctx.drawImage,calls=[];ctx.drawImage=(...args)=>calls.push(args);
   const capture=()=>{calls.length=0;drawAnimatedEnemy(unit,180,90);return calls.some(c=>c[0]?.src?.includes('hall-idle-230'));};
   try{if(!capture())throw Error('No new idle');for(const flag of ['riftEncounter','shadowDuel','whirlpoolEncounter']){battle[flag]=true;if(capture())throw Error('Wrong mode '+flag);delete battle[flag];}unit.anim='attack';unit.attackStyle='melee';if(capture())throw Error('Attack overridden');unit.anim='death';if(capture())throw Error('Death overridden');unit.anim='idle';}finally{ctx.drawImage=draw;}
   const fill=ctx.fillRect;let shadowRects=0;ctx.fillRect=()=>shadowRects++;try{drawFieldShadow(100,100,10);}finally{ctx.fillRect=fill;}if(shadowRects)throw Error('Shadow bar remains');
   const timings=[];for(let i=0;i<40;i++){const start=performance.now();drawBattleScene();timings.push(performance.now()-start);}timings.sort((a,b)=>a-b);
   return{enemies:inventory.size,frames:Object.keys(HallEnemyIdle.manifest).length*8,scope:'Normal Hall only',nativeActions:true,shadowBars:shadowRects,p95DrawMs:timings[Math.floor(timings.length*.95)]};
  });
  await page.screenshot({path:path.join(output,'hall-battle.png')});assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({result,assets:assetChecks,errors},null,2));console.log(JSON.stringify({result,bytes:assetChecks.reduce((n,c)=>n+c.bytes,0),errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
