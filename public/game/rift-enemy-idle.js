// New whole-character idle drawings for Rift battles. Native combat rows remain in use.
(() => {
  'use strict';
  const sheets=new Map(),clocks=new WeakMap();
  function phaseAt(config,elapsed){
    let t=((elapsed%config.cycleMs)+config.cycleMs)%config.cycleMs;
    for(let i=0;i<config.durations.length;i++){
      const duration=config.durations[i];
      if(t<duration){return {frame:i,next:(i+1)%8,mix:0};}
      t-=duration;
    }
    return {frame:0,next:1,mix:0};
  }
  const ready=(async()=>{
    const response=await fetch('assets/rift/idle-246/manifest.json?v=246');if(!response.ok)throw Error('Rift idle manifest unavailable');
    const manifest=await response.json();
    const load=file=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Rift idle '+file));image.src='assets/rift/idle-246/'+file;});
    await Promise.all(Object.entries(manifest).map(async([key,c])=>{const image=await load(c.file);sheets.set(key,{...c,image});}));
  })();ready.catch(error=>console.error(error));
  function draw(key,c,x,y,elapsed,height){
    const scale=height/c.referenceHeight,groundX=Math.max(2+c.leftExtent*scale,Math.min(LOGICAL_WIDTH-2-c.rightExtent*scale,x));
    const frame=phaseAt(c,elapsed).frame;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(c.image,frame*c.cellWidth,0,c.cellWidth,c.cellHeight,groundX-c.anchorX*scale,y-c.baseline*scale,c.cellWidth*scale,c.cellHeight*scale);ctx.restore();
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

