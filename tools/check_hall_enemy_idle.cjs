const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{chromium}=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output=path.resolve(__dirname,'../../../outputs/hall-enemy-idle-229');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4196/?qa=hallstage&stage=5');
  await page.waitForFunction('runtimeAssetsReady',null,{timeout:120000});
  await page.evaluate(()=>Promise.all([HallEnemyIdle.ready,FlameguardIdle.ready,TinusCharacter.ready]));
  const result=await page.evaluate(()=>{
   runCurrentTurn=()=>{};battle.resolving=true;
   const inventory=new Set();
   for(const stage of HALL_BATTLE_BLUEPRINTS)for(const keys of [stage.enemies,...stage.waves])for(const unit of hallEnemiesForStage(stage.stage,keys,0))inventory.add(enemyAnimationKey(unit));
   inventory.add('Solinar Enraged');let moved=0;
   for(const key of inventory){
    const config=HallEnemyIdle.manifest[key],regions=HallEnemyIdle.profiles[key];if(!config||!regions)throw Error('No Hall idle '+key);
    for(let phase=0;phase<Math.PI*2;phase+=.15){
     for(const [u,v]of [[.5,.55],[.42,.29],[.5,1],[.2,1],[.8,1]])if(HallEnemyIdle.offset(config,regions,u,v,phase).some(value=>value!==0))throw Error('Core/face/foot pin moved '+key);
    }
    let max=0;
    for(const region of regions){const[u,v]=region;for(let phase=0;phase<Math.PI*2;phase+=.15){const a=HallEnemyIdle.offset(config,regions,u,v,phase),b=HallEnemyIdle.offset(config,regions,u,v,phase+Math.PI*2);if(a.some((value,index)=>Math.abs(value-b[index])>1e-8))throw Error('Loop seam '+key);max=Math.max(max,Math.hypot(...a)/config.referenceHeight);}}
    if(max===0)throw Error('Frozen idle '+key);moved++;
   }
   const unit=battle.enemies[0],original=ctx.drawImage,calls=[];ctx.drawImage=(...args)=>calls.push(args);
   const capture=()=>{calls.length=0;drawAnimatedEnemy(unit,180,90);return calls.some(call=>call[0]?.src?.includes('hall-idle-229'));};
   try{
    if(!capture())throw Error('Normal Hall did not use continuous idle');
    for(const flag of ['riftEncounter','whirlpoolEncounter','shadowDuel']){battle[flag]=1;if(capture())throw Error(flag+' was overridden');delete battle[flag];}
    const stage=battle.hallStage;delete battle.hallStage;if(capture())throw Error('Non-Hall battle overridden');battle.hallStage=stage;
    unit.anim='attack';unit.attackStyle='melee';unit.animTick=10;if(capture())throw Error('Attack overridden');
    unit.anim='death';if(capture())throw Error('Death overridden');unit.anim='idle';
   }finally{ctx.drawImage=original;}
   const durations=[];for(let i=0;i<60;i++){const start=performance.now();drawBattleScene();durations.push(performance.now()-start);}durations.sort((a,b)=>a-b);
   return{enemies:inventory.size,movingProfiles:moved,scope:'normal Hall only',pins:'fixed',p95DrawMs:durations[Math.floor(durations.length*.95)]};
  });
  assert.equal(result.enemies,48);assert.equal(result.movingProfiles,48);
  await page.screenshot({path:path.join(output,'hall-battle.png')});
  const memory=await page.evaluate(async()=>{
   await TinusRecruitment.ready;TinusCharacter.recruit();battle=null;mode='menu';state.gameMode='hallBattles';state.map='emberHallBattles';
   if(!TinusRecruitment.replay())throw Error('Tinus memory did not start');
   const tracks=[trackForScene()];TinusRecruitment.tick(performance.now()+3000);tracks.push(trackForScene());
   document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
   return{tracks,finished:!TinusRecruitment.replaying,restored:trackForScene()};
  });
  assert.deepEqual(memory.tracks,['cutscene','cutscene']);assert.ok(memory.finished);assert.notEqual(memory.restored,'cutscene');assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({result,memory,errors},null,2));console.log(JSON.stringify({result,memory,errors}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
