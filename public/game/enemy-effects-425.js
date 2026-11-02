// Shared illustrated fallback VFX. Authored encounter/boss effects retain priority.
(()=>{
 'use strict';
 const BASE='assets/effects/enemy-425/',families=['fire','frost','storm','shadow','nature','holy','tech','physical'];
 const images=new Map(),jobs=new Map(),failed=new Set();
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 function load(key){if(images.has(key))return Promise.resolve(true);if(jobs.has(key))return jobs.get(key);const job=new Promise(resolve=>{const im=new Image();im.onload=()=>{images.set(key,im);failed.delete(key);resolve(true);};im.onerror=()=>{failed.add(key);resolve(false);};im.src=key==='heal'?'assets/effects/recipient-heal-396.webp':key==='buff'?'assets/effects/recipient-buff-392.webp?v=392':BASE+key+'.webp?v=425';}).finally(()=>jobs.delete(key));jobs.set(key,job);return job;}
 function family(unit,action={}){
  const explicit=action.vfxFamily||unit.defaultVfxFamily;if(families.includes(explicit))return explicit;
  if(action.kind==='melee')return 'physical';
  const element=String(action.element||enemyAbilityProfile(unit)?.element||'Physical').toLowerCase(),name=String(action.name||'').toLowerCase();
  if(/ice|frost|winter/.test(element)||/ice|frost|glacier/.test(name))return 'frost';
  if(/holy|sigil|heart|sound/.test(element))return 'holy';
  if(/fire|flame/.test(element))return 'fire';
  if(/lightning|thunder|electric|storm/.test(element))return 'storm';
  if(/tech|mechanic/.test(element)||/rocket|cannon|clockwork|grenade/.test(name))return 'tech';
  if(/earth|poison|nature|wood/.test(element))return 'nature';
  if(/shadow|arcane|void|dark/.test(element))return 'shadow';
  return 'physical';
 }
 function custom(fx){return Boolean(fx&&(fx.riftVfx||fx.shadowTrialKey||fx.shadowTinusFx||fx.whirlpoolKey||fx.whirlpoolMinionVfx||fx.whirlpoolMelee||fx.whirlpoolSupport||fx.characterVfx||fx.bossSheetVfx&&typeof endgameBossVfxSheets!=='undefined'&&endgameBossVfxSheets[fx.caster]));}
 function supportKind(action){return action.healing?'heal':['buff','cleanse','utility'].includes(action.kind)||action.buffs?.length&&!action.coefficient&&!action.damaging?'buff':null;}
 function recipients(unit,target,action){const allies=Boolean(supportKind(action));return (allies?((action.allAllies||supportKind(action)&&action.kind==='ultimate')?battle.enemies:[battle.enemies.includes(action.target)?action.target:battle.enemies.includes(target)?target:unit]):action.allTargets?battle.party:[target]).filter(u=>u&&u.hp>0);}
 function anchor(u){if(typeof battleVfxAnchor==='function')return battleVfxAnchor(u);const i=battle.party.indexOf(u),[x,y]=i>=0?partyBattlePosition(i,battle.party.length):enemyBattlePosition(Math.max(0,battle.enemies.indexOf(u)),battle.enemies.length);return{x,y:y-25};}
 const prepare=prepareEnemyForBattle;
 prepareEnemyForBattle=function(source,...args){const unit=prepare(source,...args);if((mode==='battle'||mode==='hallMap')&&!unit.riftKey&&!unit.shadowTrialKey&&!unit.shadowTinusBoss&&!unit.shadowTinusClone&&!unit.whirlpoolKey&&!unit.whirlpoolMinion){load(family(unit));load('physical');load('heal');load('buff');}return unit;};
 const begin=startBattle;
 startBattle=function(...args){const result=begin.apply(this,args);for(const unit of battle?.enemies||[]){if(unit.riftKey||unit.shadowTrialKey||unit.shadowTinusBoss||unit.shadowTinusClone||unit.whirlpoolKey||unit.whirlpoolMinion)continue;load(family(unit));load('physical');}load('heal');load('buff');return result;};
 const make=makeEnemyBattleEffect;
 makeEnemyBattleEffect=function(unit,target,action){const fx=make.apply(this,arguments);if(!fx||custom(fx))return fx;const key=family(unit,action),support=supportKind(action);
  fx.defaultEnemyVfx={key,source:unit,target,recipients:recipients(unit,target,action),kind:action.kind,support};load(support||key);return fx;
 };
 function sample(fx,now=performance.now()){
  const timing=fx.timing||battleActionTiming(fx.kind),age=Math.max(0,now-fx.startedAt),total=timing.totalMs||1200,impact=Math.max(1,Math.min(total-1,timing.impactMs||640)),launch=impact*.26;
  return{age,total,impact,launch,charge:Math.min(1,age/Math.max(1,launch)),travel:Math.max(0,Math.min(1,(age-launch)/(impact-launch))),after:Math.max(0,Math.min(1,(age-impact)/(total-impact))),ended:age>=total};
 }
 function paint(key,row,frame,x,y,size,rotation=0,alpha=1){const im=images.get(key);if(!im||alpha<=0)return;const cell=im.width/4,sw=cell,sh=im.height/4;ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,alpha));ctx.translate(x,y);if(rotation)ctx.rotate(rotation);ctx.drawImage(im,Math.max(0,Math.min(3,Math.floor(frame)))*sw,row*sh,sw,sh,-size/2,-size/2,size,size);ctx.restore();}
 function supportArt(key,phase,targets){const im=images.get(key);if(!im)return;const index=Math.min(7,Math.floor(phase*8)),alpha=Math.min(1,phase*8,(1-phase)*5);for(const u of targets){const p=anchor(u);ctx.save();ctx.globalAlpha*=Math.max(0,alpha);ctx.drawImage(im,index*256,0,256,256,p.x-32,p.y-34,64,68);ctx.restore();}}
 function render(fx,now=performance.now()){
  const v=fx?.defaultEnemyVfx;if(!v)return false;const s=sample(fx,now);if(s.ended){if(effect===fx)effect=null;return true;}
  fx.t=s.age/s.total*(fx.duration||64);ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.shadowBlur=0;ctx.filter='none';ctx.beginPath();ctx.rect(0,20,LOGICAL_WIDTH,BATTLE_ARENA_HEIGHT-20);ctx.clip();
  if(v.support){supportArt(v.support,s.age/s.total,v.recipients);}
  else{
   const origin=anchor(v.source),points=v.recipients.filter(u=>u.hp>0).map(anchor),ult=v.kind==='ultimate',melee=v.kind==='melee';
   if(!melee&&s.age<s.launch)paint(v.key,0,s.charge*4,origin.x,origin.y,ult?52:30,0,Math.min(1,s.charge*3));
   if(!melee&&s.age>=s.launch&&s.age<s.impact){for(const p of points){const t=s.travel,x=origin.x+(p.x-origin.x)*t,y=origin.y+(p.y-origin.y)*t-(v.key==='tech'||v.key==='nature'?Math.sin(t*Math.PI)*10:0),angle=Math.atan2(p.y-origin.y,p.x-origin.x)-Math.PI;paint(v.key,1,s.travel*4,x,y,ult?57:v.key==='physical'?39:36,angle);}}
   if(s.age>=s.impact){for(const p of points){const fade=Math.min(1,(1-s.after)*4);if(ult){const rowPhase=Math.min(3,s.after*4);paint(v.key,3,rowPhase,p.x,p.y-9,128*(.84+.16*smooth(Math.min(1,s.after*2))),0,fade);if(s.after<.45)paint(v.key,2,s.after/.45*4,p.x,p.y,65,0,Math.min(1,(.45-s.after)*5));}else paint(v.key,2,s.after*4,p.x,p.y,melee?54:63,0,fade);}}
  }
  ctx.restore();return true;
 }
 function meleeOffset(unit,now=performance.now()){
  const fx=effect,v=fx?.defaultEnemyVfx;if(v?.source!==unit||v.kind!=='melee'||v.support||!battle.party.includes(v.target))return[0,0];const s=sample(fx,now);if(s.ended)return[0,0];
  const i=battle.enemies.indexOf(unit),[x,y]=enemyBattlePosition(Math.max(0,i),battle.enemies.length),[tx,ty]=partyBattlePosition(battle.party.indexOf(v.target),battle.party.length),arrive=s.impact*.78,leave=s.impact+Math.min(100,(s.total-s.impact)*.25),weight=s.age<arrive?smooth(s.age/arrive):s.age<leave?1:1-smooth((s.age-leave)/(s.total-leave));return[(tx+27-x)*weight,(ty-y)*weight];
 }
 const draw=drawEffect;drawEffect=function(){if(effect?.defaultEnemyVfx)return render(effect);return draw.apply(this,arguments);};
 const enemy=drawEnemy;drawEnemy=function(unit,x,y,...rest){const [dx,dy]=meleeOffset(unit);return enemy.call(this,unit,x+dx,y+dy,...rest);};
 window.EnemyEffectArt={families,load,family,custom,recipients,sample,render,meleeOffset,loaded:key=>images.has(key),retry:key=>{failed.delete(key);return load(key);},get failures(){return [...failed];},get ready(){return Promise.all([...jobs.values()]);}};
})();
