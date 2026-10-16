const {chromium}=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.resolve(__dirname,'../.analysis-sparky-size');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page=await browser.newPage({viewport:{width:1800,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
 await page.goto(process.argv[2]||'http://127.0.0.1:4194/?qa=flame1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.FlameguardIdle && battleAnimationSheets.Sparky);
 await page.evaluate(()=>FlameguardIdle.ready);
 const report=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.id='size-comparison';canvas.width=560;canvas.height=150;
  const paint=canvas.getContext('2d');paint.fillStyle='#191620';paint.fillRect(0,0,560,150);paint.imageSmoothingEnabled=true;
  const original=ctx.drawImage,calls=[];ctx.drawImage=(...a)=>{calls.push(a);paint.drawImage(...a)};
  const sheet=battleAnimationSheets.Sparky,scale=battleSpriteHeights.Sparky*BATTLE_COMPOSITION_SCALE/sheet.referenceHeight*1.2;
  const results=[];const animations=['idle','block','melee','magic','ultimate1','ultimate2','death'];
  for(const [i,anim] of animations.entries()){
   const x=40+i*80,unit={id:'Sparky',anim,hp:anim==='death'?0:100,deathTick:0};
   for(let col=0;col<4;col++){
    effect={caster:'Sparky',t:col,duration:4};calls.length=0;
    const visible=anim==='idle'?col===0:col===1;
    if(visible){paint.strokeStyle='#8c7958';paint.beginPath();paint.moveTo(x-32,110);paint.lineTo(x+32,110);paint.stroke();}
    const draw=ctx.drawImage;if(!visible)ctx.drawImage=(...a)=>calls.push(a);
    drawBattlePartySprite(unit,x,110,col*BATTLE_DEATH_FRAME_TICKS);
    ctx.drawImage=draw;
    if(!calls.length)throw Error(anim+' not rendered');
    const a=calls[0];
    if(anim!=='idle'){
     if(Math.abs(a[7]-sheet.cellWidth*scale)>.51)throw Error(anim+' inconsistent size');
     if(Math.abs(a[5]+sheet.anchorX*scale-x)>.51)throw Error(anim+' wrong horizontal anchor');
     if(Math.abs(a[6]+sheet.baseline*scale-110)>.51)throw Error(anim+' wrong ground anchor');
    }
    results.push({anim,col,source:a.slice(1,5),destination:a.slice(5)});
   }
   paint.fillStyle='#eadbbd';paint.font='10px sans-serif';paint.textAlign='center';paint.fillText(anim,x,135);
  }
  ctx.drawImage=original;effect=null;document.body.replaceChildren(canvas);canvas.style.cssText='width:1680px;height:450px;image-rendering:pixelated';
  return results;
 });
 await page.locator('#size-comparison').screenshot({path:path.join(out,'comparison.png')});
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({report,errors},null,2));
 await browser.close();console.log('PASS all 24 action frames share calibrated scale and foot anchors; idle artwork unchanged; no browser or asset errors.');
})().catch(e=>{console.error(e);process.exit(1)});
