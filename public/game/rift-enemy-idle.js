// New whole-character idle drawings for Rift battles. Native combat rows remain in use.
(() => {
  'use strict';
  const sheets=new Map(),clocks=new WeakMap(),buffers=new Map();
  function phaseAt(config,elapsed){
    let t=((elapsed%config.cycleMs)+config.cycleMs)%config.cycleMs;
    for(let i=0;i<config.durations.length;i++){
      const duration=config.durations[i];
      if(t<duration){const transition=Math.min(180,duration*.4);return {frame:i,next:(i+1)%8,mix:Math.max(0,(t-duration+transition)/transition)};}
      t-=duration;
    }
    return {frame:0,next:1,mix:0};
  }
  const ready=(async()=>{
    const response=await fetch('assets/rift/idle-245/manifest.json?v=245');if(!response.ok)throw Error('Rift idle manifest unavailable');
    const manifest=await response.json();
    await Promise.all(Object.entries(manifest).map(async([key,c])=>{const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Rift idle '+key));image.src='assets/rift/idle-245/'+c.file;});sheets.set(key,{...c,image});}));
  })();ready.catch(error=>console.error(error));
  function blendedFrame(key,c,phase){
    let canvas=buffers.get(key);if(!canvas){canvas=document.createElement('canvas');canvas.width=c.cellWidth;canvas.height=c.cellHeight;buffers.set(key,canvas);}
    const paint=canvas.getContext('2d');paint.clearRect(0,0,canvas.width,canvas.height);paint.globalCompositeOperation='source-over';paint.globalAlpha=1-phase.mix;
    paint.drawImage(c.image,phase.frame*c.cellWidth,0,c.cellWidth,c.cellHeight,0,0,c.cellWidth,c.cellHeight);
    if(phase.mix){paint.globalCompositeOperation='lighter';paint.globalAlpha=phase.mix;paint.drawImage(c.image,phase.next*c.cellWidth,0,c.cellWidth,c.cellHeight,0,0,c.cellWidth,c.cellHeight);}
    paint.globalAlpha=1;paint.globalCompositeOperation='source-over';return canvas;
  }
  function draw(key,c,x,y,elapsed,height){
    const scale=height/c.referenceHeight,groundX=Math.max(2+c.leftExtent*scale,Math.min(LOGICAL_WIDTH-2-c.rightExtent*scale,x));
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(blendedFrame(key,c,phaseAt(c,elapsed)),groundX-c.anchorX*scale,y-c.baseline*scale,c.cellWidth*scale,c.cellHeight*scale);ctx.restore();
  }
  const original=drawAnimatedEnemy;
  drawAnimatedEnemy=function(unit,px,py){
    const c=sheets.get(unit.riftKey),native=window.EmberRift?.sheets[unit.riftKey];
    if(!battle?.riftEncounter||!c||!native||unit.hp<=0||['attack','death'].includes(unit.anim))return original(unit,px,py);
    const key=unit.riftKey,size=key==='dragon'?78:key==='engine'?70:unit.riftBoss?56:['warden','bear','brute'].includes(key)?49:['fae','mina','sella'].includes(key)?36:43;
    const nativeScale=Math.min(size/native.referenceHeight,105/(native.maxCellWidth||native.cells[0][2]));
    const now=performance.now();if(!clocks.has(unit))clocks.set(unit,now-(battle.enemies.indexOf(unit)||0)*467);
    draw(key,c,px+8,py+31,now-clocks.get(unit),nativeScale*native.referenceHeight);return true;
  };
  window.RiftEnemyIdle={ready,phaseAt,preview(key,x,y,t,height=90){const c=sheets.get(key);if(c)draw(key,c,x,y,t,height);},get manifest(){return Object.fromEntries(sheets);}};
})();
