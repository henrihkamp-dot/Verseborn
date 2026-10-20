from pathlib import Path
p=Path(__file__).resolve().parents[1]/'public/game/welcome-cinematics.js'
s=p.read_text(encoding='utf-8')
s=s.replace("coreIds=['Verseborn','Mira','Torren','Seerin','Kael','Sparky','Marli']","coreIds=['Verseborn','Mira','Torren','Seerin','Kael','Sparky','Marli']")
s=s.replace("welcome-story.json?v=302","welcome-story.json?v=303")
a=s.index('  function assets()');z=s.index('  const clamp=',a)
s=s[:a]+'''  function assets(){return assetsPromise??=Promise.all([scripts,...guestIds.flatMap(id=>[load(id,BASE+id.toLowerCase()+'.webp'),load('portrait-'+id,BASE+id.toLowerCase()+'-portrait.webp')]),load('revusReaction','assets/hall/welcome-303/revus-chibi.webp'),load('revusWalk','assets/hall/welcome-303/revus-walk.webp'),load('hallCook','assets/hall/living-256/torren-kitchen.webp'),...['register','badge','bandages','ribbon','ledger','stew','blanket','provisions',0,1,2].map(id=>load(id,BASE+(Number.isInteger(id)?'chibi-'+id:id)+'.webp'))]);}
  const HALL_SIZES={Verseborn:36,Mira:36,Torren:32,Seerin:42,Kael:40,Sparky:30,Marli:38,Glimmer:36,Revus:40,Nyx:30,Rava:30,Jory:30};
  const SHOTS={Mira:{x:320,y:235,w:230},Torren:{x:135,y:81,w:244},Seerin:{x:122,y:170,w:270},Kael:{x:510,y:308,w:230},Sparky:{x:164,y:84,w:240}};
  const EXTRA={Mira:{Kael:[245,230],Seerin:[390,248]},Torren:{Mira:[180,92],Seerin:[215,108],Glimmer:[200,81]},Seerin:{Mira:[180,184],Torren:[226,200]},Kael:{Glimmer:[540,334]},Sparky:{Torren:[95,55]}};
''' +s[z:]
a=s.index('  function actor(');z=s.index('  function currentPos(',a)
s=s[:a]+'''  function actor(id,x,y,size,extra={}){return{id,x,y,size:HALL_SIZES[id]||size||36,pose:0,row:0,alpha:1,...extra};}
  function initial(id){
    if(id==='Mira')return[actor('Revus',355,227),actor('Mira',310,232),actor('Verseborn',270,267)];
    if(id==='Torren')return[actor('Torren',212,88),actor('Verseborn',150,89),actor('Marli',240,105)];
    if(id==='Seerin')return[actor('Seerin',88,180),actor('Rava',48,179,{pose:5}),actor('Nyx',145,180),actor('Jory',120,190),actor('Verseborn',210,190)];
    if(id==='Kael')return[actor('Kael',464,316),actor('Verseborn',510,334)];
    return[actor('Sparky',165,82),actor('Verseborn',146,94),...(scene.full?[actor('Mira',230,104),actor('Seerin',251,108)]:[])];
  }
  function move(id,x,y,duration=1800){
    const a=scene.actors.find(a=>a.id===id);if(!a)return;
    const here=currentPos(a),path=emberHallWorld.findPath(here,x,y);
    if(!path?.length)return false;
    const points=[[here.x,here.y],...path.map(p=>[p.x,p.y])],length=points.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-points[i][0],p[1]-points[i][1]),0);
    a.x=here.x;a.y=here.y;a.motion={x:here.x,y:here.y,toX:points.at(-1)[0],toY:points.at(-1)[1],points,length,at:scene.clock,duration:Math.max(duration,length/18*1000)};
    scene.holdUntil=Math.max(scene.holdUntil||0,a.motion.at+a.motion.duration+250);return true;
  }
  function add(id,x,y){return scene.actors.find(a=>a.id===id)||null;}
''' +s[z:]
s=s.replace("row:Math.abs(dx)>Math.abs(dy)?dx>0?3:2:dy>0?0:1}","row:Math.abs(dx)>Math.abs(dy)?dx>0?3:2:dy>0?0:1,facing:Math.abs(dx)>Math.abs(dy)?dx>0?2:3:dy>0?0:1,distance:m.length*t}")
a=s.index('  function event(');z=s.index('  function portrait(',a)
s=s[:a]+'''  function event(name){
    const s=scene;s.event=name;s.effectAt=s.clock;const get=id=>s.actors.find(a=>a.id===id);
    switch(name){
      case 'verse-enter':move('Verseborn',s.id==='Seerin'?185:277,s.id==='Seerin'?185:237);break;
      case 'father':get('Revus').pose=2;break;
      case 'register':s.prop='register';get('Revus').pose=1;break;
      case 'revus-chibi':s.cutaway='revusReaction';sfx('magic',.18);break;
      case 'revus-composed':s.cutaway=null;get('Revus').pose=0;break;
      case 'revus-leave':get('Revus').pose=5;move('Revus',320,340);break;
      case 'sign':get('Revus').alpha=0;s.prop='register';break;
      case 'mira-door':break;
      case 'torren-enter':s.prop='provisions';move('Torren',116,85);break;
      case 'shelf':s.prop='provisions';sfx('block');break;
      case 'marli-enter':move('Marli',164,84);break;
      case 'badge':s.prop='badge';break;
      case 'cooking':s.prop=null;get('Torren').cooking=true;move('Torren',95,55);break;
      case 'stew':case 'supper':case 'quiet':s.prop='stew';break;
      case 'mira-enter':break;
      case 'practice':get('Seerin').practice=true;get('Rava').pose=5;break;
      case 'farewell':get('Seerin').practice=false;get('Jory').pose=2;get('Rava').pose=2;get('Nyx').pose=2;break;
      case 'poster':get('Jory').pose=1;get('Nyx').pose=1;break;
      case 'rava-worry':get('Rava').pose=2;get('Nyx').pose=2;break;
      case 'promise':move('Verseborn',160,187);break;
      case 'ribbon':s.prop='ribbon';get('Nyx').pose=5;get('Rava').pose=0;break;
      case 'last-round':get('Seerin').practice=true;get('Rava').pose=5;get('Jory').pose=5;break;
      case 'last-round-end':get('Seerin').practice=false;break;
      case 'supplies':case 'cup':case 'healer':case 'healer-end':case 'wash':s.prop='bandages';break;
      case 'ledger':case 'oath':s.prop='ledger';break;
      case 'bowl':s.prop='blanket';s.cutaway=1;break;
      case 'duo-enter':s.cutaway=null;move('Mira',194,91);move('Seerin',220,102);break;
      case 'cute':s.cutaway=0;sfx('magic',.23);break;
      case 'freeze':s.cutaway=null;sfx('block',.12);break;
      case 'scold':s.cutaway=2;break;
      case 'apology':s.cutaway=null;break;
      case 'strap':s.sparkySniff=true;break;
      case 'choice':s.cutaway=null;s.sparkySniff=false;s.prop='blanket';break;
      case 'settle':break;
      case 'torren-cameo':s.prop='stew';break;
      case 'title':s.cutaway=null;break;
    }
  }
''' +s[z:]
s=s.replace("scene.actors=scene.actors.filter(a=>!a.cameo||a.id===b.speaker);", "// The cast is staged once. Dialogue never creates or removes an actor.")
a=s.index("    if(b.speaker&&!scene.actors.some(");z=s.index('    ui.location.textContent',a)
s=s[:a]+s[z:]
s=s.replace("ui.speaker.textContent=b.speaker==='Revus'?'Baron Revus Veln':b.speaker||'';", "ui.speaker.textContent=b.speaker==='Revus'?'Baron Revus Veln':b.offscreen?'Marli · from the bar':b.speaker||'';")
a=s.index('    const targets=scene.actors.map(');z=s.index('    return true;',a)
s=s[:a]+'''    const shot=SHOTS[scene.id];scene.cameraFrom={...scene.camera};scene.cameraTo={...shot,w:shot.w*(b.shot==='close'?.92:1)};
''' +s[z:]
s=s.replace("camera:{x:320,y:226,w:640}","camera:{...SHOTS[id]},draws:[]")
s=s.replace("scene.actors=initial(id);scene.beats=", "scene.actors=initial(id);for(const [extra,[x,y]]of Object.entries(EXTRA[id]||{}))if(roster.has(extra)&&!scene.actors.some(a=>a.id===extra))scene.actors.push(actor(extra,x,y));scene.beats=")
a=s.index('  function drawActor(');z=s.index('  function imageAt(',a)
s=s[:a]+'''  function drawActor(a){
    if(a.alpha<=0)return;const p=currentPos(a),now=scene.clock,id=a.id==='Marli'?'Marla':a.id,size=a.size;
    ctx.save();ctx.globalAlpha=a.alpha;const walking=Boolean(p.walking),frame=walking?Math.floor((p.distance||0)/2.5)%8:0;
    ctx.fillStyle='#0a05084a';ctx.beginPath();ctx.ellipse(p.x,p.y-1,size*.15,size*.05,0,0,Math.PI*2);ctx.fill();
    let source;
    if(guestIds.includes(a.id)){
      const walk=walking&&a.id==='Revus',image=walk?art.revusWalk:art[a.id],cols=walk?8:3,cell=walk?128:256,index=walk?frame:a.pose;
      ctx.save();ctx.translate(p.x,p.y);if(walking?a.motion.toX<a.motion.x:a.id==='Revus')ctx.scale(-1,1);ctx.drawImage(image,index%cols*cell,walk?0:Math.floor(index/cols)*cell,cell,cell,-size/2,-size*(walk?.94:244/256),size,size);ctx.restore();source=walk?'hall/welcome-303/revus-walk.webp':'hall/welcome-302/'+a.id.toLowerCase()+'.webp';
    }else if(id==='Verseborn'){
      emberHallWorld.drawActor({...p,id,size,poseFrame:walking?frame:8},walking?p.facing:(scene.id==='Mira'||scene.id==='Seerin'?2:3),0,{x:0,y:0});source='hall/verseborn-walk-v2.webp';
    }else if(id==='Kael'&&walking){
      emberHallWorld.drawActor({...p,id,size,visiting:true,walking:true,facing:p.facing,walkPhase:(p.distance||0)/2.5},0,0,{x:0,y:0});source='hall/kael-walk-v237.webp';
    }else if(walking){
      const image=emberHallWorld.images[id],cell=image.width/8;ctx.drawImage(image,frame*cell,p.row*cell,cell,cell,p.x-size/2,p.y-size*.94,size,size);source='hall/'+id.toLowerCase()+'-clean-v3.webp';
    }else if(id==='Torren'&&a.cooking){
      const image=art.hallCook,cell=image.width/4,index=[0,1,2,1][Math.floor(now/340)%4];ctx.drawImage(image,index*cell,0,cell,cell,p.x-size/2,p.y-size*.94,size,size);source='hall/living-256/torren-kitchen.webp';
    }else{
      const index=id==='Marla'?scene.beat.speaker==='Marli'?12:emberHallWorld.marlaIdleFrame(now):a.practice?[0,1,2,3,5,6,7,8,9,10,11,12,13,14,15,0][Math.floor(now/180)%16]:0;
      emberHallWorld.drawActor({...p,id,size,kitchenActive:false,labActive:id==='Glimmer',labClock:now,labRow:2,labLift:0},4,index,{x:0,y:0});source='hall/'+id.toLowerCase()+'-action-'+(id==='Kael'?'v9':'v8')+'.webp';
    }
    scene.draws.push({id:a.id,source,frame,walking,x:p.x,y:p.y,size});ctx.restore();
  }
  function drawHall(){
    const world=emberHallWorld,now=scene.clock;scene.draws=[];ctx.drawImage(world.hallBackground(),0,0,640,356);
    const machine=world.resonance;if(window.HallOpening&&stageSelectorImage)HallOpening.drawMachine(ctx,stageSelectorImage,machine.x,machine.y,machine.width,machine.height,now);
    const names=new Set(scene.actors.map(a=>a.id==='Marli'?'Marla':a.id));
    const residents=world.residents().filter(a=>!a.barStool&&!names.has(a.id)).map(a=>({...a,id:a.id==='Marla'?'Marli':a.id}));
    const things=[...scene.actors,...residents,...world.foregroundProps.map(prop=>({y:prop.depth,prop}))].sort((a,b)=>(a.prop?a.y:currentPos(a).y)-(b.prop?b.y:currentPos(b).y));
    world.drawCinematicFixtures(now);
    for(const a of things){if(a.prop)world.drawCinematicForeground(a.prop);else drawActor(a);}
  }
''' +s[z:]
a=s.index("ctx.drawImage(art[s.background],0,0,640,356);");z=s.index("    ctx.restore();",a)
s=s[:a]+"drawHall();\n"+s[z:]
s=s.replace("if(!force&&scene.clock-scene.beatAt<(scene.beat.minMs||350))", "if(!force&&(scene.clock<(scene.holdUntil||0)||scene.clock-scene.beatAt<(scene.beat.minMs||350)))")
s=s.replace("scene.clock-scene.beatAt>=delay)","scene.clock-scene.beatAt>=delay&&scene.clock>=(scene.holdUntil||0))")
s=s.replace("beat:scene.beat,length:scene.beats.length", "beat:scene.beat,length:scene.beats.length,draws:scene.draws,background:'ember-hall',holdUntil:scene.holdUntil,clock:scene.clock")
# Preview retains exactly the same cast as normal playback.
s=s.replace("scene.actors=initial(id);scene.prop=null;", "scene.actors=initial(id);for(const [extra,[x,y]]of Object.entries(EXTRA[id]||{}))if(scene.roster.has(extra)&&!scene.actors.some(a=>a.id===extra))scene.actors.push(actor(extra,x,y));scene.prop=null;")
s=s.replace("scene.clock+=Math.max(scene.beat.minMs||0,2000);", "scene.clock=Math.max(scene.clock+Math.max(scene.beat.minMs||0,2000),scene.holdUntil||0);")
p.write_text(s,encoding='utf-8')
print('Hall backgrounds, Hall sprite renderer, real path walking, stable cast.')
