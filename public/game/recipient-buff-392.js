/* Draw authored buff artwork at the recipient; never fire it as a projectile. */
(()=>{
 const art=new Image();let loaded=false;
 const ready=new Promise(resolve=>{art.onload=()=>{loaded=true;resolve(true);};art.onerror=()=>resolve(false);art.src='assets/effects/recipient-buff-392.webp?v=392';});
 function isBuff(caster,sk){return !!sk&&!!caster?.id&&!sk.transform&&!sk.basicAttack&&sk.name!=='Defend'&&sk.power>=0&&!skillTargetsEnemies(sk)&&!!(sk.buffs?.length||sk.partyWide||['self','ally','party'].includes(sk.targetSide));}
 const nativeEffect=makeBattleEffect;
 makeBattleEffect=function(caster,sk,target){const fx=nativeEffect.apply(this,arguments);if(fx&&isBuff(caster,sk)){fx.recipientBuff=true;fx.buffRecipients=characterVfxTargets(caster,sk,target);}return fx;};
 function frameAt(fx,now=performance.now()){const start=(fx.timing?.impactMs||780)-190,age=now-fx.startedAt-start,duration=620;return age<0||age>=duration?null:{frame:Math.min(7,Math.floor(age/duration*8)),alpha:Math.max(0,Math.min(1,age/90,(duration-age)/140))*.85};}
 const nativeDraw=drawCharacterVfx;
 drawCharacterVfx=function(fx){
  if(!loaded||!fx?.recipientBuff)return nativeDraw.apply(this,arguments);
  const pose=frameAt(fx);if(!pose)return;
  ctx.save();ctx.beginPath();ctx.rect(0,20,LOGICAL_WIDTH,BATTLE_ARENA_HEIGHT-20);ctx.clip();ctx.globalAlpha*=pose.alpha;ctx.imageSmoothingEnabled=true;
  for(const u of fx.buffRecipients||[]){if(u.hp<=0)continue;const i=battle.party.indexOf(u),j=battle.enemies.indexOf(u);if(i<0&&j<0)continue;const [x,y]=i>=0?partyBattlePosition(i,battle.party.length):enemyBattlePosition(j,battle.enemies.length),b=window.BattleCommandUI?.boundsFor(u),height=Math.max(35,Math.min(85,(b?.height||48)*1.08)),width=Math.max(32,Math.min(78,(b?.width||32)*1.42));ctx.drawImage(art,pose.frame*256,0,256,256,x+(b?.dx||0)-width/2,y+(b?.dy||0)-height*.83,width,height);}
  ctx.restore();
 };
 window.RecipientBuffArt={ready,isBuff,frameAt,get loaded(){return loaded;}};
})();
