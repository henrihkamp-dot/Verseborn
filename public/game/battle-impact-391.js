/* Read-only impact feedback driven by the native combat results. */
(()=>{
 let owner=null,events=[];const guards=new WeakMap();
 function reset(){if(owner!==battle){owner=battle;events=[];}}
 function queue(target,kind,delay=0){reset();const now=performance.now()+delay;
  if(events.some(e=>e.target===target&&e.kind===kind&&Math.abs(e.at-now)<95))return;
  events.push({target,kind,at:now,duration:kind==='heal'?550:kind==='barrier'||kind==='guard'?340:kind==='crit'?290:190});if(events.length>36)events.splice(0,events.length-36);
 }
 const nativeFloater=addBattleFloater;
 addBattleFloater=function(target,amount,options={}){
  const result=nativeFloater.apply(this,arguments),kind=options.kind||'damage';
  if(!battle||mode!=='battle'||!(amount>0))return result;
  const delay=(options.delayTicks||0)*1000/60;
  if(kind==='heal')queue(target,'heal',delay);
  else if(kind==='damage'&&!/poison|burn|bleed/i.test(options.damageType||'')){
   queue(target,options.crit?'crit':'hit',delay);
   if(statusValue(target,'barrier')>0||statusValue(target,'mechGuard')>0)queue(target,'barrier',delay);
   else if(target.guarding||guards.get(target))queue(target,'guard',delay);
  }
  return result;
 };
 function location(u){const index=battle.party.indexOf(u),enemyIndex=battle.enemies.indexOf(u);if(index<0&&enemyIndex<0)return null;const [x,y]=index>=0?partyBattlePosition(index,battle.party.length):enemyBattlePosition(enemyIndex,battle.enemies.length),b=window.BattleCommandUI?.boundsFor(u);return {x:x+(b?.dx||0),y:y+(b?.dy||0)-(b?.height||45)*.48,ground:y+(b?.dy||0),radius:Math.min(24,Math.max(10,(b?.width||30)*.48))};}
 function draw(now){reset();events=events.filter(e=>now<e.at+e.duration);ctx.save();ctx.beginPath();ctx.rect(0,20,LOGICAL_WIDTH,BATTLE_ARENA_HEIGHT-20);ctx.clip();
  for(const event of events){const age=now-event.at;if(age<0)continue;const p=location(event.target);if(!p)continue;const t=age/event.duration,fade=(1-t)*(1-t);ctx.save();ctx.globalAlpha=fade;
   if(event.kind==='heal'){
    ctx.translate(p.x,p.ground-1);ctx.scale(1,.30);ctx.strokeStyle='#8eeec0';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,0,p.radius*(.5+t*.6),p.radius*(.5+t*.6),0,0,Math.PI*2);ctx.stroke();ctx.restore();ctx.save();ctx.globalAlpha=fade;
    for(let i=0;i<3;i++){const x=p.x+(i-1)*p.radius*.46,y=p.ground-5-t*20-i*3,g=ctx.createRadialGradient(x,y,0,x,y,3);g.addColorStop(0,'#ceffe9');g.addColorStop(1,'#76e4b000');ctx.fillStyle=g;ctx.fillRect(x-3,y-3,6,6);}
   }else if(event.kind==='barrier'||event.kind==='guard'){
    const r=p.radius*(.88+t*.12);ctx.translate(p.x,p.y);ctx.strokeStyle=event.kind==='barrier'?'#9ceafa':'#ffe3a0';ctx.lineWidth=1.25;ctx.fillStyle=event.kind==='barrier'?'#8adaf51c':'#e5c37a15';ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r*.66,-r*.6);ctx.lineTo(r*.61,r*.28);ctx.quadraticCurveTo(r*.32,r*.8,0,r);ctx.quadraticCurveTo(-r*.32,r*.8,-r*.61,r*.28);ctx.lineTo(-r*.66,-r*.6);ctx.closePath();ctx.fill();ctx.stroke();
   }else{
    const crit=event.kind==='crit',r=(crit?11:6)*(1+t*.45),g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);g.addColorStop(0,crit?'#fff2bbbf':'#fff2dd88');g.addColorStop(1,'#ffcb7100');ctx.fillStyle=g;ctx.fillRect(p.x-r,p.y-r,r*2,r*2);ctx.strokeStyle=crit?'#ffe19a':'#fff1d9';ctx.lineWidth=crit?1.25:.9;
    for(let i=0;i<(crit?6:2);i++){const a=i*Math.PI/(crit?3:2)+.45;ctx.beginPath();ctx.moveTo(p.x-Math.cos(a)*r*.8,p.y-Math.sin(a)*r*.8);ctx.lineTo(p.x+Math.cos(a)*r*.8,p.y+Math.sin(a)*r*.8);ctx.stroke();}
   }
   ctx.restore();
  }ctx.restore();
 }
 const nativeScene=drawBattleScene;
 drawBattleScene=function(...args){reset();for(const u of [...battle.party,...battle.enemies])guards.set(u,!!u.guarding);const result=nativeScene.apply(this,args);draw(performance.now());return result;};
 window.BattleImpact={get active(){return events.map(e=>({kind:e.kind,target:e.target.id||e.target.name}));}};
})();
