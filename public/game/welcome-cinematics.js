// Recruitment vignettes are transient: guests, poses and camera never enter a save.
(() => {
  'use strict';
  const BASE='assets/hall/welcome-302/',art={},guestIds=['Revus','Nyx','Rava','Jory'],ids=['Mira','Torren','Seerin','Kael','Sparky','Glimmer'],coreIds=['Verseborn','Mira','Torren','Seerin','Kael','Sparky','Marli'];
  let stories,scene=null,loading=false,raf,assetsPromise;
  const game=document.querySelector('.game'),overlay=document.createElement('section');
  overlay.className='welcome-film';overlay.hidden=true;overlay.setAttribute('aria-label','Flameguard introduction');
  overlay.innerHTML='<div class="welcome-location"></div><button type="button" class="welcome-skip">Skip scene</button><div class="welcome-caption"><small></small><h2></h2><p></p></div><div class="welcome-dialogue" aria-live="polite"><img class="welcome-portrait" alt=""><div><strong class="welcome-speaker"></strong><p class="welcome-line"></p></div><button type="button" class="welcome-next" aria-label="Continue dialogue">Continue <span>↵</span></button></div><button type="button" class="welcome-auto"></button>';
  game.append(overlay);
  const ui=Object.fromEntries(['location','skip','caption','dialogue','portrait','speaker','line','next','auto'].map(k=>[k,overlay.querySelector('.welcome-'+k)]));
  const oldPlay=playRecruitScene,oldDraw=drawTileMap,oldSave=saveGame,oldControl=handleControl,oldTrack=trackForScene,oldNext=nextTalk,oldSkip=skipTalk;
  const load=(id,url)=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{art[id]=img;resolve();};img.onerror=()=>reject(Error('Welcome image unavailable: '+url));img.src=url;});
  const scripts=fetch('welcome-story.json?v=306').then(r=>{if(!r.ok)throw Error('Welcome scripts unavailable');return r.json();}).then(v=>{stories=v;for(const s of RECRUIT_SCENES)if(ids.includes(s.recruit)&&s.variant==='welcome')s.title=v[s.recruit].title;return v;});
  scripts.catch(console.error);
  function assets(){return assetsPromise??=Promise.all([scripts,...WelcomeComicPanels.fresh.map(id=>load(id,'assets/hall/comic-306/'+id+'.webp')),...guestIds.flatMap(id=>[load(id,'assets/hall/welcome-304/'+id.toLowerCase()+'.webp'),load('portrait-'+id,BASE+id.toLowerCase()+'-portrait.webp')]),load('revusReaction','assets/hall/welcome-303/revus-chibi.webp'),load('revusRig','assets/hall/welcome-304/revus-rig.webp'),load('hallCook','assets/hall/living-256/torren-kitchen.webp'),...['register','badge','bandages','ribbon','ledger','stew','blanket','provisions',0,1,2].map(id=>load(id,BASE+(Number.isInteger(id)?'chibi-'+id:id)+'.webp'))]);}
  const HALL_SIZES={Verseborn:36,Mira:36,Torren:32,Seerin:42,Kael:40,Sparky:30,Marli:38,Glimmer:36,Revus:40,Nyx:30,Rava:30,Jory:30};
  const SHOTS={Mira:{x:320,y:235,w:230},Torren:{x:135,y:81,w:244},Seerin:{x:122,y:170,w:270},Kael:{x:510,y:308,w:230},Sparky:{x:164,y:84,w:240},Glimmer:{x:485,y:77,w:230}};
  const EXTRA={}; // Core family/recruitment casts remain; optional drop-ins are omitted.
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const permitted=(id,roster)=>id==='Verseborn'||id==='Marli'||guestIds.includes(id)||roster.has(id);
  const available=(b,roster)=>{const present=id=>permitted(id,roster)&&scene.actors.some(a=>a.id===id);return(b.requires||[]).every(present)&&!(b.unless||[]).some(present);};
  function actor(id,x,y,size,extra={}){return{id,x,y,size:HALL_SIZES[id]||size||36,pose:0,row:0,alpha:1,...extra};}
  function initial(id){
    if(id==='Glimmer')return[actor('Glimmer',420,188),actor('Verseborn',455,89)];
    if(id==='Mira')return[actor('Revus',355,227),actor('Mira',310,232),actor('Verseborn',270,267)];
    if(id==='Torren')return[actor('Torren',212,88),actor('Verseborn',131,91),actor('Marli',214,88)];
    if(id==='Seerin')return[actor('Seerin',88,180),actor('Rava',48,179,{pose:5}),actor('Nyx',145,180),actor('Jory',120,190),actor('Verseborn',210,190)];
    if(id==='Kael')return[actor('Kael',464,316),actor('Verseborn',510,334)];
    return[actor('Sparky',165,82),actor('Verseborn',126,91),...(scene.full?[actor('Mira',206,92),actor('Seerin',235,76)]:[])];
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
  function currentPos(a){const m=a.motion;if(!m)return a;const t=clamp((scene.clock-m.at)/m.duration,0,1),lengths=m.points.slice(1).map((p,i)=>Math.hypot(p[0]-m.points[i][0],p[1]-m.points[i][1]));let distance=lengths.reduce((v,n)=>v+n,0)*t;for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const from=m.points[i],to=m.points[i+1],f=lengths[i]?Math.min(1,distance/lengths[i]):1,dx=to[0]-from[0],dy=to[1]-from[1];return{...a,x:from[0]+dx*f,y:from[1]+dy*f,walking:t<1,row:Math.abs(dx)>Math.abs(dy)?dx>0?2:3:dy>0?0:1,facing:Math.abs(dx)>Math.abs(dy)?dx>0?2:3:dy>0?0:1,distance:m.length*t};}distance-=lengths[i];}return a;}
  function settleMoves(){for(const a of scene.actors)if(a.motion){const p=currentPos(a);a.x=p.x;a.y=p.y;if(!p.walking)delete a.motion;}}
  function sfx(id,volume=.22){if(!document.hidden)playSfx(id,volume);}
  function setComic(key){if(scene.comic.key===key)return;scene.comic={key,at:scene.clock,serial:scene.comic.serial+1};}
  function event(name){
    const s=scene;s.event=name;s.effectAt=s.clock;const get=id=>s.actors.find(a=>a.id===id);
    switch(name){
      case 'verse-enter':move('Verseborn',s.id==='Seerin'?185:277,s.id==='Seerin'?185:237);break;
      case 'glimmer-arrive':move('Glimmer',438,86);break;
      case 'glimmer-bench':move('Verseborn',440,87);move('Glimmer',464,87);get('Glimmer').labWorking=true;break;
      case 'glimmer-gadget':s.gadgetAt=s.clock;sfx('magic',.12);break;
      case 'father':get('Revus').pose=2;break;
      case 'register':s.prop='register';get('Revus').pose=1;break;
      case 'revus-chibi':setComic('revusReaction');sfx('magic',.18);break;
      case 'revus-composed':setComic(null);get('Revus').pose=0;break;
      case 'revus-leave':get('Revus').pose=5;move('Revus',320,340);break;
      case 'sign':get('Revus').alpha=0;s.prop='register';break;
      case 'mira-door':break;
      case 'torren-enter':s.prop='provisions';move('Torren',116,85);break;
      case 'shelf':s.prop='provisions';sfx('block');break;
      case 'marli-enter':move('Marli',64,88);break;
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
      case 'bowl':s.prop='blanket';setComic('sparky-bowl');break;
      case 'duo-enter':setComic(null);move('Mira',151,91);move('Seerin',201,91);break;
      case 'cute':setComic('sparky-cute');sfx('magic',.23);break;
      case 'freeze':setComic(null);sfx('block',.12);break;
      case 'scold':setComic('sparky-scold');break;
      case 'apology':setComic(null);break;
      case 'strap':s.sparkySniff=true;break;
      case 'choice':setComic(null);s.sparkySniff=false;s.prop='blanket';break;
      case 'settle':break;
      case 'torren-cameo':s.prop='stew';break;
      case 'title':setComic(null);break;
    }
  }
  function portrait(id){return art['portrait-'+id]?.src||portraitSources[id==='Marli'?'Marla':id]||'';}
  function setBeat(index){
    if(!scene)return false;if(index>=scene.beats.length)return finish();settleMoves();scene.index=index;scene.beatAt=scene.clock;
    const b=scene.beats[index];if(b.event)event(b.event);if(Object.prototype.hasOwnProperty.call(b,'panel'))setComic(b.panel);scene.beat=b;
    // The cast is staged once. Dialogue never creates or removes an actor.
    ui.location.textContent=scene.story.location;ui.dialogue.hidden=!b.text;ui.caption.hidden=Boolean(b.text)||Boolean(scene.comic.key);
    ui.caption.querySelector('small').textContent=b.event==='title'?'FLAMEGUARD':scene.story.location;
    ui.caption.querySelector('h2').textContent=b.caption||'';ui.caption.querySelector('p').textContent=b.event==='title'?scene.story.role:'';
    ui.caption.classList.toggle('is-title',b.event==='title');
    ui.speaker.textContent=b.speaker==='Revus'?'Baron Revus Veln':b.offscreen?'Marli · from the bar':b.speaker||'';ui.line.textContent=b.text||'';
    const src=portrait(b.speaker);ui.portrait.hidden=!src;if(src)ui.portrait.src=src;
    ui.auto.textContent=window.CutsceneAutoplay?.enabled?'Autoplay on':'Autoplay off';
    const shot=SHOTS[scene.id];scene.cameraFrom={...scene.camera};scene.cameraTo={...shot,w:shot.w*(b.shot==='close'?.92:1)};
    return true;
  }
  async function start(id,options={},entry=null){
    if(scene||loading||mode==='battle'||mode==='battleResult'||!state.party.includes(id))return false;
    loading=true;const original={mode,menuTab,activePoint,menuHidden:el.menu.classList.contains('hidden'),tabsHidden:document.querySelector('.menu-tabs').classList.contains('hidden'),dialogueHidden:el.dialogue.classList.contains('hidden'),focus:document.activeElement};
    mode='welcomeLoading';heldDirection=null;fieldDestination=null;el.menu.classList.add('hidden');el.dialogue.classList.add('hidden');
    try{
      await assets();const until=performance.now()+15000;while(!emberHallWorld.ready){if(performance.now()>until)throw Error('Hall actors unavailable');await new Promise(r=>setTimeout(r,60));}
      clearTimeout(saveTimer);emberHallWorld.clearNavigation();emberHallWorld.hideAmbientChat();activePoint=null;
      const roster=new Set(state.party),full=id!=='Sparky'||roster.has('Mira')&&roster.has('Seerin'),story=stories[id];
      scene={id,story,full,original,options,entry,roster,background:story.background,index:0,clock:0,last:performance.now(),beatAt:0,event:'establish',effectAt:0,prop:null,comic:{key:null,at:0,serial:0},cutAt:-1000,camera:{...SHOTS[id]},draws:[]};
      scene.actors=initial(id);for(const [extra,[x,y]]of Object.entries(EXTRA[id]||{}))if(roster.has(extra)&&!scene.actors.some(a=>a.id===extra))scene.actors.push(actor(extra,x,y));scene.beats=(full?story.beats:[story.beats[0],...story.shortBeats,story.beats.at(-1)]).filter(b=>available(b,roster));
      mode='welcomeCinematic';overlay.hidden=false;game.classList.add('welcome-cinematic-active');setBeat(0);updateMusic();raf=requestAnimationFrame(frame);return true;
    }catch(error){console.error(error);mode=original.mode;el.menu.classList.toggle('hidden',original.menuHidden);el.dialogue.classList.toggle('hidden',original.dialogueHidden);if(entry)return oldPlay(entry,options);showHudNotice('The welcome scene could not load. It remains in Memories.');return false;}finally{loading=false;}
  }
  function finish(){
    if(!scene)return false;const s=scene;scene=null;cancelAnimationFrame(raf);overlay.hidden=true;game.classList.remove('welcome-cinematic-active');
    const live=!s.options.replay||s.entry?.id.startsWith('ember-hall-start-');
    const o=s.original;mode=live?'walk':o.mode;menuTab=o.menuTab;activePoint=live?null:o.activePoint;el.menu.classList.toggle('hidden',live?true:o.menuHidden);el.dialogue.classList.toggle('hidden',live?true:o.dialogueHidden);document.querySelector('.menu-tabs').classList.toggle('hidden',live?false:o.tabsHidden);
    if(live){const entry=RECRUIT_SCENES.find(e=>e.recruit===s.id&&e.variant==='welcome'),h=loadRecruitSceneHistory();if(entry&&!h.seen.includes(entry.id))h.seen.push(entry.id);if(entry)h.lastByRecruit[s.id]=entry.id;saveRecruitSceneHistory(h);if(s.id==='Sparky'&&s.full)hallBattleProgress().sparkyDuoWelcome=true;saveGame(hallSaveKey());}
    if(mode==='menu')renderMenu();updatePanels();updateMusic();o.focus?.focus?.();
    const duo=live&&s.id!=='Sparky'&&['Mira','Seerin'].includes(s.id)&&['Mira','Seerin','Sparky'].every(id=>state.party.includes(id))&&!hallBattleProgress().sparkyDuoWelcome;
    if(duo)start('Sparky',{after:s.options.after});else s.options.after?.();return true;
  }
  function next(force=false){if(!scene)return false;if(!force&&(scene.clock<(scene.holdUntil||0)||scene.clock-scene.beatAt<(scene.beat.minMs||350)))return false;return setBeat(scene.index+1);}
  function drawActor(a){
    if(a.alpha<=0)return;const p=currentPos(a),now=scene.clock,id=a.id==='Marli'?'Marla':a.id,size=a.size;
    ctx.save();ctx.globalAlpha=a.alpha;const walking=Boolean(p.walking),frame=walking?Math.floor((p.distance||0)/2.5)%8:0;
    ctx.fillStyle='#0a05084a';ctx.beginPath();ctx.ellipse(p.x,p.y-1,size*.15,size*.05,0,0,Math.PI*2);ctx.fill();
    let source;
    if(guestIds.includes(a.id)){
      const walk=walking&&a.id==='Revus',image=art[a.id],cols=3,cell=100,index=a.pose===0&&scene.beat.speaker===a.id?1:a.pose;
      if(walk)RevusHallWalk.draw(ctx,art.revusRig,p.x,p.y,size,p.distance,a.motion.toX<a.motion.x?-1:1);else{ctx.save();ctx.translate(p.x,p.y);if(a.id==='Revus')ctx.scale(-1,1);ctx.drawImage(image,index%cols*cell,Math.floor(index/cols)*cell,cell,cell,-size/2,-size*.96,size,size);ctx.restore();}source=walk?'hall/welcome-304/revus-rig.webp':'hall/welcome-304/'+a.id.toLowerCase()+'.webp';
    }else if(id==='Verseborn'){
      emberHallWorld.drawActor({...p,id,size,poseFrame:walking?frame:8},walking?p.facing:(scene.id==='Mira'||scene.id==='Seerin'?2:3),0,{x:0,y:0});source='hall/verseborn-walk-v2.webp';
    }else if(id==='Kael'&&walking){
      emberHallWorld.drawActor({...p,id,size,visiting:true,walking:true,facing:p.facing,walkPhase:(p.distance||0)/2.5},0,0,{x:0,y:0});source='hall/kael-walk-v237.webp';
    }else if(walking){
      const image=emberHallWorld.images[id],cell=image.width/8,renderSize=id==='Glimmer'?size*.65:size;ctx.drawImage(image,frame*cell,p.row*cell,cell,cell,p.x-renderSize/2,p.y-renderSize*.94,renderSize,renderSize);source='hall/'+id.toLowerCase()+'-clean-v3.webp';
    }else if(id==='Torren'&&!a.cooking&&!a.ambientResident){
      // Hall's cooking idle includes a pot. Visitors use the existing unarmed
      // Hall walk art in its quietest passing pose instead.
      const image=emberHallWorld.images.Torren,cell=image.width/8;ctx.drawImage(image,2*cell,0,cell,cell,p.x-size/2,p.y-size*.94,size,size);source='hall/torren-clean-v3.webp';
    }else if(id==='Torren'&&(a.cooking||a.ambientResident)){

      const image=art.hallCook,cell=image.width/4,index=[0,1,2,1][Math.floor(now/340)%4];ctx.drawImage(image,index*cell,0,cell,cell,p.x-size/2,p.y-size*.94,size,size);source='hall/living-256/torren-kitchen.webp';
    }else{
      const index=id==='Marla'?scene.beat.speaker==='Marli'?12:emberHallWorld.marlaIdleFrame(now):a.practice?[0,1,2,3,5,6,7,8,9,10,11,12,13,14,15,0][Math.floor(now/180)%16]:id==='Kael'?Math.floor(now/350)%16:id==='Mira'&&scene.beat.speaker==='Mira'?Math.floor((now-scene.beatAt)/180)%16:0;
      emberHallWorld.drawActor({...p,id,size,kitchenActive:false,labActive:id==='Glimmer',labClock:now,labRow:2,labLift:0},4,index,{x:0,y:0});source='hall/'+id.toLowerCase()+'-action-'+(id==='Kael'?'v9':'v8')+'.webp';
    }
    scene.draws.push({id:a.id,source,frame,walking,row:p.row,x:p.x,y:p.y,size});ctx.restore();
  }
  function drawHall(){
    const world=emberHallWorld,now=scene.clock;scene.draws=[];ctx.drawImage(world.hallBackground(),0,0,640,356);
    const machine=world.resonance;if(window.HallOpening&&stageSelectorImage)HallOpening.drawMachine(ctx,stageSelectorImage,machine.x,machine.y,machine.width,machine.height,now);
    const names=new Set(scene.actors.map(a=>a.id==='Marli'?'Marla':a.id));
    const residents=world.residents().filter(a=>!a.barStool&&!names.has(a.id)).map(a=>({...a,ambientResident:true,id:a.id==='Marla'?'Marli':a.id}));
    const things=[...scene.actors,...residents,...world.foregroundProps.map(prop=>({y:prop.depth,prop}))].sort((a,b)=>(a.prop?a.y:currentPos(a).y)-(b.prop?b.y:currentPos(b).y));
    world.drawCinematicFixtures(now);
    for(const a of things){if(a.prop)world.drawCinematicForeground(a.prop);else drawActor(a);}
  }
  function imageAt(id,x,y,w,alpha=1){const image=art[id];if(!image)return;ctx.save();ctx.globalAlpha=alpha;const h=w*image.height/image.width;ctx.drawImage(image,x-w/2,y-h,w,h);ctx.restore();}
  function paint(){
    if(!scene)return;const s=scene,age=s.clock-s.beatAt,safe=LOGICAL_HEIGHT*.80,blend=ease(age/1100),from=s.cameraFrom||s.camera,to=s.cameraTo||s.camera;
    s.camera={x:from.x+(to.x-from.x)*blend,y:from.y+(to.y-from.y)*blend,w:from.w+(to.w-from.w)*blend};
    const camera=s.camera,scale=LOGICAL_WIDTH/camera.w,viewH=safe/scale,left=clamp(camera.x-camera.w/2,0,640-camera.w),top=clamp(camera.y-viewH/2,0,356-viewH);
    ctx.save();ctx.fillStyle='#100b13';ctx.fillRect(0,0,LOGICAL_WIDTH,LOGICAL_HEIGHT);ctx.beginPath();ctx.rect(0,0,LOGICAL_WIDTH,safe);ctx.clip();ctx.scale(scale,scale);ctx.translate(-left,-top);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';drawHall();
    ctx.restore();
    if(s.comic.key){const page=WelcomeComicPanels.pages[s.comic.key];WelcomeComicPanels.draw(ctx,s.comic.key,art[page.asset],s.clock-s.comic.at,LOGICAL_WIDTH,safe);}
    ctx.save();const shade=ctx.createLinearGradient(0,0,0,safe);shade.addColorStop(0,'#07030a65');shade.addColorStop(.25,'#07030a00');shade.addColorStop(.82,'#07030a00');shade.addColorStop(1,'#07030a65');ctx.fillStyle=shade;ctx.fillRect(0,0,LOGICAL_WIDTH,safe);if(s.beat.event==='title'){ctx.fillStyle='#08050d77';ctx.fillRect(0,0,LOGICAL_WIDTH,safe);}if(s.clock-s.cutAt<600){ctx.fillStyle=`rgba(10,5,15,${1-(s.clock-s.cutAt)/600})`;ctx.fillRect(0,0,LOGICAL_WIDTH,safe);}ctx.restore();
  }
  function frame(now){if(!scene)return;scene.clock+=document.hidden?0:clamp(now-scene.last,0,80);scene.last=now;const b=scene.beat,delay=b.text?window.CutsceneAutoplay?.delay(b.text,b.minMs)||4500:b.minMs||2500;if(!scene.previewing&&(!b.text||window.CutsceneAutoplay?.enabled)&&scene.clock-scene.beatAt>=delay&&scene.clock>=(scene.holdUntil||0))next(true);if(scene)raf=requestAnimationFrame(frame);}
  ui.skip.onclick=finish;ui.next.onclick=()=>next();ui.auto.onclick=()=>{window.CutsceneAutoplay?.set(!CutsceneAutoplay.enabled);ui.auto.textContent=CutsceneAutoplay.enabled?'Autoplay on':'Autoplay off';};
  overlay.addEventListener('click',e=>{if(!e.target.closest('button'))next();});
  document.addEventListener('keydown',e=>{if(!scene&&!loading)return;if(e.ctrlKey||e.altKey||e.metaKey||e.key==='F11')return;if(['Escape','Enter',' ','ArrowRight','ArrowLeft','ArrowUp','ArrowDown','e','E','z','Z','w','a','s','d'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();if(e.repeat||loading)return;const button=e.target.closest?.('.welcome-film button');if(button&&['Enter',' '].includes(e.key)){button.click();return;}e.key==='Escape'?finish():['Enter',' ','ArrowRight','e','E','z','Z'].includes(e.key)&&next();}},true);
  drawTileMap=function(...args){return scene?paint():oldDraw(...args);};
  saveGame=function(...args){return scene||loading?false:oldSave(...args);};
  trackForScene=function(...args){return scene?'cutscene':oldTrack(...args);};
  handleControl=function(control){if(scene||loading){if(!loading){if(control==='confirm')next();else if(control==='cancel')finish();else if(['music','fullscreen'].includes(control))oldControl(control);}return;}return oldControl(control);};
  nextTalk=function(...args){if(scene)return next();const r=oldNext(...args);if(el.speaker.textContent==='Marla')el.speaker.textContent='Marli';for(const name of [el.portraitLeftName,el.portraitRightName])if(name?.textContent==='Marla')name.textContent='Marli';return r;};
  skipTalk=function(...args){return scene?finish():oldSkip(...args);};
  playRecruitScene=function(entry,options={}){return ids.includes(entry?.recruit)&&(entry.variant==='welcome'||entry.id.startsWith('ember-hall-start-'))?start(entry.recruit,options,entry):oldPlay(entry,options);};
  window.FlameguardWelcomes={ready:scripts,start,next,finish,get active(){return Boolean(scene)||loading;},get current(){return scene?{id:scene.id,index:scene.index,full:scene.full,cast:scene.actors.map(a=>a.id),beat:scene.beat,length:scene.beats.length,draws:scene.draws,background:'ember-hall',comic:{...scene.comic},holdUntil:scene.holdUntil,clock:scene.clock}:null;},preview(index){if(!scene)return false;scene.previewing=true;const id=scene.id;scene.actors=initial(id);for(const [extra,[x,y]]of Object.entries(EXTRA[id]||{}))if(scene.roster.has(extra)&&!scene.actors.some(a=>a.id===extra))scene.actors.push(actor(extra,x,y));scene.prop=null;scene.comic={key:null,at:0,serial:0};scene.event='establish';scene.background=scene.story.background;for(let i=0;i<=index&&i<scene.beats.length;i++){setBeat(i);scene.clock=Math.max(scene.clock+Math.max(scene.beat.minMs||0,2000),scene.holdUntil||0);settleMoves();}paint();return true;}};
})();
