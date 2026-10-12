// Ember Hall presentation layer. Startup, save selection and combat remain in game.js.
(() => {
  const W=640,H=356,player={x:320,y:310,facing:0,walking:false,phase:0},camera={x:0,y:0};
  const resonance={id:'Resonance Machine',x:315,y:139,width:92,height:86,approach:{x:315,y:160}};
  const keys=new Set(),images={},actors=[
    {id:'Torren',x:81,y:77,size:30,action:'Cooking',line:'A warm meal first. Heroics later.'},
    {id:'Sparky',x:165,y:82,size:30,action:'Resting',line:'Prrrp!'},
    {id:'Glimmer',x:464,y:87,size:36,renderScale:.65,approach:{x:448,y:86},action:'Drone maintenance',line:'Careful with that coil. It bites.'},
    {id:'Seerin',x:88,y:180,size:42,action:'Shield practice',line:'Feet steady. Eyes on your opponent.'},
    {id:'Marla',x:529,y:160,size:38,clipY:155,approach:{x:446,y:181},action:'Serving soup',line:'Welcome back. There is always something warm waiting.'},
    {id:'Mira',x:102,y:297,size:36,action:'Dagger practice',line:'My corner. No unwelcome surprises.'},
    {id:'Kael',x:464,y:316,size:40,approach:{x:452,y:332},action:'Reading',line:'Some answers need a little quiet.'}
  ];
  // Only painted floor and stairs are navigable. Walls and shelf faces are not
  // implicit floor merely because they are absent from a furniture rectangle.
  const floors=[
    [[224,138],[416,138],[416,343],[224,343]],
    // Connected upper landing behind the machine's railing.
    [[189,53],[220,36],[420,36],[450,53],[450,92],[189,92]],
    [[253,120],[264,105],[285,99],[345,99],[366,105],[379,120],[374,137],[351,149],[279,149],[256,137]],
    [[220,106],[252,106],[252,206],[220,206]],
    [[389,106],[428,106],[428,206],[389,206]],
    [[20,53],[192,53],[192,94],[20,94]],
    [[189,82],[210,82],[242,106],[242,142],[214,142],[214,116],[189,101]],
    [[438,53],[620,53],[620,92],[438,92]],
    [[430,82],[451,82],[451,101],[426,119],[426,142],[398,142],[398,108]],
    [[20,156],[169,156],[169,190],[20,190]],
    [[160,177],[187,167],[194,150],[214,157],[244,179],[244,207],[194,192],[160,190]],
    [[441,177],[463,178],[473,187],[473,191],[442,191],[410,206],[397,184]],
    [[20,285],[188,285],[188,343],[20,343]],
    [[168,280],[195,275],[222,287],[240,287],[240,343],[168,343]],
    [[452,320],[620,320],[620,343],[452,343]],
    [[406,287],[430,287],[454,278],[482,299],[482,343],[406,343]]
  ];
  const walls=[
    [0,0,640,12],[0,0,16,356],[624,0,16,356],[0,345,640,11],
    [18,12,171,39],[450,12,172,36],
    // Upper wall faces and columns: the landing connects below their bases.
    [198,0,22,79],[418,0,20,79],
    [220,0,54,54],[360,0,56,54],[274,0,86,36],
    // Solid lamp plinths alongside the central stairs.
    [250,146,14,28],[366,146,14,28],
    [100,58,28,28],[144,62,42,23],[474,57,106,32],
    [16,95,179,16],[464,95,160,16],
    [16,118,156,35],[172,143,16,37],
    [460,153,129,24],[462,174,9,13],[497,174,9,13],[530,174,9,13],[558,174,9,13],
    [16,192,145,14],[474,192,150,14],
    [16,211,166,21],[468,211,156,26],
    [38,244,89,36],[481,266,123,54],
    [197,220,19,62],[421,220,19,62],
    [239,85,13,51],[381,85,15,51],[251,80,130,17],
    [250,143,40,12],[339,143,40,12]
  ];
  // Footprints at floor level, rather than the tall foliage or pillar artwork.
  const obstacles=[
    {x:229,y:279,rx:11,ry:11},{x:410,y:279,rx:11,ry:11},
    {x:263,y:182,rx:10,ry:7},{x:367,y:182,rx:10,ry:7},
    {x:219,y:56,rx:9,ry:6},{x:240,y:56,rx:9,ry:6},
    {x:391,y:56,rx:9,ry:6},{x:410,y:56,rx:8,ry:6},
    {x:205,y:65,rx:9,ry:7},{x:425,y:65,rx:9,ry:7},
    {x:211,y:162,rx:10,ry:9},{x:419,y:162,rx:10,ry:9},
    {x:228,y:103,rx:8,ry:5},{x:401,y:103,rx:8,ry:5},
    {x:257,y:176,rx:7,ry:6},{x:373,y:176,rx:7,ry:6},
    {x:226,y:263,rx:7,ry:6},{x:413,y:263,rx:7,ry:6}
  ];
  const ready=Promise.all(['Verseborn',...actors.map(a=>a.id),'hall','effects','hearths'].map(name=>new Promise((resolve,reject)=>{
    const image=new Image();image.onload=()=>{images[name]=image;resolve();};image.onerror=()=>reject(Error(name+' asset missing'));image.src='assets/hall/'+(['hall','effects','hearths'].includes(name)?name:name.toLowerCase()+'-clean-v3')+'.webp';
  })));
  const walkReady=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{images.VersebornWalk=image;resolve();};image.onerror=()=>reject(Error('Verseborn walk asset missing'));image.src='assets/hall/verseborn-walk-v2.webp';});
  const actionsReady=Promise.all(actors.map(actor=>new Promise((resolve,reject)=>{
    const image=new Image();image.onload=()=>{images[actor.id+'Action']=image;resolve();};image.onerror=()=>reject(Error(actor.id+' action asset missing'));image.src='assets/hall/'+actor.id.toLowerCase()+'-action-'+(actor.id==='Kael'?'v9':'v8')+'.webp';
  })));
  const luteReady=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{images.VersebornLute=image;resolve();};image.onerror=()=>reject(Error('Lute animation asset missing'));image.src='assets/hall/verseborn-lute-v1.webp';});
  const oldDraw=drawTileMap,oldInteract=interact,oldSprite=drawSprite;
  let active=false,last=performance.now(),target=null,route=[],scene=null,pendingActor=null,suppressClick=false;
  const inHall=()=>active&&state.gameMode==='hallBattles'&&state.map==='emberHallBattles';
  const oldControl=handleControl,oldCycleLeader=cycleLeader;
  handleControl=function(control){if(inHall()&&mode==='walk'&&!activeRecruitScene&&['up','down','left','right'].includes(control))return;oldControl(control);};
  cycleLeader=function(direction){if(inHall()&&mode==='walk')return;oldCycleLeader(direction);};
  const residents=()=>actors.filter(actor=>actor.id==='Marla'||state.party.includes(actor.id));
  function resetNavigation(position=state.hallPosition){
    keys.clear();target=null;route=[];pendingActor=null;scene=null;last=performance.now();
    const valid=position&&Number.isFinite(position.x)&&Number.isFinite(position.y)&&!collision(position.x,position.y);
    Object.assign(player,{x:valid?position.x:320,y:valid?position.y:310,facing:valid&&[0,1,2,3,4,5,6,7].includes(position.facing)?position.facing:0,walking:false,phase:0});
    state.hallPosition={x:player.x,y:player.y,facing:player.facing};
  }
  const oldStartHall=startHallBattles,oldReturn=returnToHallAfterBattle,oldLoad=loadGame;
  loadGame=function(saveKey){state.hallPosition=null;const loaded=oldLoad(saveKey);if(loaded&&state.gameMode==='hallBattles')resetNavigation();return loaded;};
  startHallBattles=function(continueGame=false){if(!continueGame)state.hallPosition=null;oldStartHall(continueGame);if(state.gameMode==='hallBattles')resetNavigation();};
  returnToHallAfterBattle=function(){oldReturn();resetNavigation({x:315,y:185,facing:0});};
  function inPolygon(x,y,points){
    let inside=false;
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const [xi,yi]=points[i],[xj,yj]=points[j];
      if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
    }
    return inside;
  }
  const onFloor=(x,y)=>floors.some(points=>inPolygon(x,y,points));
  const collision=(x,y)=>![[0,0],[-5,0],[5,0],[0,-2],[0,2]].every(([dx,dy])=>onFloor(x+dx,y+dy))||walls.some(([l,t,w,h])=>x>l-7&&x<l+w+7&&y>t-3&&y<t+h+3)||obstacles.some(o=>((x-o.x)/(o.rx+5))**2+((y-o.y)/(o.ry+2))**2<1)||((x-resonance.x)/41)**2+((y-126)/18)**2<1;
  function clearSegment(ax,ay,bx,by){
    const n=Math.ceil(Math.hypot(bx-ax,by-ay)/.5);
    for(let i=1;i<=n;i++)if(collision(ax+(bx-ax)*i/n,ay+(by-ay)*i/n))return false;
    return true;
  }
  // Cache the floor grid and safe diagonal edges; clicks only search its reachable component.
  const navStep=2,navCols=W/navStep,navRows=H/navStep,navNodes=new Map();
  const nodeKey=(x,y)=>y*navCols+x;
  for(let y=1;y<navRows;y++)for(let x=1;x<navCols;x++){
    if(!collision(x*navStep,y*navStep))navNodes.set(nodeKey(x,y),{x:x*navStep,y:y*navStep,edges:[]});
  }
  for(const [key,node] of navNodes){
    const gx=node.x/navStep,gy=node.y/navStep;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
      const nextKey=nodeKey(gx+dx,gy+dy),next=navNodes.get(nextKey);
      if(next&&clearSegment(node.x,node.y,next.x,next.y))node.edges.push(nextKey);
    }
  }
  function navigate(x,y,actor=null){
    if(!Number.isFinite(x)||!Number.isFinite(y))return false;
    let start=null,startDistance=Infinity;
    // The saved/player position need not be an exact grid point.
    for(const [key,node] of navNodes){
      const distance=Math.hypot(node.x-player.x,node.y-player.y);
      if(distance<startDistance&&distance<=4&&clearSegment(player.x,player.y,node.x,node.y)){start=key;startDistance=distance;}
    }
    if(start===null)return false;
    const queue=[start],previous=new Map([[start,null]]);
    let end=null,bestDistance=Infinity;
    for(let i=0;i<queue.length;i++){
      const key=queue[i],node=navNodes.get(key),distance=Math.hypot(node.x-x,node.y-y);
      if(distance<bestDistance){end=key;bestDistance=distance;}
      if(distance<.5)break;
      for(const next of node.edges)if(!previous.has(next)){previous.set(next,key);queue.push(next);}
    }
    // Snap near-edge clicks to reachable floor, never to a distant room through a wall.
    if(bestDistance>18)return false;
    const path=[];
    for(let key=end;key!==null;key=previous.get(key)){const node=navNodes.get(key);path.unshift({x:node.x,y:node.y});}
    route=path;target=route.shift()||null;pendingActor=actor;
    return Boolean(target);
  }
  function drawActor(actor,row,col){
    // Scale Hall art around its existing foot anchor; size still defines interaction bounds.
    const size=actor.size*(actors.find(resident=>resident.id===actor.id)?.renderScale??1);
    if(actor.id==='Verseborn'&&row===8&&images.VersebornLute){
      const index=Math.max(0,Math.min(15,col));
      ctx.drawImage(images.VersebornLute,index%4*100,Math.floor(index/4)*100,100,100,Math.round(actor.x-camera.x-size/2),Math.round(actor.y-camera.y-size*.94),size,size);return;
    }
    if(actor.id==='Verseborn'&&row>=0&&row<=7&&images.VersebornWalk){
      const index=actor.poseFrame??(player.walking?Math.floor(player.phase)%8:8);
      const sheetRow=[0,1,2,2,3,3,4,4][row];
      ctx.save();ctx.translate(Math.round(actor.x-camera.x),Math.round(actor.y-camera.y-size*.94));
      if([2,4,6].includes(row))ctx.scale(-1,1);
      ctx.drawImage(images.VersebornWalk,index*128,sheetRow*128,128,128,-size/2,0,size,size);ctx.restore();return;
    }
    if(row===4&&images[actor.id+'Action']){
      const image=images[actor.id+'Action'],index=col%16;
      ctx.save();if(actor.clipY){ctx.beginPath();ctx.rect(0,0,LOGICAL_WIDTH,actor.clipY-camera.y);ctx.clip();}
      ctx.drawImage(image,index%4*100,Math.floor(index/4)*100,100,100,Math.round(actor.x-camera.x-size/2),Math.round(actor.y-camera.y-size*.94),size,size);ctx.restore();return;
    }
    const image=images[actor.id];if(!image)return;
    const cols=actor.id==='Verseborn'?4:8,rows=actor.id==='Verseborn'?4:5;
    const cw=image.width/cols,ch=image.height/rows;
    ctx.save();if(actor.clipY){ctx.beginPath();ctx.rect(0,0,LOGICAL_WIDTH,actor.clipY-camera.y);ctx.clip();}
    ctx.drawImage(image,col*cw,row*ch,cw,ch,Math.round(actor.x-camera.x-size/2),Math.round(actor.y-camera.y-size*.94),size,size);ctx.restore();
  }
  function walkFrame(id,row,phase){
    const frame=Math.floor(phase)%8;
    if(id==='Mira'&&row===2)return [0,1,2,4,5,6,7,5][frame];
    return frame;
  }
  function nearby(){
    if(Math.hypot(player.x-resonance.approach.x,player.y-resonance.approach.y)<23)return resonance;
    return residents().find(a=>Math.hypot(player.x-(a.approach?.x??a.x),player.y-(a.approach?.y??a.y))<23);
  }
  function trigger(actor){
    keys.clear();target=null;route=[];pendingActor=null;
    if(actor.id==='Resonance Machine'){openHallBattleMap();return;}
    if(window.HallHub?.openService(actor.id))return;
    scene={id:actor.id,started:performance.now(),duration:6400};
    const point=maps.emberHallBattles.points.find(entry=>entry.id===actor.id);
    if(point){activePoint=point;showTalk(pointDialogue(point),{portraits:['Verseborn',actor.id]});}
    else showTalk([[actor.id,actor.line]],{portraits:['Verseborn',actor.id]});
  }
  interact=function(){if(inHall()&&mode==='walk'&&!activeRecruitScene){unlockMusic();const a=nearby();if(a)trigger(a);return;}oldInteract();};
  drawSprite=function(id,px,py,dir,anim,frame){
    if(inHall()&&activeRecruitScene&&images[id]){
      const actor={id,x:px+8+camera.x,y:py+32+camera.y,size:actors.find(a=>a.id===id)?.size||24};
      if(id==='Verseborn'){
        if(['walk','idle'].includes(anim)){actor.size=36;actor.poseFrame=anim==='walk'?Math.floor(frame/8)%8:8;const row={0:0,1:3,2:1,3:2}[dir]??0;drawActor(actor,row,actor.poseFrame);return;}
        const entry=activeRecruitScene.actors.find(a=>a.id===id);
        const progress=entry?Math.max(0,Math.min(1,(tick-entry.actionStarted)/Math.max(1,entry.actionUntil-entry.actionStarted))):0;
        drawActor({...actor,size:36,poseFrame:8},anim==='magic'||anim==='ultimate'?8:0,Math.min(15,Math.floor(progress*16)));return;
      }
      const row=anim==='walk'?({0:0,1:3,2:1,3:2}[dir]||0):4;
      const entry=activeRecruitScene.actors.find(a=>a.id===id);
      const elapsed=entry&&entry.actionUntil>tick?tick-entry.actionStarted:tick;
      drawActor(actor,row,Math.floor(elapsed/5)%(row===4?16:8));return;
    }
    oldSprite(id,px,py,dir,anim,frame);
  };
  const oldRecruitDraw=drawRecruitScene;
  const oldRecruitActors=recruitSceneActors,oldRecruitPose=recruitScenePoseAt;
  const sceneRooms={
    'torren-kitchen':{focus:[125,78],lead:[81,77],guests:[[49,82],[151,83],[188,82]]},
    'sparky-coop':{focus:[144,82],lead:[165,82],guests:[[132,85],[81,83],[194,83]]},
    'training-room':{focus:[115,179],lead:[125,181],guests:[[82,181],[102,194],[157,194]]},
    'glimmer-lab':{focus:[493,82],lead:[464,87],guests:[[442,87],[498,88],[534,89]]},
    'kael-library':{focus:[492,302],lead:[464,316],guests:[[430,332],[497,333],[532,333]]},
    'relaxation-lounge':{focus:[120,291],lead:[102,297],guests:[[145,322],[77,322],[183,320]]},
    'music-studio':{focus:[120,291],lead:[119,321],guests:[[158,322],[78,322],[189,320]]},
    'central-hall':{focus:[320,244],lead:[320,244],guests:[[284,254],[354,254],[320,277]]},
    'trial-room':{focus:[320,247],lead:[320,258],guests:[[285,248],[355,248],[320,282]]}
  };
  function sceneStaging(recruitScene){
    const room=recruitScene.room==='trial-room'&&recruitScene.recruit!=='Verseborn'
      ? {Torren:'torren-kitchen',Glimmer:'glimmer-lab',Kael:'kael-library',Mira:'relaxation-lounge',Seerin:'training-room',Sparky:'sparky-coop'}[recruitScene.recruit]
      : recruitScene.room;
    return {room,layout:sceneRooms[room]||sceneRooms['central-hall']};
  }
  recruitSceneActors=function(recruitScene,partner){
    const cast=oldRecruitActors(recruitScene,partner);
    if(state.gameMode!=='hallBattles'||recruitScene.room==='trial-room')return cast;
    const positions={1:[128],2:[103,155],3:[92,128,164],4:[82,112,144,174]}[cast.length];
    if(positions)cast.forEach((actor,index)=>{actor.x=positions[index];actor.baseline=146;});
    return cast;
  };
  recruitScenePoseAt=function(actor,progress,isActing=true){
    const pose=oldRecruitPose(actor,progress,isActing);
    if(inHall()&&isActing&&actor.id==='Verseborn'&&['magic','ultimate'].includes(actor.anim))return {...pose,anim:actor.anim,x:0,y:0};
    if(inHall()&&actor.id!=='Verseborn'&&pose.anim!=='walk')return {...pose,x:0,y:0};
    return pose;
  };
  drawRecruitScene=function(){
    if(!inHall()||!activeRecruitScene||!active){oldRecruitDraw();return;}
    const recruitScene=activeRecruitScene,{room,layout}=sceneStaging(recruitScene),zoom=1.15;
    // Keep the cast above the dialogue panel, even in the Hall's bottom rooms.
    const view={x:Math.max(0,Math.min(W-LOGICAL_WIDTH/zoom,layout.focus[0]-LOGICAL_WIDTH/zoom/2)),y:Math.max(0,layout.focus[1]-LOGICAL_HEIGHT/zoom*.43)};
    const previousCamera={...camera};camera.x=0;camera.y=0;
    ctx.fillStyle='#171018';ctx.fillRect(0,0,LOGICAL_WIDTH,LOGICAL_HEIGHT);
    ctx.save();ctx.scale(zoom,zoom);ctx.translate(-view.x,-view.y);
    ctx.drawImage(images.hall,0,0,W,H);
    if(stageSelectorImage){const frame=Math.floor(performance.now()/220)%3,cw=stageSelectorImage.width/4;
      ctx.drawImage(stageSelectorImage,frame*cw,0,cw,stageSelectorImage.height,resonance.x-resonance.width/2,resonance.y-resonance.height,resonance.width,resonance.height);
    }
    const host={'torren-kitchen':'Torren','sparky-coop':'Sparky','training-room':'Seerin','glimmer-lab':'Glimmer','kael-library':'Kael','relaxation-lounge':'Mira','music-studio':'Verseborn'}[room];
    const lead=recruitScene.actors.some(a=>a.id===host)?host:recruitScene.recruit;
    let guestIndex=0;
    const cast=recruitScene.actors.map(entry=>{
      const spot=entry.id===lead?layout.lead:layout.guests[guestIndex++]||layout.guests[0];
      const isActing=entry.actionUntil>tick,progress=isActing?Math.min(1,(tick-entry.actionStarted)/Math.max(1,entry.actionUntil-entry.actionStarted)):0;
      const pose=recruitScenePoseAt(entry,progress,isActing);
      return {entry,pose,progress,isActing,x:spot[0]+pose.x/zoom,y:spot[1]+pose.y/zoom};
    }).sort((a,b)=>a.y-b.y);
    for(const actor of cast){
      const {entry,pose,isActing,progress,x,y}=actor,size=actors.find(a=>a.id===entry.id)?.size||36;
      drawFieldShadow(x,y+1,entry.id==='Sparky'?6:8);
      const row=pose.anim==='walk'?({0:0,1:3,2:1,3:2}[pose.facing]??0):entry.id==='Verseborn'?0:4;
      const phase=isActing?Math.floor((tick-entry.actionStarted)/(entry.id==='Verseborn'?8:5)):0;
      const lute=entry.id==='Verseborn'&&['magic','ultimate'].includes(pose.anim);
      if(lute)drawActor({id:entry.id,x,y,size},8,Math.min(15,Math.floor(progress*16)));
      else drawActor({id:entry.id,x,y,size,poseFrame:pose.anim==='walk'?phase%8:8},row,phase%(row===4?16:8));
      if(!lute)drawRecruitSceneEffect(entry,x,y,progress,isActing);
      if(entry.emote&&isActing)drawText(entry.emote,x,y-size-4,'#fff0a8',10,'center');
    }
    ctx.restore();camera.x=previousCamera.x;camera.y=previousCamera.y;
    drawText(RECRUIT_SCENE_ROOM_NAMES[room]||'Ember Hall',8,12,'#ffe0a1',8);
  };
  function update(now){
    const dt=Math.min(.05,(now-last)/1000);last=now;
    if(mode!=='walk'||activeRecruitScene){keys.clear();player.walking=false;return;}
    const wasWalking=player.walking;
    let dx=Number(keys.has('ArrowRight')||keys.has('d')||heldDirection==='right')-Number(keys.has('ArrowLeft')||keys.has('a')||heldDirection==='left');
    let dy=Number(keys.has('ArrowDown')||keys.has('s')||heldDirection==='down')-Number(keys.has('ArrowUp')||keys.has('w')||heldDirection==='up');
    if(dx||dy){target=null;route=[];pendingActor=null;}
    let distance=Infinity;
    if(!dx&&!dy&&target){
      while(target&&Math.hypot(target.x-player.x,target.y-player.y)<.000001)target=route.shift()||null;
      if(target){dx=target.x-player.x;dy=target.y-player.y;distance=Math.hypot(dx,dy);}
    }
    const length=Math.hypot(dx,dy)||1,step=Math.min(65*dt,distance);
    const nx=player.x+dx/length*step,ny=player.y+dy/length*step;
    const beforeX=player.x,beforeY=player.y;
    player.walking=Boolean(dx||dy);
    let moved=false;
    // Substeps prevent crossing thin boundaries during a slow frame.
    const count=Math.max(1,Math.ceil(step/.75));
    for(let i=0;i<count;i++){
      const sx=player.x+dx/length*step/count,sy=player.y+dy/length*step/count;
      // Follow the validated diagonal itself; axis-first movement can snag at stair edges.
      if(!collision(sx,sy)){moved||=sx!==player.x||sy!==player.y;player.x=sx;player.y=sy;}
      else if(!target){
        if(!collision(sx,player.y)){moved||=sx!==player.x;player.x=sx;}
        if(!collision(player.x,sy)){moved||=sy!==player.y;player.y=sy;}
      }
    }
    if(target&&!moved){target=null;route=[];pendingActor=null;}
    if(moved){
      const mx=player.x-beforeX,my=player.y-beforeY,ax=Math.abs(mx),ay=Math.abs(my);
      if(Math.min(ax,ay)>Math.max(ax,ay)*.4142)player.facing=my>0?(mx>0?4:5):(mx>0?6:7);
      else if(ax>ay)player.facing=mx>0?2:3;else player.facing=my>0?0:1;
      player.phase+=Math.hypot(mx,my)/9;state.hallPosition={x:player.x,y:player.y,facing:player.facing};
    }
    else {if(wasWalking)queueSave();player.walking=false;}
    if(!target&&pendingActor){const actor=pendingActor;pendingActor=null;trigger(actor);}
  }
  drawTileMap=function(){
    if(!inHall()||activeRecruitScene){last=performance.now();oldDraw();return;}
    const now=performance.now();update(now);
    camera.x=Math.max(0,Math.min(W-LOGICAL_WIDTH,player.x-LOGICAL_WIDTH/2));
    camera.y=Math.max(0,Math.min(H-LOGICAL_HEIGHT,player.y-LOGICAL_HEIGHT*.6));
    ctx.drawImage(images.hall,-camera.x,-camera.y,W,H);
    window.HallHub?.drawAreas(camera);
    const fx=images.effects,cw=fx.width/4,ch=fx.height/2,frame=Math.floor(now/180)%4;
    ctx.save();
    for(const [i,[x,y,w,h]] of [[77,23,25,21],[564,136,19,19]].entries()){
      ctx.save();ctx.beginPath();ctx.rect(x-camera.x,y-camera.y,w,h);ctx.clip();
      ctx.drawImage(images.hearths,i*32,0,32,32,x-camera.x,y-camera.y,w,h);
      ctx.drawImage(fx,frame*cw,0,cw,ch,x-camera.x-2,y-camera.y-1,w+4,h+2);ctx.restore();
    }
    ctx.globalAlpha=.23;ctx.drawImage(fx,frame*cw,ch,cw,ch,479-camera.x,141-camera.y,12,17);ctx.restore();
    const things=[...residents(),{...resonance,machine:true},{id:'Verseborn',x:player.x,y:player.y,size:36,player:true}].sort((a,b)=>a.y-b.y);
    for(const actor of things){
      if(actor.machine){
        const image=stageSelectorImage;
        if(image){const cw=image.width/4,frame=Math.floor(now/220)%3;ctx.drawImage(image,frame*cw,0,cw,image.height,actor.x-camera.x-actor.width/2,actor.y-camera.y-actor.height,actor.width,actor.height);}
        continue;
      }
      let row=0,col=0;
      if(actor.player){row=player.facing;col=player.walking?walkFrame(actor.id,row,player.phase):0;}
      else {
        const acting=scene?.id===actor.id&&now-scene.started<scene.duration;
        row=4;
        const practice=['Seerin','Mira'].includes(actor.id),fps=acting?12:actor.id==='Sparky'?8:10;
        const elapsed=acting?now-scene.started:now+actors.indexOf(actor)*731;
        const cycle=practice&&!acting?32:16,phase=Math.floor(elapsed*fps/1000)%cycle;
        col=phase<16?phase:0;
        if(actor.id==='Seerin')col=[0,1,2,3,5,6,7,8,9,10,11,12,13,14,15,0][col];
      }
      if(!actor.clipY)drawFieldShadow(actor.x-camera.x,actor.y-camera.y,actor.id==='Sparky'?3:5);
      drawActor(actor,row,col);
    }
    const near=nearby();if(near&&mode==='walk')drawText(near.id+'  [E]',near.x-camera.x,near.y-camera.y-38,'#fff0b5',6,'center');
    drawText('EMBER HALL',7,11,'#fff0b5',7);
    el.place.textContent='Ember Hall';
  };
  const controls=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','e']);
  document.addEventListener('keydown',event=>{
    if(!inHall()||activeRecruitScene||!['walk','talk'].includes(mode))return;
    const key=event.key.length===1?event.key.toLowerCase():event.key;
    if(!controls.has(key))return;event.preventDefault();event.stopImmediatePropagation();
    if(key==='e'){if(!event.repeat)interact();}else if(mode==='walk')keys.add(key);
  },true);
  document.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key),true);
  window.addEventListener('blur',()=>keys.clear());
  canvas.addEventListener('pointerdown',event=>{
    if(!inHall()||mode!=='walk'||activeRecruitScene)return;
    event.preventDefault();event.stopImmediatePropagation();suppressClick=true;
    const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width*LOGICAL_WIDTH+camera.x,y=(event.clientY-rect.top)/rect.height*LOGICAL_HEIGHT+camera.y;
    const clicked=residents().find(a=>Math.abs(x-a.x)<a.size*.5&&y>a.y-a.size&&y<a.y+4);
    if(clicked){const near=nearby();if(near?.id===clicked.id)trigger(clicked);else {const point=clicked.approach||clicked;navigate(point.x,point.y,clicked);}}
    else if(Math.abs(x-resonance.x)<resonance.width/2&&y>resonance.y-resonance.height&&y<resonance.y){
      if(nearby()?.id===resonance.id)trigger(resonance);else navigate(resonance.approach.x,resonance.approach.y,resonance);
    }
    else navigate(x,y);
  },true);
  // The legacy tile-grid click handler must not run after our world-space path.
  canvas.addEventListener('click',event=>{if(inHall()&&suppressClick){suppressClick=false;event.preventDefault();event.stopImmediatePropagation();}},true);
  window.emberHallWorld={player,actors,resonance,walls,floors,obstacles,collision,images,trigger,navigate,nearby,residents,get route(){return route;},get target(){return target;},get camera(){return camera;},get scene(){return scene;}};
  const engineReady=new Promise(resolve=>{const timer=setInterval(()=>{if(runtimeAssetsReady){clearInterval(timer);resolve();}},50);});
  Promise.all([ready,walkReady,luteReady,actionsReady,engineReady]).then(()=>{
    active=true;
    maps.emberHallBattles.name='Ember Hall';
    RECRUIT_SCENE_ROOM_NAMES['trial-room']='Ember Hall';
    if(state.gameMode==='hallBattles')resetNavigation();
    window.emberHallWorld.ready=true;
  }).catch(error=>{console.error(error);window.emberHallWorld.failed=true;});
})();
