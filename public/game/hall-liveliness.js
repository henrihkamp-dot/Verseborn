// Whole-character lab poses; movement follows short eased boot-jet hops.
(() => {
  const image=new Image();let loaded=false;image.onload=()=>loaded=true;image.src='assets/hall/glimmer-lab-v244.webp';
  const stops=[{x:464,y:87,wait:9000,row:2},{x:484,y:83,wait:8000,row:3,drone:true,lift:22},{x:513,y:91,wait:8000,row:3},{x:558,y:91,wait:10500,row:3},{x:600,y:87,wait:7000,row:3},{x:535,y:91,wait:8500,row:2}];
  const drone=new Image();drone.src='assets/hall/living-256/drone.webp';
  const ponder=new Image();ponder.src='assets/hall/glimmer-hover-v244.webp';
  const platforms=new Image();platforms.src='assets/hall/glimmer-platforms-v244.webp';
  const props=new Image();props.src='assets/hall/glimmer-repair-props-v244.webp';
  let last=null,clock=0,station=0,elapsed=0,flight=null,progress=null,impact=null,reaction=null,hitKey='',hitCount=0;
  const droneHome={x:470,y:38};
  const droneRoutes=[
    {speed:15,points:[[470,38],[430,65],[350,90],[300,145],[350,190],[410,145],[452,85],[470,38]]},
    {speed:19,points:[[470,38],[425,65],[360,130],[405,170],[435,115],[360,80],[310,115],[365,150],[430,85],[470,38]]},
    {speed:17,points:[[470,38],[520,55],[500,100],[420,135],[345,105],[300,65],[365,45],[435,55],[470,38]]}
  ];
  // Sample curves once; frame updates only follow the small distance table.
  function curveTable(points){
    const table=[{x:points[0][0],y:points[0][1],distance:0}];let distance=0;
    for(let i=0;i<points.length-1;i++)for(let j=1;j<=24;j++){
      const t=j/24,t2=t*t,t3=t2*t,a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];
      const component=k=>.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3);
      const x=component(0),y=component(1),prev=table[table.length-1];distance+=Math.hypot(x-prev.x,y-prev.y);table.push({x,y,distance});
    }
    return {table,length:distance};
  }
  for(const route of droneRoutes)Object.assign(route,curveTable(route.points));
  let droneFlight=null,droneRoute=0,droneLaunched=false,droneX=470,droneY=38,droneTilt=0;
  function updateDrone(dt,chatting){
    const repairing=station===1&&!flight;
    if(repairing&&!droneFlight)droneLaunched=false;
    if(flight?.next===2&&!droneLaunched){
      const route=droneRoutes[droneRoute++%droneRoutes.length];
      droneFlight={...route,elapsed:0,duration:route.length/route.speed*1000,returning:false};droneLaunched=true;
    }
    // Recall early if Kael interrupts the lab routine. The ordinary routes
    // finish before Glimmer returns to her first station and next repair stop.
    if(droneFlight&&!droneFlight.returning&&(chatting||flight?.next===0)){
      const path=curveTable([[droneX,droneY],[(droneX+470)/2,Math.min(droneY,38)-8],[470,38]]);
      droneFlight={...path,elapsed:0,duration:Math.max(1600,path.length/20*1000),returning:true};
    }
    if(droneFlight){
      const f=droneFlight;f.elapsed+=dt;const t=Math.min(1,f.elapsed/f.duration),distance=t*t*(3-2*t)*f.length;
      let i=1;while(i<f.table.length-1&&f.table[i].distance<distance)i++;
      const a=f.table[i-1],b=f.table[i],mix=(distance-a.distance)/(b.distance-a.distance||1),previousX=droneX;
      droneX=a.x+(b.x-a.x)*mix;droneY=a.y+(b.y-a.y)*mix;
      droneTilt+=(Math.max(-.09,Math.min(.09,(droneX-previousX)*.10))-droneTilt)*Math.min(1,dt/180);
      if(t===1){droneFlight=null;droneX=470;droneY=38;}
    }else{droneX=470+Math.sin(clock*.0007)*(repairing?.15:1.5);droneY=38+Math.sin(clock*.002)*(repairing?.25:1.1);droneTilt*=.92;}
  }
  const reactions=['That was my concentration.','The dummy has heard you, Seerin.','One quiet paragraph. That is all I ask.','My inkpot is not part of your training.','I was reading that sentence.'];
  function tick(now){
    const dt=last===null?0:Math.max(0,Math.min(50,now-last));last=now;
    const w=window.emberHallWorld;if(!w)return;
    const g=w.actors.find(a=>a.id==='Glimmer'),kael=w.actors.find(a=>a.id==='Kael');
    if(progress!==hallBattleProgress()){
      if(progress)Object.assign(g,{x:464,y:87,labLift:0,labFlying:false});
      droneFlight=null;droneLaunched=false;droneRoute=0;droneX=470;droneY=38;droneTilt=0;
      progress=hallBattleProgress();station=0;elapsed=0;flight=null;impact=null;reaction=null;hitKey='';
    }
    const busy=mode!=='walk'||activeRecruitScene||window.TinusRecruitment?.replaying||(w.scene&&now-w.scene.started<w.scene.duration);
    if(busy){w.hideAmbientChat('training-reaction');return;}
    clock+=dt;
    if(loaded&&state.party.includes('Glimmer')){
      const chatting=window.KaelHallVisits?.visit?.id==='Glimmer';
      if(chatting&&flight?.next!==0&&Math.hypot(g.x-stops[0].x,g.y-stops[0].y)>1){
        flight={from:{x:g.x,y:g.y},to:stops[0],next:0,elapsed:0,duration:1200+Math.abs(stops[0].x-g.x)*12,fromLift:g.labLift||0};
      }
      if(flight){
        flight.elapsed+=dt;const t=Math.min(1,flight.elapsed/flight.duration),ease=t*t*(3-2*t);
        g.x=flight.from.x+(flight.to.x-flight.from.x)*ease;g.y=flight.from.y+(flight.to.y-flight.from.y)*ease;
        g.labRepairHover=false;
        g.labLift=(flight.fromLift||0)*(1-ease)+(flight.to.lift||0)*ease+Math.sin(Math.PI*t)*5;g.labFlying=true;g.labPondering=false;g.labEureka=false;g.labHovering=false;g.labDirection=flight.to.x>flight.from.x?1:0;
        if(t===1){station=flight.next;elapsed=0;flight=null;g.labLift=stops[station].lift||0;g.labFlying=false;}
      }else if(!chatting){
        elapsed+=dt;g.labFlying=false;
        const thinkingStart=station===0?3000:station===2?4500:Infinity;
        const thinkingTime=elapsed-thinkingStart;
        g.labPondering=thinkingTime>=0&&thinkingTime<4500&&ponder.complete&&ponder.naturalWidth>0;
        g.labPonderRow=[2,4,0,5,3,7,1,6][Math.min(7,Math.max(0,Math.floor(thinkingTime/562.5)))];
        g.labEureka=(station===0||station===2)&&elapsed>=stops[station].wait-1500&&elapsed<stops[station].wait&&ponder.complete&&ponder.naturalWidth>0;
        g.labEurekaTime=elapsed-(stops[station].wait-1500);
        const next=stops[(station+1)%stops.length],angle=Math.atan2(next.y-g.y,next.x-g.x);
        const order=[3,5,0,4,2,6,1,7],target=(Math.round(angle/(Math.PI/4))+8)%8,turn=(target-5+12)%8-4;
        g.labEurekaRow=order[(5+Math.round(turn*Math.min(1,g.labEurekaTime/450))+16)%8];
        g.labHovering=g.labPondering||g.labEureka;
        g.labRepairHover=!!stops[station].drone;
        g.labLift=g.labRepairHover?stops[station].lift+Math.sin(clock*.002)*.25:g.labPondering?3*Math.min(1,thinkingTime/500)+Math.sin(clock*.003)*.2:g.labEureka?3:0;
        if(elapsed>=stops[station].wait){const next=(station+1)%stops.length;flight={from:{x:g.x,y:g.y},to:stops[next],next,elapsed:0,duration:1600+Math.abs(stops[next].x-g.x)*12,fromLift:g.labLift||0};}
      }
      if(chatting&&!flight){g.labPondering=false;g.labHovering=false;g.labEureka=false;g.labRepairHover=false;g.labLift=Math.max(0,(g.labLift||0)-dt*.006);}
      updateDrone(dt,chatting);
      g.labActive=true;g.labClock=clock;g.labRow=stops[station].row;
    }else g.labActive=false;
    if(state.party.includes('Seerin')){
      // Match the existing 12-second rest + 3-second shield-practice sequence.
      const offset=w.actors.findIndex(a=>a.id==='Seerin')*731,phase=(now+offset)%15000;
      const beat=phase>=12750&&phase<13000?0:phase>=13875&&phase<14125?1:-1;
      const key=Math.floor((now+offset)/15000)+':'+beat;
      if(beat>=0&&key!==hitKey){
        hitKey=key;hitCount++;impact={at:clock,text:beat?'THUNK!':'KLANG!',tilt:beat?.1:-.12};
        if(Math.hypot(w.player.x-88,w.player.y-180)<190)playSfx('block',.32);
        if(hitCount%4===0&&state.party.includes('Kael')&&!kael.visiting){reaction={at:clock,text:reactions[Math.floor(hitCount/4-1)%reactions.length]};w.resetAmbientChat('training-reaction');}
      }
    }else impact=null;
    if(reaction&&clock-reaction.at<4800&&!kael.visiting){w.ambientChat('training-reaction',[[['Kael',reaction.text]]],[kael],w.camera,clock-reaction.at,20000,0);}else{reaction=null;w.hideAmbientChat('training-reaction');}
  }
  function drawActor(actor,camera){
    if(actor.id!=='Glimmer'||!actor.labActive||!loaded)return false;
    const size=actor.size*.65,row=actor.labFlying?actor.labDirection:actor.labRow;
    const source=actor.labHovering?ponder:image,cell=source.naturalWidth/4;
    const phase=(actor.labClock%(actor.labFlying?800:actor.labRepairHover?1600:2800))/(actor.labFlying?200:actor.labRepairHover?400:700);
    const frame=actor.labEureka?(actor.labEurekaTime<400?2:3):actor.labPondering?(actor.labClock%3000>2700?1:0):Math.floor(phase)%4;
    ctx.save();ctx.translate(actor.x-camera.x,actor.y-camera.y-(actor.labLift||0));
    if(!actor.labFlying&&!actor.labHovering)ctx.scale(-1,1);
    ctx.drawImage(source,frame*cell,(actor.labHovering?(actor.labEureka?actor.labEurekaRow:actor.labPonderRow):row)*cell,cell,cell,-size/2,-size*.94,size,size);
    // Thruster flames are painted into the flight frames; do not draw synthetic heel beams.
    ctx.restore();return true;
  }
  function drawLabProps(camera){
    if(!state.party.includes('Glimmer')||!props.complete||!props.naturalWidth)return;
    window.HallLabMachinery?.draw(camera,clock);
    if(platforms.complete&&platforms.naturalWidth){
      const platformCell=platforms.naturalWidth/3;
      for(const [i,x,y] of [[0,464,87],[0,513,91],[1,558,91],[2,600,87]])ctx.drawImage(platforms,i*platformCell,0,platformCell,platforms.naturalHeight,x-camera.x-12,y-camera.y-7,24,14);
    }
    const cell=props.naturalWidth/3;
    for(const [i,x,y,width] of [[0,503,81,19],[1,548,81,19],[2,590,77,19]])if(!window.HallLabMachinery?.drawProp(i,x,y,width,camera,clock))ctx.drawImage(props,i*cell,0,cell,props.naturalHeight,x-camera.x-width/2,y-camera.y-width,width,width);
    drawDrone(camera);
  }
  function dronePosition(){
    const repairing=station===1&&!flight&&!droneFlight;
    return {x:droneX,y:droneY,repairing,flying:!!droneFlight,tilt:droneTilt};
  }
  function drawDrone(camera){
    if(!drone.complete||!drone.naturalWidth)return;
    const d=dronePosition(),width=33,height=width*drone.naturalHeight/drone.naturalWidth;
    ctx.save();ctx.translate(d.x-camera.x,d.y-camera.y);ctx.rotate((d.tilt||0)+Math.sin(clock*.0016)*(d.repairing?.004:.018));
    ctx.drawImage(drone,-width/2,-height/2,width,height);
    // Rotor highlights orbit independently; the brass body never scales/morphs.
    ctx.globalCompositeOperation='screen';ctx.lineWidth=.65;
    for(const [x,y,offset] of [[-7,-8.6,0],[7.5,-7.7,2]]){
      const a=clock*.035+offset;ctx.strokeStyle='#efb8ff';ctx.beginPath();ctx.ellipse(x,y,5.2,1.1,0,a,a+1.9);ctx.stroke();
      ctx.fillStyle='#edb0ff';ctx.globalAlpha=.7;ctx.beginPath();ctx.ellipse(x+Math.cos(a)*4.5,y+Math.sin(a)*.8,.8,.3,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    }
    if(d.repairing&&clock%1600<120){ctx.strokeStyle='#ffde82';for(let i=0;i<3;i++){const a=i*2+clock*.01;ctx.beginPath();ctx.moveTo(10,6);ctx.lineTo(10+Math.cos(a)*2,6+Math.sin(a)*2);ctx.stroke();}}
    ctx.restore();
  }
  function drawEffects(camera){
    const g=window.emberHallWorld?.actors.find(a=>a.id==='Glimmer');
    if(g?.labActive&&g.labEureka&&mode==='walk'&&g.labEurekaTime>400){
      ctx.save();ctx.translate(g.x-camera.x,g.y-camera.y-g.size*.8-(g.labLift||0));ctx.rotate(-.09);
      ctx.font='italic 900 7px Georgia';ctx.textAlign='center';ctx.lineWidth=1.8;ctx.strokeStyle='#502047';ctx.fillStyle='#fff1a3';ctx.strokeText('AHA!',0,0);ctx.fillText('AHA!',0,0);ctx.restore();
    }
    if(!impact||mode!=='walk')return;const age=clock-impact.at;if(age<0||age>950)return;
    ctx.save();ctx.translate(102-camera.x,143-camera.y-age*.006);ctx.rotate(impact.tilt);ctx.globalAlpha=Math.min(1,(950-age)/250);
    ctx.font='italic 900 9px Georgia';ctx.textAlign='center';ctx.lineWidth=2;ctx.strokeStyle='#251728';ctx.fillStyle='#ffdc80';ctx.strokeText(impact.text,0,0);ctx.fillText(impact.text,0,0);ctx.restore();
  }
  window.HallLiveliness={tick,drawActor,drawEffects,drawLabProps,stops,dronePosition,droneRoutes,get ready(){return loaded&&drone.complete&&drone.naturalWidth>0&&ponder.complete&&ponder.naturalWidth>0&&props.complete&&props.naturalWidth>0;},get flight(){return flight;},get clock(){return clock;},get impact(){return impact;}};
})();
