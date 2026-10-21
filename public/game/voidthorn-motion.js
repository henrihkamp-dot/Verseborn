// Voidthorn Rain uses native dagger poses at each affected enemy, then returns home.
(()=>{
 const make=makeBattleEffect,motion=partyMeleeMotion,trail=drawMeleeChargeTrail;
 makeBattleEffect=function(caster,sk,target){const fx=make(caster,sk,target);if(caster.id==='Mira'&&sk.name==='Voidthorn Mark'&&fx.meleeMotion){fx.voidthornTargets=(sk.allEnemies?battle.enemies.filter(u=>u.hp>0):[target]).map(u=>{const i=battle.enemies.indexOf(u),[x,y]=enemyBattlePosition(i,battle.enemies.length);return {x:x-21,y,targetX:x,targetY:y-24}});}return fx;};
 partyMeleeMotion=function(unit,now=performance.now()){
  const m=motion(unit,now),fx=effect;if(!m||unit.id!=='Mira'||fx?.source!==unit||!fx.voidthornTargets)return m;
  const points=fx.voidthornTargets,elapsed=now-fx.startedAt,start=530,end=1130,home=fx.meleeMotion.route.home;
  if(elapsed<start)return m;
  const span=(end-start)/points.length,index=Math.min(points.length-1,Math.floor((elapsed-start)/span)),point=points[index];let x,y;
  if(elapsed<end){const from=index?points[index-1]:points[0],t=Math.min(1,Math.max(0,(elapsed-start-index*span)/Math.min(100,span*.45))),smooth=t*t*(3-2*t);x=from.x+(point.x-from.x)*smooth;y=from.y+(point.y-from.y)*smooth;}
  else {const from=points.at(-1),t=Math.min(1,(elapsed-end)/(fx.timing.totalMs-end)),smooth=t*t*(3-2*t);x=from.x+(home[0]-from.x)*smooth;y=from.y+(home[1]-from.y)*smooth;}
  fx.toX=point.targetX;fx.toY=point.targetY;
  return {...m,x,y:y-3,groundY:y,rotation:elapsed<end?Math.sin((elapsed-start)/45)*.06:0,lift:3,attackFrame:elapsed<end?(Math.floor((elapsed-start)/70)%2?3:2):-1,returning:elapsed>=end,voidthorn:true,activity:1};
 };
 drawMeleeChargeTrail=function(unit,m){trail(unit,m);if(!m.voidthorn)return;ctx.save();ctx.globalCompositeOperation='screen';ctx.strokeStyle='#b36bff';ctx.shadowColor='#aa4dff';ctx.shadowBlur=5;ctx.lineWidth=1.5;ctx.globalAlpha=.65;const dir=m.returning?1:-1;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(m.x+dir*(9+i*4),m.y-12-i*5);ctx.quadraticCurveTo(m.x+dir*(19+i*6),m.y-21-i*4,m.x+dir*(29+i*7),m.y-15-i*4);ctx.stroke();}if(!m.returning){ctx.strokeStyle='#e3c0ff';ctx.beginPath();ctx.moveTo(effect.toX-10,effect.toY+9);ctx.lineTo(effect.toX+10,effect.toY-9);ctx.stroke();}ctx.restore();};
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
