// Grumm's physical whirlwind uses the three staggered native hits and attack row.
(()=>{'use strict';
 const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 const spinImage=new Image();let spinReady=false;spinImage.onload=()=>{spinReady=true;};spinImage.src='assets/sprites/grumm-whirlwind-430.webp?v=430';
 const make=makeEnemyBattleEffect;
 makeEnemyBattleEffect=function(unit,target,action){const fx=make.apply(this,arguments);if(!fx||!action.grummWhirlwind)return fx;
  delete fx.defaultEnemyVfx;
  fx.timing={effectTicks:240,impactTicks:66,impactMs:1100,totalMs:4000,hitSpacingMs:700};
  const targets=enemyTargetsForAction(unit,action,target).filter(u=>u.hp>0);
  fx.grummWhirlwind={source:unit,targets,origin:battleVfxAnchor(unit),points:targets.map(battleVfxAnchor)};return fx;};
 function sample(fx,now=performance.now()){
  const age=Math.max(0,now-fx.startedAt),total=fx.timing.totalMs,impact=fx.timing.impactMs;
  const {origin,points}=fx.grummWhirlwind;
  const hitTimes=points.map((_,i)=>impact+i*fx.timing.hitSpacingMs);
  const stops=[{time:350,point:origin},...points.map((p,i)=>({time:hitTimes[i],point:{x:p.x+14,y:p.y}})),{time:total-100,point:origin}];
  let from=stops[0],to=stops[0];
  for(let i=1;i<stops.length;i++){to=stops[i];if(age<=to.time)break;from=to;}
  const progress=ease((age-from.time)/Math.max(1,to.time-from.time));
  const weight=age<350?0:age>hitTimes.at(-1)?1-ease((age-hitTimes.at(-1))/(total-100-hitTimes.at(-1))):1;
  return {age,total,impact,weight,hitTimes,x:from.point.x+(to.point.x-from.point.x)*progress,y:from.point.y+(to.point.y-from.point.y)*progress,origin,points,spin:age/total*Math.PI*6,alpha:Math.max(0,Math.min(1,age/250,(total-age)/350))};
 }
 function render(fx,now=performance.now()){
  const s=sample(fx,now);if(s.age>=s.total){if(effect===fx)effect=null;return;}
  ctx.save();ctx.globalAlpha=Math.max(0,s.alpha);ctx.lineCap='round';
  // The animated sprite supplies the actual wind and weapon sweep.
  for(const [i,p] of s.points.entries()){const since=s.age-s.hitTimes[i];if(since<0||since>=240)continue;ctx.globalAlpha=(1-since/240)*.8;ctx.strokeStyle='#fff2cb';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(p.x-8,p.y+7);ctx.bezierCurveTo(p.x+5,p.y+2,p.x-5,p.y-4,p.x+8,p.y-9);ctx.stroke();}
  ctx.restore();
 }
 const draw=drawEffect;drawEffect=function(){if(effect?.grummWhirlwind)return render(effect);return draw.apply(this,arguments);};
 const enemy=drawEnemy;drawEnemy=function(unit,x,y,...rest){const fx=effect;if(fx?.grummWhirlwind?.source!==unit)return enemy.call(this,unit,x,y,...rest);const s=sample(fx);if(s.age>=s.total)return enemy.call(this,unit,x,y,...rest);
  // Translate the original draw coordinates: drawing at (0,0) changes native
  // baseline-based sprite sizing and made the previous version shrink.
  const animTick=unit.animTick;ctx.save();ctx.translate(s.x-s.origin.x,s.y-s.origin.y);
  const key=enemyAnimationKey(unit),sheet=enemyAnimationSheets[key];
  if(spinReady&&sheet){
    const frame=Math.floor(Math.max(0,s.age-200)/100)%12;
    enemyAnimationSheets[key]={...sheet,image:spinImage,columns:12,rows:1,cellWidth:256,cellHeight:256,referenceHeight:170,baseline:232,
      rowMap:{idle:0,melee:0,magic:0,ultimate:0,death:0},frameSequences:{melee:[frame],magic:[frame],ultimate:[frame]}};
  }
  unit.animTick=Math.floor(s.age/110)%24;
  try{return enemy.call(this,unit,x,y,...rest);}finally{if(sheet)enemyAnimationSheets[key]=sheet;unit.animTick=animTick;ctx.restore();}};
 window.GrummWhirlwind={sample,render,get spriteReady(){return spinReady;}};
})();
