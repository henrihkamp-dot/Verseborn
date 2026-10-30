/* Restorative artwork surrounds the actual recipients; no incoming beams. */
(()=>{
 const art=new Image();let loaded=false;
 const ready=new Promise(resolve=>{art.onload=()=>{loaded=true;resolve(true);};art.onerror=()=>resolve(false);art.src='assets/effects/recipient-heal-396.webp';});
 function isHealing(caster,sk){return !!caster?.id&&battle?.party.includes(caster)&&!!sk&&sk.power<0&&!sk.transform&&!sk.basicAttack;}
 function recipients(caster,sk,target){
  if(!sk.partyWide&&!(talentValue(caster.id,'partyHeal',sk.name)>0)&&sk.riftSecret&&sk.targetSide==='ally'&&battle.party.includes(target)&&target.hp>0)return [target];
  return characterVfxTargets(caster,sk,target);
 }
 const nativeEffect=makeBattleEffect;
 makeBattleEffect=function(caster,sk,target){
  const fx=nativeEffect.apply(this,arguments);
  if(fx&&loaded&&isHealing(caster,sk)){
   fx.recipientHealing=true;fx.healRecipients=recipients(caster,sk,target);fx.healRevive=!!sk.revive;
   fx.characterVfx ||= battleVisualId(caster);fx.timing ||= skillVisualTiming(caster,sk);fx.startedAt ??= performance.now();
  }
  return fx;
 };
 function frameAt(fx,now=performance.now()){
  const start=(fx.timing?.impactMs||780)-260,age=now-fx.startedAt-start,duration=Math.max(420,Math.min(820,(fx.timing?.totalMs||1500)-start-20));
  return age<0||age>=duration?null:{frame:Math.min(7,Math.floor(age/duration*8)),alpha:Math.max(0,Math.min(1,age/85,(duration-age)/150))*.98};
 }
 const nativeDraw=drawCharacterVfx;
 drawCharacterVfx=function(fx){
  if(!loaded||!fx?.recipientHealing)return nativeDraw.apply(this,arguments);
  const pose=frameAt(fx);if(!pose)return;
  ctx.save();ctx.beginPath();ctx.rect(0,20,LOGICAL_WIDTH,BATTLE_ARENA_HEIGHT-20);ctx.clip();ctx.globalAlpha*=pose.alpha;ctx.imageSmoothingEnabled=true;
  for(const u of fx.healRecipients||[]){
   if(u.hp<=0&&!fx.healRevive)continue;const i=battle.party.indexOf(u);if(i<0)continue;
   const [x,y]=partyBattlePosition(i,battle.party.length),b=window.BattleCommandUI?.boundsFor(u),height=Math.max(48,Math.min(130,(b?.height||48)*1.5)),width=Math.max(46,Math.min(120,(b?.width||32)*1.95));
   ctx.drawImage(art,pose.frame*256,0,256,256,x+(b?.dx||0)-width/2,y+(b?.dy||0)-height*.83,width,height);
  }
  ctx.restore();
 };
 window.RecipientHealingArt={ready,isHealing,recipients,frameAt,get loaded(){return loaded;}};
})();
