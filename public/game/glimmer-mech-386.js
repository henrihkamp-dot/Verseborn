/* Only Glimmer's transformed artwork; native actions, damage and travel stay in charge. */
(()=>{
 'use strict';
 const image=new Image(),rocket=new Image(),clocks=new WeakMap(),deathClocks=new WeakMap(),hoverStates=new WeakMap(),smokeStates=new WeakMap();let loaded=false;
 const ready=new Promise(resolve=>{image.onload=()=>{loaded=true;resolve(true);};image.onerror=()=>resolve(false);image.src='assets/sprites/battle-v2/glimmer-mech.png?v=386';});
 rocket.src='assets/sprites/battle-v2/glimmer-rocket-386.webp?v=388';
 const idleDurations=[390,95,440,440,390,95,440,440],cycle=idleDurations.reduce((a,b)=>a+b,0);
 const jetCanvas=document.createElement('canvas');jetCanvas.width=jetCanvas.height=320;const jetPaint=jetCanvas.getContext('2d');
 function jetSample(now){const t=now/1000,pulse=Math.max(.30,Math.min(1,.70+.22*Math.sin(t*29)+.13*Math.sin(t*71))),phase=now%1450;return {pulse,length:.50+.65*pulse,drop:phase<180?Math.sin(phase/180*Math.PI)*1.3:0};}
 function idleJets(col,now){
  const j=jetSample(now),c=jetPaint;c.clearRect(0,0,320,320);c.drawImage(image,col*320,0,320,274,0,0,320,274);
  c.save();c.globalAlpha=.38+.62*j.pulse;c.drawImage(image,col*320,274,320,46,0,274,320,46*j.length);c.globalCompositeOperation='screen';
  for(const x of [113,218]){const g=c.createRadialGradient(x,279,0,x,279,18+12*j.pulse);g.addColorStop(0,`rgba(165,216,255,${.50*j.pulse})`);g.addColorStop(.35,`rgba(156,95,255,${.25*j.pulse})`);g.addColorStop(1,'rgba(137,77,255,0)');c.fillStyle=g;c.fillRect(x-30,249,60,71);}c.restore();return jetCanvas;
 }
 const nativeTiming=skillVisualTiming;
 skillVisualTiming=function(caster,sk){const t=nativeTiming.apply(this,arguments);if(caster?.id!=='Glimmer'||caster.form!=='mech'||!['magic','ultimate'].includes(sk.anim)||!skillTargetsEnemies(sk))return t;const impactMs=sk.anim==='ultimate'?2050:1550,totalMs=impactMs+650;return {...t,impactMs,totalMs,impactTicks:Math.round(impactMs*.06),effectTicks:Math.ceil(totalMs*.06)};};
 const nativeEffect=makeBattleEffect;
 makeBattleEffect=function(caster,sk,target){const fx=nativeEffect.apply(this,arguments);if(fx?.characterVfx==='GlimmerMech'&&['projectile','ultimate'].includes(fx.vfxRow)){fx.duration=fx.timing.effectTicks;fx.impactTicks=fx.timing.impactTicks;}return fx;};
 function pose(unit,now=performance.now()){
  const owner=battle||unit;if(!clocks.has(owner))clocks.set(owner,now);
  if(unit.hp<=0||unit.anim==='death'){
   if(!deathClocks.has(unit))deathClocks.set(unit,now);
   return {row:4,col:Math.min(7,Math.floor((now-deathClocks.get(unit))/190))};
  }
  deathClocks.delete(unit);
  const fx=effect?.caster==='Glimmer'?effect:null;
  if(fx&&['melee','magic','ultimate','ultimate1','ultimate2'].includes(unit.anim)){
   const elapsed=Math.max(0,now-fx.startedAt),total=fx.timing?.totalMs||Math.max(650,(fx.duration||50)*1000/60);
   if(unit.anim==='melee'){
    const impact=fx.timing?.impactMs||total*.55;
    return {row:1,col:elapsed<impact?Math.min(4,Math.floor(elapsed/impact*5)):Math.min(7,5+Math.floor((elapsed-impact)/Math.max(1,total-impact)*3))};
   }
   return {row:unit.anim.startsWith('ultimate')?3:2,col:Math.min(7,Math.floor(elapsed/total*8))};
  }
  let t=((now-clocks.get(owner))%cycle+cycle)%cycle;
  for(let col=0;col<8;col++){if(t<idleDurations[col])return {row:0,col};t-=idleDurations[col];}
  return {row:0,col:0};
 }
 const native=drawBattlePartySprite;
 function hoverOwner(unit){return battle?.party?.find(u=>u.id===unit.id)||unit;}
 function hover(unit,now=performance.now()){
  const owner=hoverOwner(unit),previous=hoverStates.get(owner)||{x:0,y:0,at:now-16};
  const idle=unit.hp>0&&(unit.anim||'idle')==='idle'&&!(effect?.caster==='Glimmer'&&effect?.meleeMotion);
  const t=(now-(clocks.get(battle||unit)||now))/1000;
  const jet=jetSample(now),target=idle?{x:Math.sin(t*1.55)*1.5+Math.sin(t*4.3)*.25,y:-3.5-Math.sin(t*2.05)*2.1-Math.sin(t*5.1)*.45+jet.drop}: {x:0,y:0};
  const blend=1-Math.exp(-Math.min(80,Math.max(0,now-previous.at))/90);
  const next={x:previous.x+(target.x-previous.x)*blend,y:previous.y+(target.y-previous.y)*blend,at:now};
  hoverStates.set(owner,next);return next;
 }
 function ventSmoke(unit,x,y,scale,now=performance.now()){
  if(ctx.shadowOffsetX||ctx.shadowOffsetY||unit.hp<=0)return;
  const owner=hoverOwner(unit),fx=effect?.caster==='Glimmer'&&['magic','ultimate'].includes(effect.kind)?effect:null;
  let state=smokeStates.get(owner);
  if(fx&&now-fx.startedAt>90){state={start:fx.startedAt,last:now,strength:fx.kind==='ultimate'?1:.72};smokeStates.set(owner,state);}
  if(!state)return;
  const fade=Math.max(0,1-(now-state.last)/750);if(!fade){smokeStates.delete(owner);return;}
  ctx.save();ctx.beginPath();ctx.rect(0,20,LOGICAL_WIDTH,BATTLE_ARENA_HEIGHT-20);ctx.clip();
  for(const [i,point]of [[88,100],[120,83],[245,185]].entries())for(let j=0;j<3;j++){
   const age=((now-state.start)/1050+j/3+i*.17)%1,px=x+(point[0]-160)*scale+Math.sin(age*4+i)*1.1*age,py=y+(point[1]-298)*scale-age*6.5,radius=.65+age*2.3;
   const g=ctx.createRadialGradient(px,py,0,px,py,radius);g.addColorStop(0,`rgba(215,208,227,${.21*(1-age)*fade*state.strength})`);g.addColorStop(.5,`rgba(155,147,173,${.09*(1-age)*fade*state.strength})`);g.addColorStop(1,'rgba(135,129,153,0)');ctx.fillStyle=g;ctx.fillRect(px-radius,py-radius,radius*2,radius*2);
  }
  ctx.restore();
 }
 drawBattlePartySprite=function(unit,x,y,frame=tick){
  if(unit?.id!=='Glimmer'||unit.form!=='mech'||!loaded)return native.apply(this,arguments);
  const {row,col}=pose(unit),drift=hover(unit),scale=battleSpriteHeights.GlimmerMech*BATTLE_COMPOSITION_SCALE/260;
  const source=row===0?idleJets(col,performance.now()):image;
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(source,row===0?0:col*320,row===0?0:row*320,320,320,x+drift.x-160*scale,y+drift.y-298*scale,320*scale,320*scale);ventSmoke(unit,x+drift.x,y+drift.y,scale);ctx.restore();return true;
 };
 const nativeVfx=drawCharacterVfx;
 function missilePath(from,to,lane,t){
  const bands=[[-.18,0,.70,.08],[.12,.17,.94,0],[-.30,.68,.56,.25],[.32,.02,1.18,.32],[-.40,.87,.83,.62],[.42,.28,1.24,.02],[-.24,.48,.50,.05]],laneData=bands[lane%bands.length],dx=to.x-from.x,clampX=x=>Math.max(9,Math.min(LOGICAL_WIDTH-9,x)),band=v=>25+v*(BATTLE_ARENA_HEIGHT-45);
  const a={x:from.x-5,y:from.y-12},b={x:clampX(from.x+dx*laneData[0]),y:band(laneData[1])},c={x:clampX(from.x+dx*laneData[2]),y:band(laneData[3])};
  const v=1-t;return {x:v*v*v*a.x+3*v*v*t*b.x+3*v*t*t*c.x+t*t*t*to.x,y:v*v*v*a.y+3*v*v*t*b.y+3*v*t*t*c.y+t*t*t*to.y};
 }
 drawCharacterVfx=function(fx){
  if(fx?.characterVfx!=='GlimmerMech'||!['projectile','ultimate'].includes(fx.vfxRow)||!rocket.complete||!rocket.naturalWidth)return nativeVfx.apply(this,arguments);
  const elapsed=performance.now()-fx.startedAt;
  if(elapsed>=fx.timing.impactMs)return nativeVfx.apply(this,arguments);
  ctx.save();ctx.beginPath();ctx.rect(0,20,LOGICAL_WIDTH,BATTLE_ARENA_HEIGHT-20);ctx.clip();
  const from=battleVfxAnchor(fx.source),count=fx.vfxRow==='ultimate'?7:5;
  for(const target of (fx.targets||[]).slice(0,3)){const to=battleVfxAnchor(target);for(let n=0;n<count;n++){
   const launch=120+n*65,flight=Math.max(90,fx.timing.impactMs-launch),q=(elapsed-launch)/flight;if(q<0||q>1)continue;
   const t=q*q*(1.2-.2*q),point=missilePath(from,to,n,t),before=missilePath(from,to,n,Math.max(0,t-.012));
   ctx.save();ctx.strokeStyle='#d8b8ff';ctx.lineWidth=.9;ctx.globalAlpha=.42;ctx.beginPath();
   for(let k=0;k<15;k++){const p=missilePath(from,to,n,Math.max(0,t-.32+k*.32/14));if(k===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.stroke();
   for(let k=1;k<8;k++){const p=missilePath(from,to,n,Math.max(0,t-k*.04)),radius=1.1+k*.25,g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);g.addColorStop(0,`rgba(195,181,221,${.16-k*.017})`);g.addColorStop(1,'rgba(150,130,190,0)');ctx.globalAlpha=1;ctx.fillStyle=g;ctx.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);}
   ctx.globalAlpha=1;ctx.translate(point.x,point.y);ctx.rotate(Math.atan2(point.y-before.y,point.x-before.x));ctx.drawImage(rocket,-12,-7,24,15);ctx.restore();
  }}
  ctx.restore();
 };
 window.GlimmerMechAnimation={ready,pose,hover,missilePath,jetSample,offsetFor:unit=>unit?.id==='Glimmer'&&unit.form==='mech'?hoverStates.get(hoverOwner(unit)):null,get loaded(){return loaded;},idleDurations};
})();
