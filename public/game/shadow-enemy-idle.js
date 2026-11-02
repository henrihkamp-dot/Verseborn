// All authored Shadow idle frames, registered to planted feet and blended through a seamless forward/reverse loop.
(() => {
 'use strict';
 const sheets=new Map(),clocks=new WeakMap(),mistFrames=new Map();
 const active=()=>Boolean(battle?.sparring&&state.gameMode==='hallBattles');
 function frameAt(c,elapsed){let t=((elapsed%c.cycleMs)+c.cycleMs)%c.cycleMs;for(let i=0;i<c.order.length;i++){if(t<c.durations[i])return c.order[i];t-=c.durations[i];}return c.order[0];}
 const ready=(async()=>{const response=await fetch('assets/sprites/shadow-idle-231/manifest.json?v=401');if(!response.ok)throw Error('Shadow idle manifest unavailable');const manifest=await response.json();await Promise.all(Object.entries(manifest).map(async([key,c])=>{const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Shadow idle '+key));image.src='assets/sprites/shadow-idle-231/'+c.file+'?v=401';});sheets.set(key,{...c,image});}));const mist=new Image();await new Promise((resolve,reject)=>{mist.onload=resolve;mist.onerror=()=>reject(Error('Shadow mist unavailable'));mist.src='assets/sprites/shadow-idle-231/mist.webp';});for(const color of ['#a22951','#892cc7']){const frames=[];for(let i=0;i<8;i++){const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const g=canvas.getContext('2d');g.drawImage(mist,i*256,0,256,256,0,0,256,256);g.globalCompositeOperation='source-in';g.fillStyle=color;g.fillRect(0,0,256,256);g.globalCompositeOperation='destination-in';const fade=g.createRadialGradient(128,128,58,128,128,128);fade.addColorStop(0,'#fff');fade.addColorStop(1,'#fff0');g.fillStyle=fade;g.fillRect(0,0,256,256);frames.push(canvas);}mistFrames.set(color,frames);}})();
 ready.catch(error=>console.error(error));
 function sampleAt(c,elapsed){
  let t=((elapsed%c.cycleMs)+c.cycleMs)%c.cycleMs;
  for(let i=0;i<c.order.length;i++){
   const duration=c.durations[i];if(t>=duration){t-=duration;continue;}
   const transition=Math.min(c.transitionMs||180,duration),p=Math.max(0,(t-duration+transition)/transition);
   return {from:c.order[i],to:c.order[(i+1)%c.order.length],mix:p*p*(3-2*p)};
  }
  return {from:c.order[0],to:c.order[0],mix:0};
 }
 function draw(c,sample,x,y,height){
  const scale=height/c.referenceHeight;ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  if(sample.mix===0||sample.from===sample.to){const [dx,dy]=c.frameOffsets?.[sample.from]||[0,0];ctx.drawImage(c.image,sample.from*c.cellWidth,0,c.cellWidth,c.cellHeight,x-(c.anchorX-dx)*scale,y-(c.baseline-dy)*scale,c.cellWidth*scale,c.cellHeight*scale);}
  else{
   const pad=c.blendPad??=Math.ceil(Math.max(0,...(c.frameOffsets||[]).flat().map(Math.abs)))+4;
   if(!c.blend){c.blend=document.createElement('canvas');c.blend.width=c.cellWidth+pad*2;c.blend.height=c.cellHeight+pad*2;}
   const g=c.blend.getContext('2d');g.clearRect(0,0,c.blend.width,c.blend.height);g.globalCompositeOperation='lighter';
   for(const [col,weight]of [[sample.from,1-sample.mix],[sample.to,sample.mix]]){const [dx,dy]=c.frameOffsets?.[col]||[0,0];g.globalAlpha=weight;g.drawImage(c.image,col*c.cellWidth,0,c.cellWidth,c.cellHeight,pad+dx,pad+dy,c.cellWidth,c.cellHeight);}
   g.globalAlpha=1;g.globalCompositeOperation='source-over';
   ctx.drawImage(c.blend,x-(c.anchorX+pad)*scale,y-(c.baseline+pad)*scale,c.blend.width*scale,c.blend.height*scale);
  }
  ctx.restore();
 }
 function mistAround(key,x,y,t,height,front){const frames=mistFrames.get(['Sparky','Mira'].includes(key)?'#892cc7':'#a22951');if(!frames)return;const phase=t/420+(front?3.6:0),index=Math.floor(phase)%8,mix=phase-Math.floor(phase),w=height*(front?1.05:1.35),h=height*(front?.58:1.05),dx=Math.sin(t/930+(front?2:0))*height*.04,dy=Math.cos(t/1170)*height*.025;ctx.save();ctx.imageSmoothingEnabled=true;const alpha=front?.12:.2;for(const [frame,weight]of [[index,1-mix],[(index+1)%8,mix]]){ctx.globalAlpha=alpha*weight;ctx.drawImage(frames[frame],x-w/2+dx,y-h+(front?height*.06:0)+dy,w,h);}ctx.restore();}
 const original=drawEnemy;
 function render(key,c,x,y,t,height){const visible=height*c.sourceBodyRatio;mistAround(key,x,y,t,visible,false);draw(c,sampleAt(c,t),x,y,height);mistAround(key,x,y,t,visible,true);}
 drawEnemy=function(unit,x,y){const c=sheets.get(unit.sparringId);if(!active()||!c||unit.hp<=0||['attack','death'].includes(unit.anim))return original(unit,x,y);const now=performance.now();if(!clocks.has(unit))clocks.set(unit,now-unit.sparringId.length*173);render(unit.sparringId,c,x+8,y+31,now-clocks.get(unit),(battleSpriteHeights[unit.sparringId]||54)*BATTLE_COMPOSITION_SCALE*2);return true;};
 window.ShadowEnemyIdle={ready,active,frameAt,sampleAt,preview(key,x,y,t,height=108){const c=sheets.get(key);if(c)render(key,c,x,y,t,height);},get manifest(){return Object.fromEntries(sheets);}};
})();

