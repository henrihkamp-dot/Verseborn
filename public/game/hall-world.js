// Ember Hall presentation layer. Startup, save selection and combat remain in game.js.
(() => {
  const W=640,H=356,player={x:320,y:310,facing:0,walking:false,phase:0},camera={x:0,y:0};
  const resonance={id:'Resonance Machine',x:315,y:139,width:92,height:86,approach:{x:315,y:160}};
  const keys=new Set(),images={},actors=[
    {id:'Torren',x:81,y:77,size:30,action:'Cooking',line:'A warm meal first. Heroics later.'},
    {id:'Sparky',x:165,y:82,size:30,action:'Resting',line:'Prrrp!'},
    {id:'Glimmer',x:464,y:87,size:36,renderScale:.65,approach:{x:448,y:86},action:'Drone maintenance',line:'Careful with that coil. It bites.'},
    {id:'Seerin',x:88,y:180,size:39,action:'Shield practice',line:'Feet steady. Eyes on your opponent.'},
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
    [239,85,13,51],[381,85,10,51],[251,80,130,17],
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
  // Solid feet of the stair cheeks and lounge furniture, traced from the Hall.
  const solidFeet=[
    [[201,119],[212,117],[221,122],[219,145],[224,148],[225,162],[216,168],[203,163]],
    [[409,122],[418,117],[429,119],[427,163],[414,168],[405,162],[406,148],[411,145]],
    [[219,99],[229,95],[240,100],[240,108],[228,112],[219,108]],
    [[392,100],[402,95],[412,99],[412,108],[403,112],[392,108]],
    [[218,257],[226,253],[234,257],[234,268],[226,272],[218,268]],
    [[405,257],[413,253],[421,257],[421,268],[413,272],[405,268]],
    [[20,290],[28,286],[38,290],[38,301],[28,306],[20,302]],
    [[31,283],[43,279],[51,283],[50,293],[39,297],[31,292]],
    // The chest lid/back occupy floor too; the former narrow bottom strip let
    // feet enter the chest before collision caught its front face.
    [[43,282],[66,275],[79,281],[80,302],[56,311],[43,306]],
    [[51,279],[104,280],[116,275],[123,280],[120,290],[104,294],[51,288]],
    [[130,270],[145,266],[164,270],[164,285],[151,291],[130,285]],
    [[174,281],[187,276],[199,281],[198,291],[185,295],[174,290]],
    [[18,321],[27,317],[37,321],[36,330],[25,334],[18,330]]
  ];
  // Tall painted silhouettes are redrawn at their floor depth, after actors behind them.
  const foregroundProps=[
    {id:'left-balcony',depth:118,outline:[[20,91],[60,91],[62,88],[68,88],[68,93],[111,93],[113,88],[122,88],[122,93],[160,93],[162,89],[169,89],[169,93],[193,93],[193,115],[20,118]]},
    {id:'right-balcony',depth:118,outline:[[438,93],[463,93],[464,88],[475,88],[475,93],[510,93],[512,88],[521,88],[521,93],[561,93],[563,89],[573,89],[573,93],[620,92],[620,118],[438,118]]},
    {id:'left-stair-wall',depth:168,outline:[[201,113],[209,113],[212,117],[220,116],[224,120],[224,127],[219,130],[219,143],[226,146],[227,155],[223,160],[222,168],[210,169],[201,164],[201,147],[208,142],[208,125],[201,123]]},
    {id:'right-stair-wall',depth:168,outline:[[429,113],[421,113],[418,117],[410,116],[406,120],[406,127],[411,130],[411,143],[404,146],[403,155],[407,160],[408,168],[420,169],[429,164],[429,147],[422,142],[422,125],[429,123]]},
    {id:'left-upper-lamp',depth:112,outline:[[219,99],[223,96],[223,86],[226,69],[231,69],[234,86],[234,96],[240,100],[240,108],[228,112],[219,108]]},
    {id:'right-upper-lamp',depth:112,outline:[[392,100],[396,96],[397,86],[400,69],[405,69],[408,86],[408,96],[412,99],[412,108],[403,112],[392,108]]},
    {id:'left-lounge-wall',depth:283,outline:[[194,215],[203,210],[214,214],[217,222],[216,257],[219,260],[219,278],[208,284],[195,278]]},
    {id:'right-library-wall',depth:283,outline:[[437,215],[428,210],[417,214],[414,222],[415,257],[412,260],[412,278],[423,284],[436,278]]},
    {id:'left-lounge-lamp',depth:272,outline:[[217,257],[223,252],[223,233],[227,226],[232,235],[233,252],[235,257],[235,268],[226,272],[217,268]]},
    {id:'right-library-lamp',depth:272,outline:[[404,257],[410,252],[410,233],[414,226],[419,235],[420,252],[422,257],[422,268],[413,272],[404,268]]},
    {id:'mira-lamp',depth:306,outline:[[20,292],[23,283],[23,277],[27,264],[30,264],[32,278],[33,284],[39,290],[39,301],[28,306],[20,302]]},
    {id:'mira-table',depth:297,outline:[[31,281],[36,278],[36,263],[43,260],[48,279],[52,283],[50,294],[39,297],[31,292]]},
    {id:'mira-chest',depth:311,outline:[[43,282],[66,275],[79,281],[80,302],[56,311],[43,306]]},
    {id:'mira-couch',depth:294,outline:[[51,252],[65,247],[87,249],[105,255],[116,257],[124,268],[123,280],[120,291],[104,294],[51,288]]},
    {id:'mira-cabinet',depth:291,outline:[[130,266],[141,259],[152,260],[153,253],[158,253],[160,266],[165,270],[164,285],[151,291],[130,285]]},
    {id:'mira-entry-pot',depth:295,outline:[[176,280],[178,265],[187,260],[196,267],[199,281],[198,291],[185,295],[174,290]]}
  ];
  // Rebuild only when recruitment changes. Foreground occlusion uses this same
  // composite so covered furniture never flashes back to its inhabited artwork.
  const closedRooms=[
    {owner:'Torren',rect:[0,0,245,118]},
    {owner:'Glimmer',rect:[395,0,245,118]},
    {owner:'Seerin',rect:[0,118,245,93]},
    {owner:'Mira',rect:[0,211,245,145]},
    {owner:'Kael',rect:[395,211,245,145]},
    {owner:'Sparky',rect:[132,48,54,41]},
    {owner:'Torren',rect:[218,64,24,50]},
    {owner:'Glimmer',rect:[390,64,25,50]},
    {owner:'Seerin',rect:[249,117,28,70]},
    {owner:'Mira',rect:[214,222,23,55]},
    {owner:'Kael',rect:[404,222,23,55]},
    {owner:'Seerin',rect:[42,113,16,28]},
    {owner:'Seerin',rect:[143,113,16,28]},
    {owner:'Seerin',rect:[166,119,15,28]}
  ];
  let roomSignature=null,roomBackground=null;
  const droneWall=new Image();droneWall.src='assets/hall/living-256/drone-wall.webp';
  const kitchenTable=new Image();kitchenTable.src='assets/hall/living-257/table.webp';
  function hallBackground(){
    const signature=closedRooms.map(room=>state.party.includes(room.owner)?'1':'0').join('')+(droneWall.complete&&droneWall.naturalWidth?'d':'')+(kitchenTable.complete&&kitchenTable.naturalWidth?'k':'');
    if(roomSignature===signature&&roomBackground)return roomBackground;
    const original=images.hall,vacant=images['hall-uninhabited-v239'];
    if(!original||!vacant)return original;
    const surface=document.createElement('canvas');surface.width=original.width;surface.height=original.height;
    const paint=surface.getContext('2d'),sx=surface.width/W,sy=surface.height/H;
    paint.drawImage(original,0,0);
    if(state.party.includes('Torren')&&kitchenTable.complete&&kitchenTable.naturalWidth){
      const patch=document.createElement('canvas');patch.width=110;patch.height=85;
      const p=patch.getContext('2d');p.drawImage(kitchenTable,0,0,110,85);p.globalCompositeOperation='destination-in';
      for(const ends of [[0,0,5,0],[110,0,105,0],[0,0,0,5],[0,85,0,80]]){const fade=p.createLinearGradient(...ends);fade.addColorStop(0,'transparent');fade.addColorStop(1,'white');p.fillStyle=fade;p.fillRect(0,0,110,85);}
      paint.drawImage(patch,220,135);
    }
    // Remove the painted stationary drone before drawing its flying counterpart.
    // A feathered clean plate retains the original shelf/candle boundaries.
    if(droneWall.complete&&droneWall.naturalWidth){
      const patch=document.createElement('canvas');patch.width=90;patch.height=96;
      const p=patch.getContext('2d');p.drawImage(droneWall,0,0,90,96);p.globalCompositeOperation='destination-in';
      for(const ends of [[0,0,5,0],[90,0,85,0],[0,0,0,5],[0,96,0,91]]){const fade=p.createLinearGradient(...ends);fade.addColorStop(0,'transparent');fade.addColorStop(1,'white');p.fillStyle=fade;p.fillRect(0,0,90,96);}
      paint.drawImage(patch,1080,38);
    }
    for(const room of closedRooms){
      if(state.party.includes(room.owner))continue;
      let [x,y,w,h]=room.rect;
      const adjoining={Torren:[null,'Seerin'],Seerin:['Torren','Mira'],Mira:['Seerin',null]}[room.owner];
      const softenTop=w>200&&adjoining?.[0]&&state.party.includes(adjoining[0]);
      const softenBottom=w>200&&adjoining?.[1]&&state.party.includes(adjoining[1]);
      if(softenTop){y-=12;h+=12;}
      if(softenBottom)h+=12;
      // Blend within the room perimeter instead of cutting a dark rectangle
      // across continuous floorboards and masonry.
      const layer=document.createElement('canvas');layer.width=Math.ceil(w*sx);layer.height=Math.ceil(h*sy);
      const blend=layer.getContext('2d');blend.drawImage(vacant,x*sx,y*sy,w*sx,h*sy,0,0,layer.width,layer.height);
      blend.globalCompositeOperation='destination-in';
      const feather=w>200?48:Math.min(9,w/5,h/5);
      const edges=[
        [x>0,0,0,feather*sx,0],
        [x+w<W,layer.width,0,layer.width-feather*sx,0],
        [(w<100&&y>0)||softenTop,0,0,0,(softenTop?24:feather)*sy],
        [(w<100&&y+h<H)||softenBottom,0,layer.height,0,layer.height-(softenBottom?24:feather)*sy]
      ];
      for(const [enabled,x0,y0,x1,y1] of edges){
        if(!enabled)continue;
        const gradient=blend.createLinearGradient(x0,y0,x1,y1);
        gradient.addColorStop(0,'rgba(255,255,255,0)');gradient.addColorStop(1,'rgba(255,255,255,1)');
        blend.fillStyle=gradient;blend.fillRect(0,0,layer.width,layer.height);
      }
      paint.drawImage(layer,x*sx,y*sy);
    }
    roomSignature=signature;roomBackground=surface;return surface;
  }
  function drawForegroundProp(prop){ctx.save();ctx.beginPath();prop.outline.forEach(([x,y],i)=>{if(i)ctx.lineTo(x-camera.x,y-camera.y);else ctx.moveTo(x-camera.x,y-camera.y);});ctx.closePath();ctx.clip();ctx.drawImage(hallBackground(),-camera.x,-camera.y,W,H);ctx.restore();}
  const ready=Promise.all(['hall-uninhabited-v239','Verseborn',...actors.map(a=>a.id),'hall','effects','hearths'].map(name=>new Promise((resolve,reject)=>{
    const image=new Image();image.onload=()=>{images[name]=image;resolve();};image.onerror=()=>reject(Error(name+' asset missing'));image.src='assets/hall/'+(['hall','hall-uninhabited-v239','effects','hearths'].includes(name)?name:name.toLowerCase()+'-clean-v3')+'.webp';
  })));
  const walkReady=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{images.VersebornWalk=image;resolve();};image.onerror=()=>reject(Error('Verseborn walk asset missing'));image.src='assets/hall/refresh-309/verseborn-walk.webp';});
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
  const residents=()=>{const tinus=window.TinusRecruitment?.resident();return [...actors.filter(actor=>actor.id==='Marla'||state.party.includes(actor.id)),...(tinus?[tinus]:[]),...(window.HallBarSeating?[HallBarSeating.stool]:[])];};
  const barLines=[[["Tinus", "The portal owes me a refill."], ["Marla", "Put it on your tab."], ["Tinus", "Does the tab follow me across dimensions?"], ["Marla", "Try me. I have a very long ladle."]], [["Marla", "Coffee, or something that counts as lunch?"], ["Tinus", "Coffee has beans. Practically a vegetable."], ["Marla", "Then this soup is a three-course banquet."], ["Tinus", "Fine. But leave room for the vegetables in my mug."]], [["Tinus", "I found a dimension where nobody needed saving."], ["Marla", "Sounds restful. Why leave?"], ["Tinus", "Terrible coffee. Some sacrifices are too great."], ["Marla", "Well, save this bowl before it gets cold."]], [["Tinus", "You feed everyone who wanders in through a portal?"], ["Marla", "A warm meal first. Questions can wait until they stop shivering."], ["Tinus", "Dangerous policy. They might decide to stay."], ["Marla", "You are still on that stool, are you not?"]], [["Tinus", "Does Verseborn ever stop singing?"], ["Marla", "When Mira turns a corner. Then he follows like a lost puppy."], ["Tinus", "So she gets a soundtrack and a shadow?"], ["Marla", "And somehow I am still the one fetching him water."]]];
  const ambientBubbles=new Map();
  function marlaIdleFrame(now){const t=((now%18000)+18000)%18000;if(t<11000)return [4,5,4,5][Math.floor(t/750)%4];if(t<13500)return [9,10,11,10][Math.floor((t-11000)/625)];return 0;}
  function residentIdleFrame(id,now){if(id==='Marla')return marlaIdleFrame(now);const rest=id==='Sparky'?7000:12000,t=((now+actors.findIndex(a=>a.id===id)*731)%(rest+3000)+(rest+3000))%(rest+3000);return t<rest?0:Math.min(15,Math.floor((t-rest)/187.5));}
  function barMoment(elapsed){return ambientMoment(barLines,elapsed,12000,60000);}
  const kitchenLines=[[["Torren", "That stew is for everyone, little furnace."], ["Sparky", "Prrrp… grrr?"], ["Torren", "Those eyes will not get you a second bowl."], ["Sparky", "Chrrp… prrrr."]], [["Sparky", "Hrrrm… BUURP."], ["Torren", "A fine compliment. Mind the curtains."], ["Sparky", "Rrr? Hrrmph."], ["Torren", "Yes, even the expensive curtains."]], [["Torren", "One bowl. Then we train."], ["Sparky", "Rrrr! Chrrp!"], ["Torren", "Chasing the ladle does not count as training."], ["Sparky", "Grrr… prrrp!"]], [["Sparky", "Grrr… prrrp."], ["Torren", "Yes, yes. I saved you the crispy bits."], ["Sparky", "Chrrr! Prrrp!"], ["Torren", "Easy. I would like to keep all my fingers."]], [["Torren", "You kept watch while I slept, did you?"], ["Sparky", "Hrrm… rrr."], ["Torren", "Then you have earned the warm spot by the stove."], ["Sparky", "Prrrr… chrrp."]]];
  const ambientClocks=new Map();
  function ambientMoment(lines,elapsed,delay=12000,cycle=72000){
    if(elapsed<delay||!lines.length)return null;
    // Preserve the original quiet interval after the last reply, even for longer conversations.
    const quiet=cycle-9400,durations=lines.map(conversation=>conversation.length*5200-1000+quiet);
    let phase=(elapsed-delay)%durations.reduce((sum,duration)=>sum+duration,0),conversation=0;
    while(phase>=durations[conversation])phase-=durations[conversation++];
    const index=Math.floor(phase/5200);
    return index<lines[conversation].length&&phase%5200<4200?lines[conversation][index]:null;
  }
  function ambientChat(key,lines,participants,viewCamera,now,cycle=72000,delay=12000){
    const room=key==='rift-brothers'?'emberRiftVault':'emberHallBattles';
    for(const [id,bubble] of ambientBubbles)if((id==='rift-brothers'?'emberRiftVault':'emberHallBattles')!==state.map)bubble.hidden=true;
    if(state.map!==room||state.gameMode!=='hallBattles'){hideAmbientChat(key);return null;}
    let barBubble=ambientBubbles.get(key);
    if(!ambientClocks.has(key))ambientClocks.set(key,now);
    const line=mode==='walk'?ambientMoment(lines,now-ambientClocks.get(key),delay,cycle):null;
    if(!line){if(barBubble)barBubble.hidden=true;return null;}
    const actor=participants.find(a=>a.id===line[0]);
    if(!actor){if(barBubble)barBubble.hidden=true;return null;}
    const x=actor.x-viewCamera.x,y=actor.y-viewCamera.y-(actor.size||40)-7;
    if(!barBubble){barBubble=document.createElement('div');barBubble.className='hall-banter';barBubble.innerHTML='<strong></strong><span></span>';document.querySelector('.game').append(barBubble);ambientBubbles.set(key,barBubble);const observer=new MutationObserver(()=>{if(mode!=='walk')barBubble.hidden=true;});for(const node of [el.menu,el.dialogue,el.battle])if(node)observer.observe(node,{attributes:true,attributeFilter:['class']});}
    barBubble.dataset.conversation=key;barBubble.querySelector('strong').textContent=line[0];barBubble.querySelector('span').textContent=line[1];barBubble.hidden=false;
    const rect=canvas.getBoundingClientRect(),gameNode=document.querySelector('.game'),game=gameNode.getBoundingClientRect(),scaleX=game.width/gameNode.offsetWidth,scaleY=game.height/gameNode.offsetHeight;
    // Hearth-side speakers can be visible while their overhead bubble would
    // fall above the canvas. Put that bubble below them; offscreen chats stay
    // attached to their world positions rather than being pinned to the screen.
    const visible=x>=0&&x<=LOGICAL_WIDTH&&actor.y-viewCamera.y>=0&&actor.y-viewCamera.y<=LOGICAL_HEIGHT;
    const below=visible&&y/LOGICAL_HEIGHT*rect.height<barBubble.offsetHeight*scaleY+8;
    barBubble.classList.toggle('below',below);
    const anchorY=below?actor.y-viewCamera.y+4:y;
    barBubble.style.left=((rect.left-game.left+x/LOGICAL_WIDTH*rect.width)/scaleX)+'px';barBubble.style.top=((rect.top-game.top+anchorY/LOGICAL_HEIGHT*rect.height)/scaleY)+'px';
    return line[0];
  }
  function resetAmbientChat(key){ambientClocks.delete(key);hideAmbientChat(key);}
  function hideAmbientChat(key=null){for(const[id,bubble]of ambientBubbles)if(key===null||key===id)bubble.hidden=true;}
  function barChatter(now){
    hideAmbientChat('rift-brothers');
    if(mode!=='walk'||activeRecruitScene||(scene&&now-scene.started<scene.duration)){hideAmbientChat();return null;}
    const kitchenReady=['Torren','Sparky'].every(id=>state.party.includes(id));
    // Count time actually spent walking in the Hall, so the conversation is
    // not silently consumed while shopping, in another room or in a cutscene.
    const kitchenSpeaker=kitchenReady?ambientChat('kitchen',kitchenLines,actors,camera,window.HallKitchen?.clock??now):null;
    if(!kitchenReady)hideAmbientChat('kitchen');
    const tinus=window.TinusRecruitment?.resident(),eligible=tinus?.pose==='seated'&&window.TinusRecruitment?.progress().recruited&&!window.TinusRecruitment?.replaying;
    if(!eligible){ambientClocks.delete('bar');hideAmbientChat('bar');return kitchenSpeaker;}
    return ambientChat('bar',barLines,[tinus,actors.find(a=>a.id==='Marla')],camera,now,60000)||kitchenSpeaker;
  }
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
  // Floor-level footprints only: paper and cobwebs remain walkable.
  const vacantClutter=[
    ['Torren',105,84,10,7],['Torren',147,88,10,6],
    ['Glimmer',458,80,9,7],['Glimmer',509,81,10,7],['Glimmer',576,85,10,7],
    ['Seerin',66,169,13,10],['Seerin',60,184,9,5],['Seerin',151,176,11,9],['Seerin',177,185,12,8],['Seerin',148,195,11,7],
    ['Mira',66,318,12,9],['Mira',108,291,10,8],['Mira',151,302,11,8],
    ['Kael',489,329,12,8],['Kael',553,336,10,7]
  ];
  const clutterCollision=(x,y)=>vacantClutter.some(([owner,cx,cy,rx,ry])=>!state.party.includes(owner)&&Math.abs(x-cx)<rx+4&&Math.abs(y-cy)<ry+2);
  const collision=(x,y,ignoreClutter=false)=>!ignoreClutter&&clutterCollision(x,y)||![[0,0],[-5,0],[5,0],[0,-2],[0,2]].every(([dx,dy])=>onFloor(x+dx,y+dy)&&!solidFeet.some(poly=>inPolygon(x+dx,y+dy,poly)))||walls.some(([l,t,w,h])=>{const padding=l===381&&t===85?2:l===100&&t===58?3:7;return x>l-padding&&x<l+w+padding&&y>t-3&&y<t+h+3;})||obstacles.some(o=>((x-o.x)/(o.rx+5))**2+((y-o.y)/(o.ry+2))**2<1)||((x-resonance.x)/63)**2+((y-124)/33)**2<1;
  function clearSegment(ax,ay,bx,by,ignoreClutter=false){
    const n=Math.ceil(Math.hypot(bx-ax,by-ay)/.5);
    for(let i=1;i<=n;i++)if(collision(ax+(bx-ax)*i/n,ay+(by-ay)*i/n,ignoreClutter))return false;
    return true;
  }
  // Cache the floor grid and safe diagonal edges; clicks only search its reachable component.
  const navStep=2,navCols=W/navStep,navRows=H/navStep,navNodes=new Map();
  const nodeKey=(x,y)=>y*navCols+x;
  for(let y=1;y<navRows;y++)for(let x=1;x<navCols;x++){
    if(!collision(x*navStep,y*navStep,true))navNodes.set(nodeKey(x,y),{x:x*navStep,y:y*navStep,edges:[]});
  }
  for(const [key,node] of navNodes){
    const gx=node.x/navStep,gy=node.y/navStep;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
      const nextKey=nodeKey(gx+dx,gy+dy),next=navNodes.get(nextKey);
      if(next&&clearSegment(node.x,node.y,next.x,next.y,true))node.edges.push(nextKey);
    }
  }
  function findPath(from,x,y){
    if(!Number.isFinite(x)||!Number.isFinite(y))return null;
    let start=null,startDistance=Infinity;
    // The saved/player position need not be an exact grid point.
    for(const [key,node] of navNodes){
      const distance=Math.hypot(node.x-from.x,node.y-from.y);
      if(distance<startDistance&&distance<=4&&clearSegment(from.x,from.y,node.x,node.y)){start=key;startDistance=distance;}
    }
    if(start===null)return null;
    const queue=[start],previous=new Map([[start,null]]);
    let end=null,bestDistance=Infinity;
    for(let i=0;i<queue.length;i++){
      const key=queue[i],node=navNodes.get(key),distance=Math.hypot(node.x-x,node.y-y);
      if(distance<bestDistance){end=key;bestDistance=distance;}
      if(distance<.5)break;
      for(const next of node.edges)if(!previous.has(next)){
        const neighbor=navNodes.get(next);
        if(clutterCollision(neighbor.x,neighbor.y)||clutterCollision((node.x+neighbor.x)/2,(node.y+neighbor.y)/2))continue;
        previous.set(next,key);queue.push(next);
      }
    }
    // Snap near-edge clicks to reachable floor, never to a distant room through a wall.
    if(bestDistance>18)return null;
    const path=[];
    for(let key=end;key!==null;key=previous.get(key)){const node=navNodes.get(key);path.unshift({x:node.x,y:node.y});}
    return path;
  }
  function navigate(x,y,actor=null){
    const path=findPath(player,x,y);if(!path)return false;
    route=path;target=route.shift()||null;pendingActor=actor;
    return Boolean(target);
  }
  function drawActor(actor,row,col){
    if(window.HallKitchen?.drawActor(actor,camera))return;
    if(window.HallLiveliness?.drawActor(actor,camera))return;
    if(actor.id==='Tinus'&&window.TinusCharacter){window.TinusRecruitment?.drawPortal(actor,camera,performance.now());ctx.save();ctx.globalAlpha=actor.alpha??1;window.TinusCharacter.drawField(actor,camera,performance.now());ctx.restore();return;}
    // Scale Hall art around its existing foot anchor; size still defines interaction bounds.
    const size=actor.size*(actors.find(resident=>resident.id===actor.id)?.renderScale??1);
    if(actor.id==='Kael'&&actor.visiting&&window.KaelHallVisits?.walkImage.complete){
      const image=window.KaelHallVisits.walkImage,frame=actor.walking?Math.floor(actor.walkPhase||0)%8:8,facing=actor.facing||0,sheetRow=[0,1,2,2,3,3,4,4][facing];
      ctx.save();ctx.translate(Math.round(actor.x-camera.x),Math.round(actor.y-camera.y-size*.94));
      if([2,4,6].includes(facing))ctx.scale(-1,1);
      const bodyWidth=size*1.12;ctx.drawImage(image,frame*128,sheetRow*128,128,128,-bodyWidth/2,0,bodyWidth,size);ctx.restore();return;
    }
    if(actor.id==='Verseborn'&&row===8&&images.VersebornLute){
      const index=Math.max(0,Math.min(15,col));
      ctx.drawImage(images.VersebornLute,index%4*100,Math.floor(index/4)*100,100,100,Math.round(actor.x-camera.x-size/2),Math.round(actor.y-camera.y-size*.94),size,size);return;
    }
    if(actor.id==='Verseborn'&&row>=0&&row<=7&&images.VersebornWalk){
      const index=actor.poseFrame??(player.walking?Math.floor(player.phase)%8:8);
      const sheetRow=[0,1,2,2,3,3,4,4][row];
      if(window.HallSpriteRefresh?.draw(ctx,'Verseborn',actor.x-camera.x,actor.y-camera.y,size*1.08,sheetRow*9+index,[2,4,6].includes(row)))return;
      ctx.save();ctx.translate(Math.round(actor.x-camera.x),Math.round(actor.y-camera.y-size*.94));
      if([2,4,6].includes(row))ctx.scale(-1,1);
      ctx.drawImage(images.VersebornWalk,index*128,sheetRow*128,128,128,-size/2,0,size,size);ctx.restore();return;
    }
    if(row===4&&['Mira','Seerin'].includes(actor.id)&&window.HallSpriteRefresh?.draw(ctx,actor.id,actor.x-camera.x,actor.y-camera.y,size,col%16))return;
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
  const interactionRadius=a=>a===resonance||a.barStool?23:a.approach?32:42;
  const interactionDistance=a=>Math.hypot(player.x-(a.approach?.x??a.x),player.y-(a.approach?.y??a.y));
  const canInteract=a=>interactionDistance(a)<=interactionRadius(a);
  function nearby(){
    const riftDoor=window.EmberRift?.nearbyHallDoor(player);if(riftDoor)return riftDoor;
    if(Math.hypot(player.x-resonance.approach.x,player.y-resonance.approach.y)<23)return resonance;
    return residents().filter(canInteract).sort((a,b)=>interactionDistance(a)-interactionDistance(b))[0];
  }
  function trigger(actor){
    keys.clear();target=null;route=[];pendingActor=null;
    if(actor.barStool){window.HallBarSeating?.sit();return;}
    if(actor.id==='Tinus'&&window.TinusRecruitment?.interact())return;
    if(window.EmberRift?.triggerHall(actor))return;
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
    ctx.drawImage(hallBackground(),0,0,W,H);
    if(stageSelectorImage){
      if(window.HallOpening)HallOpening.drawMachine(ctx,stageSelectorImage,resonance.x,resonance.y,resonance.width,resonance.height);
      else ctx.drawImage(stageSelectorImage,0,0,stageSelectorImage.width/4,stageSelectorImage.height,resonance.x-resonance.width/2,resonance.y-resonance.height,resonance.width,resonance.height);
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
    if(window.HallBarSeating?.active){keys.clear();player.walking=false;return;}
    if(mode!=='walk'||activeRecruitScene||window.TinusRecruitment?.replaying){keys.clear();player.walking=false;return;}
    // Recover positions saved inside an old obstacle before attempting a new route.
    if(collision(player.x,player.y)){
      let nearest=null,distance=Infinity;
      for(const node of navNodes.values()){
        if(collision(node.x,node.y))continue;
        const d=Math.hypot(node.x-player.x,node.y-player.y);
        if(d<distance){nearest=node;distance=d;}
      }
      if(nearest){player.x=nearest.x;player.y=nearest.y;target=null;route=[];pendingActor=null;}
    }
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
    if(pendingActor&&(!target||canInteract(pendingActor))){const actor=pendingActor;pendingActor=null;trigger(actor);}
  }
  drawTileMap=function(){
    if(!inHall()||activeRecruitScene){last=performance.now();oldDraw();return;}
    const now=performance.now();update(now);window.TinusRecruitment?.tick(now);
    window.EmberRift?.tickHallDoor(player);
    // Door activation can change maps during this draw. Do not let the rest
    // of the Hall pass recreate its conversations in the newly entered room.
    if(!inHall()){hideAmbientChat();return;}
    const focus=window.TinusRecruitment?.focus()||player;
    camera.x=Math.max(0,Math.min(W-LOGICAL_WIDTH,focus.x-LOGICAL_WIDTH/2));
    camera.y=Math.max(0,Math.min(H-LOGICAL_HEIGHT,focus.y-LOGICAL_HEIGHT*.6));
    ctx.drawImage(hallBackground(),-camera.x,-camera.y,W,H);window.HallBarSeating?.environment(camera);
    window.EmberRift?.drawHallDoor(camera,now);
    window.HallHub?.drawAreas(camera);window.HallLiveliness?.drawLabProps(camera);
    const fx=images.effects,cw=fx.width/4,ch=fx.height/2,frame=Math.floor(now/180)%4;
    ctx.save();
    for(const [i,[x,y,w,h]] of [[77,23,25,21],[564,136,19,19]].entries()){
      if(i===0&&!state.party.includes('Torren'))continue;
      ctx.save();ctx.beginPath();ctx.rect(x-camera.x,y-camera.y,w,h);ctx.clip();
      ctx.drawImage(images.hearths,i*32,0,32,32,x-camera.x,y-camera.y,w,h);
      ctx.drawImage(fx,frame*cw,0,cw,ch,x-camera.x-2,y-camera.y-1,w+4,h+2);ctx.restore();
    }
    window.HallKitchen?.drawPot(camera,now);
    ctx.globalAlpha=.23;ctx.drawImage(fx,frame*cw,ch,cw,ch,479-camera.x,141-camera.y,12,17);ctx.restore();
    window.KaelHallVisits?.tick(now);window.HallLiveliness?.tick(now);window.HallKitchen?.tick(now);
    const things=[...residents(),{...resonance,machine:true},{id:'Verseborn',x:player.x,y:player.y,size:36,player:true},...foregroundProps.map(prop=>({y:prop.depth,prop}))].sort((a,b)=>a.y-b.y);
    const speaking=barChatter(now);
    for(const actor of things){
      if(actor.barStool)continue;
      if(actor.player&&window.HallBarSeating?.active)continue;
      if(actor.prop){drawForegroundProp(actor.prop);continue;}
      if(actor.machine){
        const image=stageSelectorImage;
        if(image){if(window.HallOpening)HallOpening.drawMachine(ctx,image,actor.x-camera.x,actor.y-camera.y,actor.width,actor.height,now);else ctx.drawImage(image,0,0,image.width/4,image.height,actor.x-camera.x-actor.width/2,actor.y-camera.y-actor.height,actor.width,actor.height);}
        continue;
      }
      let row=0,col=0;
      if(actor.player){row=player.facing;col=player.walking?walkFrame(actor.id,row,player.phase):0;}
      else if(actor.id==='Kael'&&actor.visiting){row=[0,1,2,3,2,3,2,3][actor.facing||0];col=0;}
      else {
        const acting=scene?.id===actor.id&&now-scene.started<scene.duration;
        row=4;
        const practice=['Seerin','Mira'].includes(actor.id),fps=acting?12:actor.id==='Sparky'?8:10;
        const elapsed=acting?now-scene.started:now+actors.indexOf(actor)*731;
        const cycle=practice&&!acting?32:16,phase=Math.floor(elapsed*fps/1000)%cycle;
        col=phase<16?phase:0;
        if(!acting)col=residentIdleFrame(actor.id,now);
        if(actor.id==='Seerin')col=[0,1,2,3,5,6,7,8,9,10,11,12,13,14,15,0][col];
        if(actor.id==='Marla'&&!acting)col=speaking==='Marla'?12:marlaIdleFrame(now);
      }
      if(!actor.clipY)drawFieldShadow(actor.x-camera.x,actor.y-camera.y,actor.id==='Sparky'?3:5);
      drawActor(actor,row,col);
    }
    window.HallLiveliness?.drawEffects(camera);window.HallBarSeating?.drawPlayer(camera,now);
    const near=nearby();if(near&&mode==='walk'&&!window.HallBarSeating?.active)drawText(near.id+'  [E]',near.x-camera.x,near.y-camera.y-38,'#fff0b5',6,'center');
    drawText('EMBER HALL',7,11,'#fff0b5',7);
    el.place.textContent='Ember Hall';
  };
  const controls=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','e']);
  document.addEventListener('focusin',event=>{if(editableKeyboardTarget(event))keys.clear();},true);
  document.addEventListener('keydown',event=>{
    if(editableKeyboardTarget(event))return;
    if(!inHall()||activeRecruitScene||!['walk','talk'].includes(mode))return;
    const key=event.key.length===1?event.key.toLowerCase():event.key;
    if(!controls.has(key))return;event.preventDefault();event.stopImmediatePropagation();
    if(key==='e'){if(!event.repeat)interact();}else if(mode==='walk')keys.add(key);
  },true);
  document.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key),true);
  window.addEventListener('blur',()=>keys.clear());
  canvas.addEventListener('pointerdown',event=>{
    if(window.HallBarSeating?.active){if(mode==='walk'){const r=canvas.getBoundingClientRect(),x=(event.clientX-r.left)/r.width*LOGICAL_WIDTH+camera.x,y=(event.clientY-r.top)/r.height*LOGICAL_HEIGHT+camera.y;if(Math.abs(x-529)<22&&y>122&&y<164)HallBarSeating.openShop();else HallBarSeating.stand();}event.preventDefault();event.stopImmediatePropagation();return;}
    if(window.TinusRecruitment?.replaying){event.preventDefault();event.stopImmediatePropagation();return;}
    if(!inHall()||mode!=='walk'||activeRecruitScene)return;
    event.preventDefault();event.stopImmediatePropagation();suppressClick=true;
    const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width*LOGICAL_WIDTH+camera.x,y=(event.clientY-rect.top)/rect.height*LOGICAL_HEIGHT+camera.y;
    const riftDoor=window.EmberRift?.hallDoorHit(x,y);if(riftDoor){if(nearby()?.id===riftDoor.id)trigger(riftDoor);else navigate(riftDoor.approach.x,riftDoor.approach.y,riftDoor);return;}
    const clicked=residents().find(a=>Math.abs(x-a.x)<a.size*.5&&y>a.y-a.size&&y<a.y+4);
    if(clicked){if(canInteract(clicked))trigger(clicked);else {const point=clicked.approach||clicked;navigate(point.x,point.y,clicked);}}
    else if(Math.abs(x-resonance.x)<resonance.width/2&&y>resonance.y-resonance.height&&y<resonance.y){
      if(nearby()?.id===resonance.id)trigger(resonance);else navigate(resonance.approach.x,resonance.approach.y,resonance);
    }
    else navigate(x,y);
  },true);
  // The legacy tile-grid click handler must not run after our world-space path.
  canvas.addEventListener('click',event=>{if(inHall()&&suppressClick){suppressClick=false;event.preventDefault();event.stopImmediatePropagation();}},true);
  window.emberHallWorld={hallBackground,closedRooms,vacantClutter,findPath,canInteract,interactionRadius,player,actors,resonance,walls,floors,obstacles,collision,images,trigger,navigate,nearby,residents,resetNavigation,marlaIdleFrame,barMoment,ambientMoment,ambientChat,hideAmbientChat,resetAmbientChat,kitchenLines,barLines,clearNavigation(){keys.clear();target=null;route=[];pendingActor=null;},drawActor(actor,row,col,externalCamera){const previous={...camera};if(externalCamera)Object.assign(camera,externalCamera);drawActor(actor,row,col);Object.assign(camera,previous);},get route(){return route;},get target(){return target;},get camera(){return camera;},get scene(){return scene;}};
  // Cinematics reuse the actual Hall scenery and foreground depth without
  // advancing resident AI or changing saved actors.
  Object.assign(window.emberHallWorld,{foregroundProps,
    drawCinematicForeground(prop){const previous={...camera};Object.assign(camera,{x:0,y:0});drawForegroundProp(prop);Object.assign(camera,previous);},
    drawCinematicFixtures(now){
      window.HallLiveliness?.drawLabProps({x:0,y:0});
      const fx=images.effects,cw=fx.width/4,ch=fx.height/2,frame=Math.floor(now/180)%4;
      for(const [i,[x,y,w,h]]of [[77,23,25,21],[564,136,19,19]].entries()){
        if(i===0&&!state.party.includes('Torren'))continue;
        ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(images.hearths,i*32,0,32,32,x,y,w,h);ctx.drawImage(fx,frame*cw,0,cw,ch,x-2,y-1,w+4,h+2);ctx.restore();
      }
      window.HallKitchen?.drawPot({x:0,y:0},now);
    }
  });
  const engineReady=new Promise(resolve=>{const timer=setInterval(()=>{if(runtimeAssetsReady){clearInterval(timer);resolve();}},50);});
  Promise.all([ready,walkReady,luteReady,actionsReady,engineReady]).then(()=>{
    active=true;
    maps.emberHallBattles.name='Ember Hall';
    RECRUIT_SCENE_ROOM_NAMES['trial-room']='Ember Hall';
    if(state.gameMode==='hallBattles')resetNavigation();
    window.emberHallWorld.ready=true;
  }).catch(error=>{console.error(error);window.emberHallWorld.failed=true;});
})();
