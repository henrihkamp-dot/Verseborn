/* Support-only performance. Offensive songs and weapon attacks stay native. */
(()=>{
 const art=new Image();let loaded=false;
 const ready=new Promise(resolve=>{art.onload=()=>{loaded=true;resolve(true);};art.onerror=()=>resolve(false);art.src='assets/sprites/flameguard-idle/verseborn-support-391.webp?v=391';});
 function isSupport(caster,sk){return !!sk&&caster?.id==='Verseborn'&&!skillTargetsEnemies(sk)&&!sk.basicAttack&&!sk.transform&&sk.name!=='Defend';}
 const nativeEffect=makeBattleEffect;
 makeBattleEffect=function(caster,sk,target){const fx=nativeEffect.apply(this,arguments);if(fx&&isSupport(caster,sk))fx.supportPerformance=true;return fx;};
 const nativeDraw=drawBattlePartySprite;
 drawBattlePartySprite=function(unit,x,y,frame=tick){
  const fx=effect;
  if(!loaded||unit.id!=='Verseborn'||unit.hp<=0||unit.anim==='idle'||unit.anim==='death'||!fx?.supportPerformance||fx.caster!==unit.id)return nativeDraw.apply(this,arguments);
  const progress=Math.max(0,Math.min(.999,(performance.now()-fx.startedAt)/(fx.timing?.totalMs||1200))),col=Math.min(7,Math.floor(progress*8)),scale=battleSpriteHeights.Verseborn*BATTLE_COMPOSITION_SCALE/264;
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(art,col*320,0,320,320,x-160*scale,y-295*scale,320*scale,320*scale);ctx.restore();return true;
 };
 window.VersebornSupport={ready,isSupport,get loaded(){return loaded;}};
})();
