const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output=path.resolve(__dirname,'../../../outputs/flameguard-charges-226/loops');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage();await page.goto('http://127.0.0.1:4196/?qa=hallstage&stage=8');
  await page.waitForFunction('runtimeAssetsReady',null,{timeout:120000});
  await page.evaluate(()=>Promise.all([FlameguardIdle.ready,TinusCharacter.ready]));
  await page.evaluate(()=>{runCurrentTurn=()=>{};window.qaNow=performance.now();Object.defineProperty(performance,'now',{value:()=>qaNow});});
  for(const id of (process.argv.length>2?process.argv.slice(2):['Glimmer','Seerin','Mira','Sparky','Verseborn','Torren','Kael','Tinus'])){
   const dir=path.join(output,id);fs.mkdirSync(dir,{recursive:true});
   await page.evaluate(id=>{battle.party=[battleUnit(id)];const unit=battle.party[0];battle.resolving=true;unit.anim='melee';effect=makeBattleEffect(unit,{anim:id==='Tinus'?'magic':'melee',power:1,basicAttack:true},battle.enemies[0]);window.qaStart=effect.startedAt;},id);
   for(let ms=0,index=0;ms<=1590;ms+=30,index++){
    const data=await page.evaluate(ms=>{
     qaNow=qaStart+Math.min(ms,1349);battle.party[0].anim=ms>=1250?'idle':'melee';
     if(ms>=1350)effect=null;
     drawBattleScene();
     const canvas=document.createElement('canvas');canvas.width=640;canvas.height=Math.round(640*BATTLE_ARENA_HEIGHT/LOGICAL_WIDTH);
     const screen=document.getElementById('screen');canvas.getContext('2d').drawImage(screen,0,0,screen.width,screen.height*BATTLE_ARENA_HEIGHT/LOGICAL_HEIGHT,0,0,canvas.width,canvas.height);
     return canvas.toDataURL('image/png').split(',')[1];
    },ms);
    fs.writeFileSync(path.join(dir,String(index).padStart(3,'0')+'.png'),Buffer.from(data,'base64'));
   }
  }
  console.log(output);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
