// Torren works between the hearth and the existing vegetable table.
(() => {
  const sheet=new Image();sheet.src='assets/hall/living-256/torren-kitchen.webp';
  const block=new Image();block.src='assets/hall/living-256/prep-block.webp';
  const hearth={x:88,y:57},prep={x:92,y:83},corner={x:88,y:78};
  let last=null,clock=0,elapsed=0,phase='stir',route=[],index=0,walk=0,progress=null;
  const ready=new Promise(resolve=>{sheet.onload=resolve;});
  function tick(now){
    const dt=last===null?0:Math.max(0,Math.min(50,now-last));last=now;
    const w=window.emberHallWorld,t=w?.actors.find(a=>a.id==='Torren');if(!t)return;
    const p=hallBattleProgress();
    if(progress!==p){progress=p;phase='stir';elapsed=0;route=[];index=0;walk=0;Object.assign(t,hearth);}
    t.kitchenActive=state.party.includes('Torren')&&sheet.complete&&sheet.naturalWidth>0;
    if(!t.kitchenActive)return;
    const busy=mode!=='walk'||activeRecruitScene||window.TinusRecruitment?.replaying||(w.scene&&now-w.scene.started<w.scene.duration);
    if(busy)return;
    clock+=dt;elapsed+=dt;
    if(route.length){
      const target=route[index],dx=target.x-t.x,dy=target.y-t.y,dist=Math.hypot(dx,dy),step=Math.min(dist,dt*.017);
      if(dist){t.x+=dx/dist*step;t.y+=dy/dist*step;walk+=step/2.5;t.kitchenFacing=Math.abs(dx)>Math.abs(dy)?dx>0?2:3:dy>0?0:1;}
      if(dist<=step+.01&&++index>=route.length){route=[];index=0;phase=phase==='to-prep'?'chop':'stir';elapsed=0;}
    }else if(elapsed>(phase==='stir'?13500:11000)){
      phase=phase==='stir'?'to-prep':'to-hearth';route=phase==='to-prep'?[corner,prep]:[corner,hearth];index=0;elapsed=0;
    }
    t.action=phase==='chop'?'Chopping vegetables':route.length?'Preparing soup':'Stirring soup';
    t.approach={x:84,y:Math.max(68,t.y+10)};
  }
  function drawActor(actor,camera){
    if(actor.id!=='Torren'||!actor.kitchenActive||activeRecruitScene||window.HallOpening?.active)return false;
    const size=32;ctx.save();ctx.translate(actor.x-camera.x,actor.y-camera.y);
    if(route.length){
      const image=emberHallWorld.images.Torren,cell=image.width/8,row=actor.kitchenFacing||0;
      ctx.drawImage(image,Math.floor(walk)%8*cell,row*cell,cell,cell,-size/2,-size*.94,size,size);
    }else{
      const cell=sheet.naturalWidth/4,row=phase==='chop'?1:0;
      // 0-1-2-1 connects the circular stirring poses without the large lifted reset.
      const frame=phase==='chop'?[0,1,2,3][Math.floor(clock/240)%4]:[0,1,2,1][Math.floor(clock/340)%4];
      ctx.drawImage(sheet,frame*cell,row*cell,cell,cell,-size/2,-size*.94,size,size);
    }
    ctx.restore();return true;
  }
  function drawPot(camera,now){
    if(!state.party.includes('Torren')||!sheet.complete||!sheet.naturalWidth)return;
    const cell=sheet.naturalWidth/4,x=82-camera.x,y=48-camera.y,size=23;
    ctx.save();
    // A small iron trivet sits on the hearth stones, rather than a floating pot.
    ctx.strokeStyle='#3a2920';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(x-6,y);ctx.lineTo(x-7,y+4);ctx.moveTo(x+6,y);ctx.lineTo(x+7,y+4);ctx.stroke();
    // Fixed cast-iron base. Only the separately clipped steam changes frames.
    ctx.drawImage(sheet,0,cell*2+cell*.3,cell,cell*.7,x-size/2,y-size*.64,size,size*.7);
    const frame=Math.floor(now/320)%4;
    ctx.globalAlpha=.76;ctx.drawImage(sheet,frame*cell,cell*2,cell,cell*.3,x-size/2,y-size*.94,size,size*.3);
    ctx.restore();
    if(block.complete&&block.naturalWidth)ctx.drawImage(block,93-camera.x,68-camera.y,16,16);
  }
  window.HallKitchen={tick,drawActor,drawPot,ready,get phase(){return phase;},get clock(){return clock;},get route(){return route;}};
})();
