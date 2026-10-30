/* Only Glimmer's transformed artwork; native actions, damage and travel stay in charge. */
(()=>{
 'use strict';
 const image=new Image(),rocket=new Image(),clocks=new WeakMap(),deathClocks=new WeakMap();let loaded=false;
 const ready=new Promise(resolve=>{image.onload=()=>{loaded=true;resolve(true);};image.onerror=()=>resolve(false);image.src='assets/sprites/battle-v2/glimmer-mech.png?v=386';});
 rocket.src='assets/sprites/battle-v2/glimmer-rocket-386.webp?v=386';
 const idleDurations=[390,95,440,440,390,95,440,440],cycle=idleDurations.reduce((a,b)=>a+b,0);
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
 drawBattlePartySprite=function(unit,x,y,frame=tick){
  if(unit?.id!=='Glimmer'||unit.form!=='mech'||!loaded)return native.apply(this,arguments);
  const {row,col}=pose(unit),scale=battleSpriteHeights.GlimmerMech*BATTLE_COMPOSITION_SCALE/260;
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(image,col*320,row*320,320,320,Math.round(x-160*scale),Math.round(y-298*scale),320*scale,320*scale);ctx.restore();return true;
 };
 const nativeVfx=drawCharacterVfx;
 drawCharacterVfx=function(fx){
  if(fx?.characterVfx!=='GlimmerMech'||fx.vfxRow!=='projectile'||!rocket.complete||!rocket.naturalWidth)return nativeVfx.apply(this,arguments);
  const elapsed=performance.now()-fx.startedAt;
  if(elapsed>=fx.timing.impactMs)return nativeVfx.apply(this,arguments);
  ctx.save();ctx.beginPath();ctx.rect(0,20,LOGICAL_WIDTH,BATTLE_ARENA_HEIGHT-20);ctx.clip();
  for(const target of fx.targets||[]){for(let n=0;n<3;n++){const time=elapsed-n*55;if(time<100)continue;const s=characterVfxSample(fx,target,time);if(s.phase!=='travel')continue;ctx.save();ctx.translate(s.x,s.y+(n-1)*3);ctx.rotate(Math.atan2(s.to.y-s.from.y,s.to.x-s.from.x));ctx.drawImage(rocket,-12,-8,24,17);ctx.restore();}}
  ctx.restore();
 };
 window.GlimmerMechAnimation={ready,pose,get loaded(){return loaded;},idleDurations};
})();
