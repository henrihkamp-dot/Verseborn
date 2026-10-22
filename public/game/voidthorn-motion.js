// Voidthorn Rain uses native dagger poses at each affected enemy, then returns home.
(()=>{
 const make=makeBattleEffect,motion=partyMeleeMotion,trail=drawMeleeChargeTrail;
 makeBattleEffect=function(caster,sk,target){const fx=make(caster,sk,target);if(caster.id==='Mira'&&sk.name==='Voidthorn Mark'&&fx.meleeMotion){fx.voidthornTargets=(sk.allEnemies?[target,...battle.enemies.filter(u=>u.hp>0&&u!==target)].slice(0,3):[target]).map(u=>{const i=battle.enemies.indexOf(u),[x,y]=enemyBattlePosition(i,battle.enemies.length);return {x:x-21,y,targetX:x,targetY:y-24}});}return fx;};
 partyMeleeMotion=function(unit,now=performance.now()){
  const m=motion(unit,now),fx=effect;if(!m||unit.id!=='Mira'||fx?.source!==unit||!fx.voidthornTargets)return m;
  const points=fx.voidthornTargets,elapsed=now-fx.startedAt,start=440,span=180,end=start+span*points.length,home=fx.meleeMotion.route.home;
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
  let x,y,sprinting=false,slash=false,index=0,direction=1;
  if(elapsed<start){const t=Math.max(0,Math.min(1,elapsed/start)),point=points[0];x=home[0]+(point.targetX-28-home[0])*t;y=home[1]+(point.y-home[1])*t;sprinting=true;}
  else if(elapsed<end){index=Math.min(points.length-1,Math.floor((elapsed-start)/span));const point=points[index],local=elapsed-start-index*span,from=index?{x:points[index-1].targetX+23,y:points[index-1].y}:{x:point.targetX-28,y:point.y};if(local<65){const t=smooth(local/65);x=from.x+(point.targetX-28-from.x)*t;y=from.y+(point.y-from.y)*t;sprinting=true;direction=point.targetX-28>=from.x?1:-1;}else{const t=(local-65)/115;x=point.targetX-28+51*t;y=point.y;slash=true;}}
  else{const point=points.at(-1),t=smooth((elapsed-end)/(fx.timing.totalMs-end));x=point.targetX+23+(home[0]-point.targetX-23)*t;y=point.y+(home[1]-point.y)*t;sprinting=true;direction=-1;index=points.length-1;}
  const point=points[index];fx.toX=point.targetX;fx.toY=point.targetY;
  return {...m,x,y,groundY:y,rotation:slash?-.05:0,lift:0,attackFrame:slash?(Math.floor((elapsed-start-index*span-65)/58)%2?3:2):-1,runFrame:-1,returning:elapsed>=end,voidthorn:true,voidSprint:sprinting,voidSlash:slash,voidDirection:direction,voidFrame:Math.floor(elapsed/65)%4,activity:1};
 };
 drawMeleeChargeTrail=function(unit,m){trail(unit,m);if(!m.voidthorn)return;ctx.save();ctx.globalCompositeOperation='screen';ctx.strokeStyle='#b36bff';ctx.shadowColor='#aa4dff';ctx.shadowBlur=5;ctx.lineWidth=1.5;ctx.globalAlpha=.65;const dir=m.returning?1:-1;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(m.x+dir*(9+i*4),m.y-12-i*5);ctx.quadraticCurveTo(m.x+dir*(19+i*6),m.y-21-i*4,m.x+dir*(29+i*7),m.y-15-i*4);ctx.stroke();}if(m.voidSlash){ctx.strokeStyle='#e3c0ff';ctx.beginPath();ctx.moveTo(effect.toX-10,effect.toY+9);ctx.lineTo(effect.toX+10,effect.toY-9);ctx.stroke();}ctx.restore();};
})();

// Show the real meter value and its ultimate spend, including healing ultimates.
(()=>{
 const original=renderBattle;
 function labels(){if(!battle)return;const enemy=document.querySelector('.hud-enemy-resonance>span'),party=document.querySelector('.hud-battle-resonance>span'),spent=battle.lastEnemyResonanceSpend;
  if(enemy)enemy.textContent='Enemy Resonance '+Math.round(battle.enemyResonance||0)+'/100'+(spent&&performance.now()-spent.at<1600?' · ULT −'+Math.round(spent.amount):'');
  if(party)party.textContent='Party Resonance '+Math.round(state.resonance||0)+'/100';
 }
 let timer=null;
 renderBattle=function(...args){const result=original(...args);labels();clearTimeout(timer);if(battle?.lastEnemyResonanceSpend){const owner=battle;timer=setTimeout(()=>{if(battle===owner&&mode==='battle')labels();},1650);}return result;};
})();
// Starflame Cut's holy light follows Seerin through the melee motion.
(()=>{
 const original=drawMeleeChargeTrail;
 drawMeleeChargeTrail=function(unit,m){
  if(unit.id==='Seerin'&&effect?.source===unit&&effect.skill==='Starflame Cut'){
   const height=(battleSpriteHeights.Seerin||54)*BATTLE_COMPOSITION_SCALE,centerY=m.y-height*.5;
   const elapsed=performance.now()-effect.startedAt,total=effect.timing.totalMs;
   const fade=Math.min(1,elapsed/150,(total-elapsed)/220);
   ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=Math.max(0,fade)*.75;
   const glow=ctx.createRadialGradient(m.x,centerY,2,m.x,centerY,height*.72);
   glow.addColorStop(0,'rgba(255,239,161,.5)');glow.addColorStop(.45,'rgba(255,196,64,.32)');glow.addColorStop(1,'rgba(255,170,25,0)');
   ctx.fillStyle=glow;ctx.fillRect(m.x-height,centerY-height,height*2,height*2);
   ctx.strokeStyle='#ffe89c';ctx.lineWidth=.8;ctx.shadowColor='#ffce54';ctx.shadowBlur=5;
   ctx.beginPath();ctx.ellipse(m.x,m.groundY+1,height*.34,height*.095,0,0,Math.PI*2);ctx.stroke();
   for(let i=0;i<7;i++){const phase=(elapsed/650+i/7)%1,x=m.x+Math.sin(i*2.4+elapsed/380)*height*.28,y=m.groundY-phase*height;ctx.globalAlpha=Math.max(0,fade)*Math.sin(phase*Math.PI)*.8;ctx.fillStyle='#fff3bc';ctx.fillRect(x,y,1,1.8);}
   ctx.restore();
  }
  return original(unit,m);
 };
})();


// Use Mira's complete directional walking drawings at sprint cadence, never an idle slide.
(()=>{const native=drawBattlePartySprite;drawBattlePartySprite=function(unit,x,y,...rest){const fx=effect;if(unit.id==='Mira'&&fx?.source?.id==='Mira'&&fx.voidthornTargets&&window.HallSpriteRefresh?.loaded){const m=partyMeleeMotion(fx.source);if(m?.voidSprint){return native({...unit,anim:'melee',voidSprintFrame:m.voidFrame,voidSprintDirection:m.voidDirection},x,y,...rest);}}return native(unit,x,y,...rest);};})();
