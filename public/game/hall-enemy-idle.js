// Individually drawn complete-character idle sequences for normal Ember Hall battles.
(() => {
 'use strict';
 const sheets=new Map(),clocks=new WeakMap();
 const normalHall=()=>Boolean(battle?.hallStage>=1&&battle.hallStage<=60&&!battle.riftEncounter&&!battle.shadowDuel&&!battle.whirlpoolEncounter);
 function frameAt(config,elapsed){
  let phase=((elapsed%config.cycleMs)+config.cycleMs)%config.cycleMs;
  for(let i=0;i<config.order.length;i++){if(phase<config.durations[i])return config.order[i];phase-=config.durations[i];}
  return config.order[0];
 }
 const ready=(async()=>{
  const response=await fetch('assets/sprites/hall-idle-230/manifest.json?v=230');
  if(!response.ok)throw Error('Hall idle manifest unavailable');
  const manifest=await response.json();
  await Promise.all(Object.entries(manifest).map(async([key,config])=>{
   const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Hall idle '+key));image.src='assets/sprites/hall-idle-230/'+config.file;});
   sheets.set(key,{...config,image});
  }));
 })();ready.catch(error=>console.error(error));
 function draw(sheet,col,anchorX,baseline,height){
  const scale=Math.min(height/sheet.referenceHeight,(baseline-24)/sheet.baseline,(LOGICAL_WIDTH-10)/sheet.cellWidth);
  const x=Math.max(5,Math.min(LOGICAL_WIDTH-sheet.cellWidth*scale-5,anchorX-sheet.anchorX*scale));
  ctx.save();ctx.imageSmoothingEnabled=true;
  ctx.drawImage(sheet.image,col*sheet.cellWidth,0,sheet.cellWidth,sheet.cellHeight,x,baseline-sheet.baseline*scale,sheet.cellWidth*scale,sheet.cellHeight*scale);
  ctx.restore();
 }
 const original=drawAnimatedEnemy;
 drawAnimatedEnemy=function(unit,px,py){
  const key=enemyAnimationKey(unit),sheet=sheets.get(key);
  if(!normalHall()||!sheet||unit.hp<=0||['attack','death'].includes(unit.anim))return original(unit,px,py);
  const now=performance.now();if(!clocks.has(unit))clocks.set(unit,now-battle.enemies.indexOf(unit)*337);
  const col=frameAt(sheet,now-clocks.get(unit));
  draw(sheet,col,px+8,py+31,(enemyAnimationHeights[key]||46)*enemyBattleScale(key)*BATTLE_COMPOSITION_SCALE);
  return true;
 };
 window.HallEnemyIdle={ready,normalHall,frameAt,preview(key,x,y,elapsed,height=76){const sheet=sheets.get(key);if(sheet)draw(sheet,frameAt(sheet,elapsed),x,y,height);},get manifest(){return Object.fromEntries(sheets);}};
})();
